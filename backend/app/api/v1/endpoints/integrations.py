"""
API endpoints for third-party integrations (Notion, etc.)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.db.session import get_db
from app.models.user import User
from app.models.user_integration import UserIntegration
from app.models.job import Job
from app.models.boq_item import BoqItem
from app.schemas.integrations import (
    NotionConnectionRequest,
    NotionConnectionResponse,
    NotionExportRequest,
    NotionExportResponse,
    IntegrationStatus,
    IntegrationDisconnectResponse
)
from app.services.notion_service import NotionService, NotionAPIError

router = APIRouter()


# ==================== Notion Status ====================

@router.get("/notion/status", response_model=IntegrationStatus)
def get_notion_status(
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """
    Check if user has connected Notion integration

    Returns:
        IntegrationStatus with connection details
    """

    integration = db.query(UserIntegration).filter(
        UserIntegration.user_id == user.id,
        UserIntegration.integration_type == "notion",
        UserIntegration.is_active == True
    ).first()

    if not integration:
        return IntegrationStatus(
            connected=False,
            integration_type="notion",
            workspace_name=None,
            workspace_id=None,
            connected_at=None,
            is_active=False
        )

    return IntegrationStatus(
        connected=True,
        integration_type="notion",
        workspace_name=integration.workspace_name,
        workspace_id=integration.workspace_id,
        connected_at=integration.created_at,
        is_active=integration.is_active
    )


# ==================== Notion Connection ====================

@router.post("/notion/connect", response_model=NotionConnectionResponse)
def connect_notion(
    payload: NotionConnectionRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """
    Complete Notion OAuth connection

    Called after user authorizes in Notion and returns with authorization code.

    Args:
        payload: Contains OAuth authorization code
        user: Current authenticated user
        db: Database session

    Returns:
        NotionConnectionResponse with workspace details

    Raises:
        HTTPException 400: If OAuth exchange fails
    """

    try:
        # Exchange code for access token
        token_data = NotionService.exchange_code_for_token(payload.code)

        # Extract required fields
        access_token = token_data.get("access_token")
        workspace_name = token_data.get("workspace_name")
        workspace_id = token_data.get("workspace_id")
        bot_id = token_data.get("bot_id")

        if not access_token:
            raise HTTPException(
                status_code=400,
                detail="Invalid OAuth response: missing access token"
            )

        # Check if integration already exists
        existing = db.query(UserIntegration).filter(
            UserIntegration.user_id == user.id,
            UserIntegration.integration_type == "notion"
        ).first()

        if existing:
            # Update existing integration
            existing.access_token = access_token
            existing.refresh_token = token_data.get("refresh_token")
            existing.workspace_id = workspace_id
            existing.workspace_name = workspace_name
            existing.bot_id = bot_id
            existing.is_active = True
            integration = existing
        else:
            # Create new integration
            from uuid import uuid4
            integration = UserIntegration(
                id=str(uuid4()),
                user_id=user.id,
                integration_type="notion",
                access_token=access_token,
                refresh_token=token_data.get("refresh_token"),
                workspace_id=workspace_id,
                workspace_name=workspace_name,
                bot_id=bot_id,
                is_active=True
            )
            db.add(integration)

        db.commit()
        db.refresh(integration)

        return NotionConnectionResponse(
            success=True,
            workspace_name=integration.workspace_name or "Unknown Workspace",
            workspace_id=integration.workspace_id or "",
            bot_id=integration.bot_id or "",
            message="Notion connected successfully"
        )

    except NotionAPIError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect Notion: {str(e)}"
        )


# ==================== Notion Disconnect ====================

@router.post("/notion/disconnect", response_model=IntegrationDisconnectResponse)
def disconnect_notion(
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect Notion integration

    Marks the integration as inactive (soft delete)

    Returns:
        IntegrationDisconnectResponse with success status

    Raises:
        HTTPException 404: If Notion not connected
    """

    integration = db.query(UserIntegration).filter(
        UserIntegration.user_id == user.id,
        UserIntegration.integration_type == "notion"
    ).first()

    if not integration:
        raise HTTPException(
            status_code=404,
            detail="Notion integration not found"
        )

    integration.is_active = False
    db.commit()

    return IntegrationDisconnectResponse(
        success=True,
        message="Notion disconnected successfully",
        integration_type="notion"
    )


# ==================== Notion Export ====================

@router.post("/notion/export", response_model=NotionExportResponse)
async def export_to_notion(
    payload: NotionExportRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """
    Export BoQ data to Notion

    Creates a beautiful Notion page with:
    - Project summary
    - BoQ table
    - Cost breakdown
    - Download links

    Args:
        payload: Export request with job_id and options
        user: Current authenticated user
        db: Database session

    Returns:
        NotionExportResponse with page URL and export details

    Raises:
        HTTPException 400: If Notion not connected or validation fails
        HTTPException 404: If job not found
        HTTPException 500: If export fails
    """

    # 1. Check Notion connection
    integration = db.query(UserIntegration).filter(
        UserIntegration.user_id == user.id,
        UserIntegration.integration_type == "notion",
        UserIntegration.is_active == True
    ).first()

    if not integration:
        raise HTTPException(
            status_code=400,
            detail="Notion not connected. Please connect Notion first."
        )

    # 2. Verify job ownership
    job = db.query(Job).filter(
        Job.id == payload.job_id,
        Job.user_id == user.id
    ).first()

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found or access denied"
        )

    # 3. Get BoQ items
    boq_items = db.query(BoqItem).filter(
        BoqItem.job_id == payload.job_id
    ).all()

    if not boq_items:
        raise HTTPException(
            status_code=400,
            detail="No BoQ items found for this job. Please process the takeoff first."
        )

    # 4. Export to Notion
    try:
        notion_service = NotionService(access_token=integration.access_token)

        result = notion_service.create_boq_export_page(
            project_name=job.project.name if job.project else "Untitled Project",
            job=job,
            boq_items=boq_items,
            parent_page_id=payload.parent_page_id
        )

        return NotionExportResponse(
            success=True,
            notion_page_id=result["page_id"],
            notion_page_url=result["page_url"],
            message=f"Successfully exported to Notion",
            items_exported=result["items_exported"]
        )

    except NotionAPIError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Notion export failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during export: {str(e)}"
        )
