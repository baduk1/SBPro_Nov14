"""
PDF Takeoff using OpenAI GPT-4o Vision API
Extracts text, tables, and BoQ data from architectural drawings

Author: SkyBuild Pro
Created: November 13, 2025
"""

import base64
import json
import io
from typing import List, Dict, Any, Optional
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.job_event import JobEvent


class PDFTakeoffProcessor:
    """
    Process PDF files using OpenAI Vision API to extract:
    - Text from architectural drawings
    - OCR from scanned documents
    - BoQ tables and quantities
    """

    def __init__(self):
        """Initialize OpenAI client with API key from settings"""
        if not settings.OPENAI_ENABLED:
            raise RuntimeError("OpenAI integration is disabled. Set OPENAI_ENABLED=true in .env")

        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY not set in environment variables")

        # Lazy import to avoid dependency error if openai not installed
        try:
            from openai import OpenAI
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.OPENAI_MODEL
        except ImportError:
            raise RuntimeError(
                "OpenAI package not installed. Run: pip install openai>=1.12.0"
            )

        # Check if PyMuPDF is installed for PDF to image conversion
        try:
            import fitz  # PyMuPDF
        except ImportError:
            raise RuntimeError(
                "PyMuPDF not installed. Run: pip install pymupdf"
            )

    def process(self, db: Session, job_id: str, file_path: str) -> List[Dict[str, Any]]:
        """
        Main processing function

        Args:
            db: Database session
            job_id: Job UUID
            file_path: Path to uploaded PDF file

        Returns:
            List of dict objects compatible with BoqItem model:
            [{
                "element_type": str,
                "code": str,
                "description": str,
                "qty": float,
                "unit": str,
                "unit_price": float,
                "total_price": float
            }]
        """

        # Step 1: Convert PDF pages to images
        self._log_event(db, job_id, "pdf_reading", "Converting PDF to images...")
        page_images = self._pdf_to_images(file_path)

        self._log_event(db, job_id, "pdf_conversion", f"Converted PDF to {len(page_images)} images")

        # Step 2: Send to OpenAI for analysis
        self._log_event(db, job_id, "pdf_analysis", "Analyzing PDF with AI (this may take 30-60 seconds)...")
        extracted_data = self._analyze_pdf(page_images)

        # Step 3: Parse response into BoqItem-compatible format
        self._log_event(db, job_id, "boq_generation", "Generating BoQ items...")
        boq_items = self._parse_to_boq_format(extracted_data)

        self._log_event(
            db, job_id, "completed",
            f"Successfully extracted {len(boq_items)} items from PDF"
        )

        return boq_items

    def _pdf_to_images(self, file_path: str) -> List[str]:
        """
        Convert PDF pages to base64-encoded PNG images

        Args:
            file_path: Path to PDF file

        Returns:
            List of base64 encoded PNG images (one per page)
        """
        import fitz  # PyMuPDF
        from PIL import Image

        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"PDF file not found: {file_path}")

        images = []

        # Open PDF
        pdf_document = fitz.open(file_path)

        try:
            # Convert each page to image
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]

                # Render page as image (matrix parameter controls resolution)
                # 2.0 = 144 DPI (good quality for AI)
                pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))

                # Convert pixmap to PIL Image
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

                # Convert PIL Image to base64 PNG
                buffer = io.BytesIO()
                img.save(buffer, format="PNG")
                buffer.seek(0)

                img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                images.append(img_base64)

                # Limit to first 10 pages to avoid excessive API costs
                if page_num >= 9:  # 0-indexed, so this stops at page 10
                    break

        finally:
            pdf_document.close()

        if not images:
            raise ValueError("PDF contains no pages or failed to convert")

        return images

    def _analyze_pdf(self, page_images: List[str]) -> Dict[str, Any]:
        """
        Send PDF page images to OpenAI Vision API for analysis

        Args:
            page_images: List of base64 encoded PNG images (one per page)

        Returns:
            Structured data with BoQ items in format:
            {
                "document_type": str,
                "items": [
                    {
                        "code": str,
                        "description": str,
                        "quantity": float,
                        "unit": str
                    }
                ]
            }
        """

        prompt = """
You are analyzing architectural/construction document images for Bill of Quantities (BoQ) extraction.

Extract the following information in JSON format:

{
  "document_type": "architectural_drawing | boq_table | scanned_document | specification",
  "items": [
    {
      "code": "string (e.g., E10/100, A01.001)",
      "description": "string (detailed description of work/material)",
      "quantity": number (numeric value only),
      "unit": "string (e.g., m2, m3, nr, m, kg, ton)"
    }
  ]
}

EXTRACTION RULES:
1. If this is a BoQ table, extract ALL rows with quantities
2. If this is an architectural drawing, extract visible measurements and quantifiable elements
3. If scanned/low quality, use OCR to read text carefully
4. For quantity, convert to numeric value (e.g., "100 m²" → 100)
5. Use standard construction units: m2, m3, nr (number), m, kg, ton, no (number)
6. If no explicit code exists, generate logical codes (e.g., CONC-001, STEEL-001)
7. Be thorough - extract ALL quantifiable items visible across ALL pages
8. For descriptions, include material type, location, and specification details

QUALITY CHECKS:
- Ensure all quantities are positive numbers
- Verify units are construction-standard
- Check descriptions are meaningful and detailed
- Validate codes follow logical numbering

Output ONLY valid JSON, no markdown code blocks, no explanations.
"""

        try:
            # Build content array with prompt + all images
            content = [{"type": "text", "text": prompt}]

            # Add all page images to the request
            for img_base64 in page_images:
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{img_base64}"
                    }
                })

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": content
                    }
                ],
                max_tokens=4096,
                temperature=0  # Deterministic output for consistency
            )

            # Parse JSON response
            content = response.choices[0].message.content

            # Strip markdown code blocks if present
            if content.startswith("```json"):
                content = content.replace("```json", "").replace("```", "").strip()
            elif content.startswith("```"):
                content = content.replace("```", "").strip()

            data = json.loads(content)

            # Validate response structure
            if "items" not in data:
                raise ValueError("OpenAI response missing 'items' field")

            return data

        except json.JSONDecodeError as e:
            raise ValueError(f"OpenAI returned invalid JSON: {e}")
        except Exception as e:
            raise RuntimeError(f"OpenAI API error: {str(e)}")

    def _parse_to_boq_format(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Convert OpenAI response to BoqItem-compatible format

        Args:
            data: Structured data from OpenAI

        Returns:
            List of dictionaries matching BoqItem schema
        """

        items = []
        document_type = data.get("document_type", "pdf_extracted")

        for idx, item_data in enumerate(data.get("items", []), start=1):
            # Extract and validate fields
            code = item_data.get("code", f"PDF-{idx:03d}")
            description = item_data.get("description", "Extracted from PDF")

            # Parse quantity - handle string or numeric input
            try:
                qty_raw = item_data.get("quantity", 0)
                qty = float(qty_raw) if qty_raw else 0.0
            except (ValueError, TypeError):
                qty = 0.0

            unit = item_data.get("unit", "nr")

            # Create BoqItem-compatible dict
            item = {
                "code": str(code),
                "description": str(description),
                "qty": qty,
                "unit": str(unit),
                "source_ref": f"PDF:{document_type}",  # Store document type as source reference
                "unit_price": 0.0,  # Will be filled when prices applied
                "total_price": 0.0
            }

            items.append(item)

        return items

    def _log_event(self, db: Session, job_id: str, stage: str, message: str) -> None:
        """
        Log progress event to database

        Args:
            db: Database session
            job_id: Job UUID
            stage: Event stage (pdf_reading, pdf_analysis, etc.)
            message: Human-readable message
        """
        event = JobEvent(job_id=job_id, stage=stage, message=message)
        db.add(event)
        db.commit()


def run_openai_pdf_takeoff(file_path: str, db: Optional[Session] = None, job_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Convenience function for PDF takeoff processing
    Compatible with existing takeoff engine interfaces

    Args:
        file_path: Path to PDF file
        db: Optional database session for logging
        job_id: Optional job ID for logging

    Returns:
        List of BoQ items in dict format
    """
    processor = PDFTakeoffProcessor()

    if db and job_id:
        return processor.process(db, job_id, file_path)
    else:
        # Standalone mode - no logging
        pdf_base64 = processor._encode_pdf(file_path)
        extracted_data = processor._analyze_pdf(pdf_base64)
        return processor._parse_to_boq_format(extracted_data)
