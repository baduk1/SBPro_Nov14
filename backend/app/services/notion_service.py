"""
Notion API Integration Service
Handles OAuth, page creation, database creation, and BoQ data export

Author: SkyBuild Pro
Created: November 13, 2025
"""

import requests
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.core.config import settings
from app.models.boq_item import BoqItem
from app.models.job import Job


class NotionAPIError(Exception):
    """Custom exception for Notion API errors"""
    pass


class NotionService:
    """
    Service for Notion API operations

    Implements:
    - OAuth 2.0 flow
    - Page creation
    - Database (table) creation
    - Content block generation
    """

    BASE_URL = "https://api.notion.com/v1"
    NOTION_VERSION = "2022-06-28"

    def __init__(self, access_token: str):
        """
        Initialize Notion service with access token

        Args:
            access_token: OAuth access token for Notion API
        """
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Notion-Version": self.NOTION_VERSION
        }

    # ==================== OAuth ====================

    @staticmethod
    def exchange_code_for_token(code: str) -> Dict[str, Any]:
        """
        Exchange OAuth authorization code for access token

        Args:
            code: Authorization code from Notion OAuth callback

        Returns:
            Dict containing:
            - access_token: OAuth access token
            - workspace_name: Notion workspace name
            - workspace_id: Notion workspace ID
            - bot_id: Notion bot user ID

        Raises:
            NotionAPIError: If OAuth exchange fails
        """
        url = "https://api.notion.com/v1/oauth/token"

        if not settings.NOTION_CLIENT_ID or not settings.NOTION_CLIENT_SECRET:
            raise NotionAPIError("Notion OAuth credentials not configured in settings")

        auth = (settings.NOTION_CLIENT_ID, settings.NOTION_CLIENT_SECRET)

        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.NOTION_REDIRECT_URI
        }

        try:
            response = requests.post(url, auth=auth, json=data, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise NotionAPIError(f"OAuth token exchange failed: {str(e)}")

    # ==================== Page Creation ====================

    def create_boq_export_page(
        self,
        project_name: str,
        job: Job,
        boq_items: List[BoqItem],
        parent_page_id: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Create a complete Notion page with BoQ data

        Args:
            project_name: Name of the project
            job: Job object containing metadata
            boq_items: List of BoQ items to export
            parent_page_id: Optional parent page ID to nest under

        Returns:
            Dict with:
            - page_id: Created Notion page ID
            - page_url: URL to view the page
            - items_exported: Number of items exported

        Raises:
            NotionAPIError: If page creation fails
        """

        try:
            # Step 1: Create main page
            page_data = self._build_page_data(project_name, parent_page_id)
            page = self._create_page(page_data)
            page_id = page["id"]

            # Step 2: Add project summary
            self._add_project_summary_block(page_id, job)

            # Step 3: Create BoQ database
            self._create_boq_database(page_id, boq_items)

            # Step 4: Add cost summary
            self._add_cost_summary_block(page_id, boq_items)

            # Step 5: Add download links
            self._add_download_links_block(page_id, job.id)

            return {
                "page_id": page_id,
                "page_url": page.get("url", f"https://notion.so/{page_id}"),
                "items_exported": len(boq_items)
            }

        except Exception as e:
            raise NotionAPIError(f"Failed to create Notion page: {str(e)}")

    def _build_page_data(self, project_name: str, parent_page_id: Optional[str]) -> Dict:
        """Build page creation request data"""

        return {
            "parent": {
                "type": "page_id",
                "page_id": parent_page_id
            } if parent_page_id else {
                "type": "workspace",
                "workspace": True
            },
            "properties": {
                "title": {
                    "title": [
                        {
                            "text": {
                                "content": f"📊 {project_name} - BoQ Export"
                            }
                        }
                    ]
                }
            },
            "icon": {
                "type": "emoji",
                "emoji": "📊"
            }
        }

    def _create_page(self, page_data: Dict) -> Dict:
        """Create a page in Notion workspace"""
        url = f"{self.BASE_URL}/pages"

        try:
            response = requests.post(url, headers=self.headers, json=page_data, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise NotionAPIError(f"Failed to create page: {str(e)}")

    def _add_project_summary_block(self, page_id: str, job: Job):
        """Add callout block with project metadata"""

        # Format dates safely
        created_date = job.created_at.strftime('%Y-%m-%d %H:%M') if job.created_at else "N/A"

        callout_block = {
            "type": "callout",
            "callout": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {
                            "content": (
                                f"Project: {job.project.name}\n"
                                f"Status: {job.status}\n"
                                f"Created: {created_date}\n"
                                f"File: {job.file.filename if job.file else 'N/A'}"
                            )
                        }
                    }
                ],
                "icon": {
                    "type": "emoji",
                    "emoji": "📋"
                },
                "color": "blue_background"
            }
        }

        self._append_blocks(page_id, [callout_block])

    def _create_boq_database(self, page_id: str, boq_items: List[BoqItem]):
        """
        Create an inline database with BoQ items

        Note: Due to Notion API limitations, we create a simple table block
        instead of a full database for easier implementation
        """

        # Add heading
        heading_block = {
            "type": "heading_2",
            "heading_2": {
                "rich_text": [
                    {"type": "text", "text": {"content": "📦 Bill of Quantities"}}
                ]
            }
        }
        self._append_blocks(page_id, [heading_block])

        # Create table with headers
        table_rows = [
            # Header row
            self._create_table_row([
                "Code", "Description", "Quantity", "Unit", "Unit Price (£)", "Total (£)"
            ], is_header=True)
        ]

        # Data rows
        for item in boq_items[:50]:  # Limit to 50 items for API performance
            table_rows.append(
                self._create_table_row([
                    item.code or "N/A",
                    item.description or "",
                    f"{item.qty:.2f}" if item.qty else "0",
                    item.unit or "nr",
                    f"{item.unit_price:.2f}" if item.unit_price else "0",
                    f"{item.total_price:.2f}" if item.total_price else "0"
                ])
            )

        table_block = {
            "type": "table",
            "table": {
                "table_width": 6,
                "has_column_header": True,
                "has_row_header": False,
                "children": table_rows
            }
        }

        self._append_blocks(page_id, [table_block])

        # Add note if items were truncated
        if len(boq_items) > 50:
            note_block = {
                "type": "callout",
                "callout": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {
                                "content": f"ℹ️ Showing first 50 items of {len(boq_items)} total. Download full export below."
                            }
                        }
                    ],
                    "icon": {"type": "emoji", "emoji": "ℹ️"},
                    "color": "yellow_background"
                }
            }
            self._append_blocks(page_id, [note_block])

    def _create_table_row(self, cells: List[str], is_header: bool = False) -> Dict:
        """Create a table row block"""
        return {
            "type": "table_row",
            "table_row": {
                "cells": [
                    [{"type": "text", "text": {"content": str(cell)[:2000]}}]  # Limit cell length
                    for cell in cells
                ]
            }
        }

    def _add_cost_summary_block(self, page_id: str, boq_items: List[BoqItem]):
        """Add cost summary section"""

        total_cost = sum(item.total_price or 0 for item in boq_items)
        total_items = len(boq_items)

        heading_block = {
            "type": "heading_2",
            "heading_2": {
                "rich_text": [
                    {"type": "text", "text": {"content": "💰 Cost Summary"}}
                ]
            }
        }

        summary_block = {
            "type": "callout",
            "callout": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {
                            "content": (
                                f"Total Items: {total_items}\n"
                                f"Total Cost: £{total_cost:,.2f}"
                            )
                        }
                    }
                ],
                "icon": {"type": "emoji", "emoji": "💰"},
                "color": "green_background"
            }
        }

        self._append_blocks(page_id, [heading_block, summary_block])

    def _add_download_links_block(self, page_id: str, job_id: str):
        """Add download links section"""

        heading_block = {
            "type": "heading_2",
            "heading_2": {
                "rich_text": [
                    {"type": "text", "text": {"content": "📥 Download Exports"}}
                ]
            }
        }

        base_url = settings.FRONTEND_URL

        paragraph_block = {
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    {"type": "text", "text": {"content": "Download BoQ in other formats:\n"}},
                    {
                        "type": "text",
                        "text": {"content": "CSV", "link": {"url": f"{base_url}/api/v1/export/{job_id}/export?format=csv"}},
                        "annotations": {"bold": True}
                    },
                    {"type": "text", "text": {"content": " | "}},
                    {
                        "type": "text",
                        "text": {"content": "Excel", "link": {"url": f"{base_url}/api/v1/export/{job_id}/export?format=xlsx"}},
                        "annotations": {"bold": True}
                    },
                    {"type": "text", "text": {"content": " | "}},
                    {
                        "type": "text",
                        "text": {"content": "PDF", "link": {"url": f"{base_url}/api/v1/export/{job_id}/export?format=pdf"}},
                        "annotations": {"bold": True}
                    }
                ]
            }
        }

        self._append_blocks(page_id, [heading_block, paragraph_block])

    def _append_blocks(self, page_id: str, blocks: List[Dict]):
        """Append multiple blocks to a page"""
        url = f"{self.BASE_URL}/blocks/{page_id}/children"
        data = {"children": blocks}

        try:
            response = requests.patch(url, headers=self.headers, json=data, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise NotionAPIError(f"Failed to append blocks: {str(e)}")
