from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Annotated, Optional

from app.dependencies import get_current_user, get_supabase
from app.schemas.clinic import ClinicResponse, ClinicUpdateRequest
from app.services.email_service import send_test_notification_email
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/clinics", tags=["clinics"])

CLINIC_NOT_FOUND = "Clinic not found."


class ClinicBrandingResponse(BaseModel):
    name: str
    assistant_name: Optional[str] = None
    primary_color: Optional[str] = "#0d9488"
    is_live: Optional[bool] = False


@router.get("/{slug}/branding", response_model=ClinicBrandingResponse, responses={404: {"description": "Clinic not found"}})
async def get_clinic_branding(slug: str):
    """Public endpoint to get clinic branding for the chat widget."""
    db = get_supabase()
    result = db.table("clinics").select("name, assistant_name, primary_color, is_live").eq("slug", slug).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=CLINIC_NOT_FOUND)
    row = result.data[0]
    return ClinicBrandingResponse(
        name=row.get("name", ""),
        assistant_name=row.get("assistant_name"),
        primary_color=row.get("primary_color") or "#0d9488",
        is_live=row.get("is_live", False),
    )


@router.get("/me", response_model=ClinicResponse)
async def get_my_clinic(current_user: Annotated[dict, Depends(get_current_user)]):
    clinic = current_user.get("clinics")
    if not clinic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=CLINIC_NOT_FOUND,
        )
    return clinic


@router.put("/me", response_model=ClinicResponse)
async def update_my_clinic(
    req: ClinicUpdateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    clinic = current_user.get("clinics")
    if not clinic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=CLINIC_NOT_FOUND,
        )

    user_role = current_user.get("role", "staff")
    if user_role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can update clinic settings.",
        )

    updates = req.model_dump(exclude_none=True)
    if not updates:
        return clinic

    db = get_supabase()
    result = db.table("clinics").update(updates).eq("id", clinic["id"]).execute()

    logger.info(f"Clinic {clinic['id']} settings updated: {list(updates.keys())}")
    return result.data[0]


class TestNotificationResponse(BaseModel):
    success: bool
    email: Optional[str] = None
    error: Optional[str] = None


@router.post("/me/test-notification", response_model=TestNotificationResponse)
async def test_notification_email(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Send a test notification email to verify email integration."""
    clinic = current_user.get("clinics")
    if not clinic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=CLINIC_NOT_FOUND)
    result = send_test_notification_email(clinic)
    return TestNotificationResponse(**result)


class GoLiveResponse(BaseModel):
    success: bool
    is_live: bool


@router.post("/me/go-live", response_model=GoLiveResponse)
async def go_live(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Activate the clinic — mark it as live."""
    clinic = current_user.get("clinics")
    if not clinic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=CLINIC_NOT_FOUND)

    user_role = current_user.get("role", "staff")
    if user_role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can activate the clinic.",
        )

    db = get_supabase()
    db.table("clinics").update({"is_live": True}).eq("id", clinic["id"]).execute()
    logger.info(f"Clinic {clinic['id']} is now LIVE")
    return GoLiveResponse(success=True, is_live=True)


class SheetsValidateRequest(BaseModel):
    sheet_id: str
    tab_name: Optional[str] = "Sheet1"
    availability_tab: Optional[str] = ""


class SheetsValidateResponse(BaseModel):
    connected: bool
    sheet_title: Optional[str] = None
    tab_found: bool = False
    availability_tab_found: bool = False
    availability_headers_ok: bool = False
    row_count: Optional[int] = None
    error: Optional[str] = None


@router.post("/me/validate-sheets", response_model=SheetsValidateResponse)
async def validate_google_sheets(
    req: SheetsValidateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Test connectivity to a Google Sheet and validate tab structure."""
    from app.services.pricing import has_feature
    clinic = current_user.get("clinics", {})
    plan_id = clinic.get("plan", "trial")
    if not has_feature(plan_id, "google_sheets"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Google Sheets integration requires a Professional or Premium plan.",
        )

    from app.services.google_sheets import get_gspread_client, extract_spreadsheet_id

    client = get_gspread_client()
    if not client:
        return SheetsValidateResponse(
            connected=False,
            error="Google Sheets integration is not configured on the server.",
        )

    try:
        extracted_id = extract_spreadsheet_id(req.sheet_id)
        spreadsheet = client.open_by_key(extracted_id)
    except Exception as e:
        return SheetsValidateResponse(
            connected=False,
            error=f"Cannot access spreadsheet. Make sure it is shared with the service account. Error: {str(e)[:200]}",
        )

    result = SheetsValidateResponse(
        connected=True,
        sheet_title=spreadsheet.title,
    )

    # Check leads tab
    try:
        ws = spreadsheet.worksheet(req.tab_name or "Sheet1")
        result.tab_found = True
        result.row_count = ws.row_count
    except Exception:
        result.tab_found = False

    # Check availability tab
    if req.availability_tab:
        try:
            av_ws = spreadsheet.worksheet(req.availability_tab)
            result.availability_tab_found = True
            headers = av_ws.row_values(1)
            required = {"date", "time", "status"}
            found = {h.strip().lower() for h in headers}
            result.availability_headers_ok = required.issubset(found)
        except Exception:
            result.availability_tab_found = False

    return result
