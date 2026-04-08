from urllib.parse import urlencode, urlparse, parse_qsl, urlunparse

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from typing import Annotated, Any, Optional

from app.dependencies import get_current_user, get_supabase
from fastapi.responses import RedirectResponse
from app.schemas.clinic import ClinicResponse, ClinicUpdateRequest
from app.services.email_service import send_test_notification_email
from app.services.excel_workbooks import (
    build_microsoft_connect_url,
    create_connected_workbook_for_clinic,
    exchange_microsoft_connect_code,
    microsoft_excel_quick_connect_available,
    sign_microsoft_connect_state,
    verify_microsoft_connect_state,
)
from app.services.google_sheets import (
    build_google_connect_url,
    create_connected_sheet_for_clinic,
    exchange_google_connect_code,
    google_quick_connect_available,
    sign_google_connect_state,
    verify_google_connect_state,
)
from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/clinics", tags=["clinics"])

CLINIC_NOT_FOUND = "Clinic not found."


class ClinicBrandingResponse(BaseModel):
    name: str
    assistant_name: Optional[str] = None
    primary_color: Optional[str] = "#0d9488"
    is_live: Optional[bool] = False
    phone: Optional[str] = ""
    business_hours: Optional[Any] = None


@router.get("/{slug}/branding", response_model=ClinicBrandingResponse, responses={404: {"description": "Clinic not found"}})
async def get_clinic_branding(slug: str):
    """Public endpoint to get clinic branding for the chat widget."""
    db = get_supabase()
    result = (
        db.table("clinics")
        .select("name, assistant_name, primary_color, is_live, phone, business_hours")
        .eq("slug", slug)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail=CLINIC_NOT_FOUND)
    row = result.data[0]
    hours = row.get("business_hours")
    if hours is not None and not isinstance(hours, dict):
        hours = None
    return ClinicBrandingResponse(
        name=row.get("name", ""),
        assistant_name=row.get("assistant_name"),
        primary_color=row.get("primary_color") or "#0d9488",
        is_live=row.get("is_live", False),
        phone=row.get("phone") or "",
        business_hours=hours,
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


class GoogleSheetsConnectRequest(BaseModel):
    return_to: Optional[str] = "/dashboard/settings?section=google-sheets"
    tab_name: Optional[str] = "Leads"
    availability_enabled: bool = False
    availability_tab: Optional[str] = "Availability"


class GoogleSheetsConnectResponse(BaseModel):
    available: bool
    authorization_url: str = ""
    detail: str = ""


class MicrosoftExcelConnectRequest(BaseModel):
    return_to: Optional[str] = "/dashboard/settings?section=google-sheets"
    tab_name: Optional[str] = "Leads"
    availability_enabled: bool = False
    availability_tab: Optional[str] = "Availability"


class MicrosoftExcelConnectResponse(BaseModel):
    available: bool
    authorization_url: str = ""
    detail: str = ""


def _append_query_params(url: str, **params: str) -> str:
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query.update({key: value for key, value in params.items() if value})
    return urlunparse(parsed._replace(query=urlencode(query)))


def _frontend_redirect_base(request: Request) -> str:
    settings = get_settings()
    frontend_url = (settings.frontend_app_url or "").strip()
    if frontend_url:
        return frontend_url.rstrip("/")

    request_url = str(request.url)
    parsed = urlparse(request_url)
    return f"{parsed.scheme}://{parsed.netloc}"


def _google_callback_url(request: Request) -> str:
    settings = get_settings()
    parsed = urlparse(str(request.url))
    api_base = f"{parsed.scheme}://{parsed.netloc}"
    if settings.frontend_app_url:
        forwarded_proto = request.headers.get("x-forwarded-proto") or parsed.scheme
        forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host") or parsed.netloc
        api_base = f"{forwarded_proto}://{forwarded_host}"
    return f"{api_base}/api/clinics/google-sheets/callback"


def _microsoft_callback_url(request: Request) -> str:
    settings = get_settings()
    parsed = urlparse(str(request.url))
    api_base = f"{parsed.scheme}://{parsed.netloc}"
    if settings.frontend_app_url:
        forwarded_proto = request.headers.get("x-forwarded-proto") or parsed.scheme
        forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host") or parsed.netloc
        api_base = f"{forwarded_proto}://{forwarded_host}"
    return f"{api_base}/api/clinics/microsoft-excel/callback"


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
            detail="Spreadsheet sync is not available on the current plan.",
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


@router.post("/me/google-sheets/connect", response_model=GoogleSheetsConnectResponse)
async def start_google_sheets_connect(
    req: GoogleSheetsConnectRequest,
    request: Request,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    from app.services.pricing import has_feature

    clinic = current_user.get("clinics", {})
    if not clinic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=CLINIC_NOT_FOUND)

    plan_id = clinic.get("plan", "trial")
    if not has_feature(plan_id, "google_sheets"):
        return GoogleSheetsConnectResponse(
            available=False,
            detail="Spreadsheet quick connect is not available on the current plan.",
        )

    if not google_quick_connect_available():
        return GoogleSheetsConnectResponse(
            available=False,
            detail="Google Sheets quick connect is not configured on the server yet.",
        )

    state = sign_google_connect_state(
        {
            "clinic_id": clinic["id"],
            "user_id": current_user["id"],
            "return_to": req.return_to or "/dashboard/settings?section=google-sheets",
            "tab_name": req.tab_name or "Leads",
            "availability_enabled": req.availability_enabled,
            "availability_tab": req.availability_tab or "Availability",
        }
    )
    callback_url = _google_callback_url(request)
    authorization_url = build_google_connect_url(callback_url, state)
    return GoogleSheetsConnectResponse(
        available=True,
        authorization_url=authorization_url,
        detail="Google quick connect is ready.",
    )


@router.get("/google-sheets/callback")
async def complete_google_sheets_connect(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
):
    frontend_base = _frontend_redirect_base(request)

    if error or error_description:
        target = _append_query_params(
            f"{frontend_base}/dashboard/settings?section=google-sheets",
            google_sheets_error=error_description or error or "Google connection failed.",
        )
        return RedirectResponse(target, status_code=status.HTTP_302_FOUND)

    if not code or not state:
        target = _append_query_params(
            f"{frontend_base}/dashboard/settings?section=google-sheets",
            google_sheets_error="Missing Google authorization code. Please try again.",
        )
        return RedirectResponse(target, status_code=status.HTTP_302_FOUND)

    try:
        payload = verify_google_connect_state(state)
        token_payload = await exchange_google_connect_code(code, _google_callback_url(request))
        access_token = str(token_payload.get("access_token") or "").strip()
        if not access_token:
            raise RuntimeError("Google did not return an access token.")

        db = get_supabase()
        clinic_result = db.table("clinics").select("id, name").eq("id", payload["clinic_id"]).single().execute()
        clinic = clinic_result.data or {}
        if not clinic:
            raise RuntimeError("Clinic not found for Google Sheets connection.")

        created = create_connected_sheet_for_clinic(
            access_token=access_token,
            clinic_name=clinic.get("name") or "Clinic AI",
            lead_tab_name=str(payload.get("tab_name") or "Leads"),
            availability_enabled=bool(payload.get("availability_enabled")),
            availability_tab_name=str(payload.get("availability_tab") or "Availability"),
        )

        db.table("clinics").update(
            {
                "spreadsheet_provider": "google",
                "google_sheet_id": created["sheet_id"],
                "google_sheet_tab": created["lead_tab_name"],
                "excel_workbook_id": "",
                "excel_workbook_name": "",
                "excel_workbook_url": "",
                "microsoft_excel_refresh_token": "",
                "availability_enabled": bool(payload.get("availability_enabled")),
                "availability_sheet_tab": created["availability_tab_name"],
            }
        ).eq("id", payload["clinic_id"]).execute()

        return_to = str(payload.get("return_to") or "/dashboard/settings?section=google-sheets")
        target = _append_query_params(
            f"{frontend_base}{return_to}",
            google_sheets_connected="1",
            google_sheet_id=created["sheet_id"],
        )
        return RedirectResponse(target, status_code=status.HTTP_302_FOUND)
    except Exception as exc:
        logger.error(f"Google Sheets quick connect failed: {exc}")
        target = _append_query_params(
            f"{frontend_base}/dashboard/settings?section=google-sheets",
            google_sheets_error=str(exc),
        )
        return RedirectResponse(target, status_code=status.HTTP_302_FOUND)


@router.post("/me/microsoft-excel/connect", response_model=MicrosoftExcelConnectResponse)
async def start_microsoft_excel_connect(
    req: MicrosoftExcelConnectRequest,
    request: Request,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    from app.services.pricing import has_feature

    clinic = current_user.get("clinics", {})
    if not clinic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=CLINIC_NOT_FOUND)

    plan_id = clinic.get("plan", "trial")
    if not has_feature(plan_id, "google_sheets"):
        return MicrosoftExcelConnectResponse(
            available=False,
            detail="Spreadsheet quick connect is not available on the current plan.",
        )

    if not microsoft_excel_quick_connect_available():
        return MicrosoftExcelConnectResponse(
            available=False,
            detail="Microsoft Excel quick connect is not configured on the server yet.",
        )

    state = sign_microsoft_connect_state(
        {
            "clinic_id": clinic["id"],
            "user_id": current_user["id"],
            "return_to": req.return_to or "/dashboard/settings?section=google-sheets",
            "tab_name": req.tab_name or "Leads",
            "availability_enabled": req.availability_enabled,
            "availability_tab": req.availability_tab or "Availability",
        }
    )
    authorization_url = build_microsoft_connect_url(_microsoft_callback_url(request), state)
    return MicrosoftExcelConnectResponse(
        available=True,
        authorization_url=authorization_url,
        detail="Microsoft Excel quick connect is ready.",
    )


@router.get("/microsoft-excel/callback")
async def complete_microsoft_excel_connect(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
):
    frontend_base = _frontend_redirect_base(request)

    if error or error_description:
        target = _append_query_params(
            f"{frontend_base}/dashboard/settings?section=google-sheets",
            excel_connect_error=error_description or error or "Microsoft connection failed.",
        )
        return RedirectResponse(target, status_code=status.HTTP_302_FOUND)

    if not code or not state:
        target = _append_query_params(
            f"{frontend_base}/dashboard/settings?section=google-sheets",
            excel_connect_error="Missing Microsoft authorization code. Please try again.",
        )
        return RedirectResponse(target, status_code=status.HTTP_302_FOUND)

    try:
        payload = verify_microsoft_connect_state(state)
        token_payload = await exchange_microsoft_connect_code(code, _microsoft_callback_url(request))
        access_token = str(token_payload.get("access_token") or "").strip()
        refresh_token = str(token_payload.get("refresh_token") or "").strip()
        if not access_token or not refresh_token:
            raise RuntimeError("Microsoft did not return the required tokens.")

        db = get_supabase()
        clinic_result = db.table("clinics").select("id, name").eq("id", payload["clinic_id"]).single().execute()
        clinic = clinic_result.data or {}
        if not clinic:
            raise RuntimeError("Clinic not found for Microsoft Excel connection.")

        created = await create_connected_workbook_for_clinic(
            access_token=access_token,
            clinic_name=clinic.get("name") or "Clinic AI",
            lead_tab_name=str(payload.get("tab_name") or "Leads"),
            availability_enabled=bool(payload.get("availability_enabled")),
            availability_tab_name=str(payload.get("availability_tab") or "Availability"),
        )

        db.table("clinics").update(
            {
                "spreadsheet_provider": "excel",
                "google_sheet_id": "",
                "excel_workbook_id": created["workbook_id"],
                "excel_workbook_name": created["workbook_name"],
                "excel_workbook_url": created["workbook_url"],
                "microsoft_excel_refresh_token": refresh_token,
                "google_sheet_tab": created["lead_tab_name"],
                "availability_enabled": bool(payload.get("availability_enabled")),
                "availability_sheet_tab": created["availability_tab_name"],
            }
        ).eq("id", payload["clinic_id"]).execute()

        return_to = str(payload.get("return_to") or "/dashboard/settings?section=google-sheets")
        target = _append_query_params(
            f"{frontend_base}{return_to}",
            excel_connected="1",
            excel_workbook_id=created["workbook_id"],
        )
        return RedirectResponse(target, status_code=status.HTTP_302_FOUND)
    except Exception as exc:
        logger.error(f"Microsoft Excel quick connect failed: {exc}")
        target = _append_query_params(
            f"{frontend_base}/dashboard/settings?section=google-sheets",
            excel_connect_error=str(exc),
        )
        return RedirectResponse(target, status_code=status.HTTP_302_FOUND)
