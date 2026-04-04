import base64
import hashlib
import hmac
import json
import secrets
import time
from pathlib import Path
from urllib.parse import urlencode

import gspread
from google.oauth2 import credentials as oauth_credentials
from google.oauth2.service_account import Credentials as ServiceAccountCredentials
import httpx
from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Scopes required for reading/writing Sheets.
# NOTE: Drive scope intentionally omitted – the GCP project has the Drive API
# disabled and all runtime operations (read rows, write cells, add tabs) only
# require the Sheets scope.
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
]

GOOGLE_CONNECT_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
]

HEADERS = [
    "ID",
    "Created At",
    "Patient Name",
    "Phone",
    "Email",
    "Reason",
    "Preferred Time",
    "Status"
]

def get_gspread_client() -> gspread.Client | None:
    settings = get_settings()

    creds_dict = _load_google_credentials_dict(settings)
    if not creds_dict:
        logger.warning(
            "Google Sheets client unavailable: set one of "
            "GOOGLE_CREDENTIALS_B64, GOOGLE_CREDENTIALS_JSON, or GOOGLE_CREDENTIALS_PATH"
        )
        return None

    try:
        client_email = creds_dict.get("client_email") or "unknown"
        creds_type = creds_dict.get("type") or "unknown"

        if creds_dict.get("type") == "service_account":
            credentials = ServiceAccountCredentials.from_service_account_info(creds_dict, scopes=SCOPES)
        elif creds_dict.get("type") == "authorized_user" or {
            "refresh_token", "client_id", "client_secret"
        }.issubset(creds_dict.keys()):
            credentials = oauth_credentials.Credentials.from_authorized_user_info(creds_dict, scopes=SCOPES)
        else:
            logger.error(
                "Unsupported Google credentials JSON format. Expected service account "
                "or authorized_user credentials."
            )
            return None

        logger.info(
            "Google Sheets credentials loaded successfully: "
            f"type={creds_type} client_email={client_email} "
            f"source={_credentials_source(settings)}"
        )
        return gspread.authorize(credentials)
    except Exception as e:
        logger.error(f"Failed to initialize Google Sheets client: {e}")
        return None


def get_service_account_email() -> str:
    settings = get_settings()
    creds_dict = _load_google_credentials_dict(settings) or {}
    return str(creds_dict.get("client_email") or "").strip()


def _load_google_credentials_dict(settings) -> dict | None:
    """Load Google credentials from env in priority order."""
    b64_creds = (settings.google_credentials_b64 or "").strip()
    raw_json = (settings.google_credentials_json or "").strip()
    creds_path = (settings.google_credentials_path or "").strip()

    # 1) Base64-encoded service account JSON
    if b64_creds:
        try:
            decoded = base64.b64decode(b64_creds).decode("utf-8")
            return json.loads(decoded)
        except Exception as e:
            logger.error(f"Invalid GOOGLE_CREDENTIALS_B64 value: {e}")
            return None

    # 2) Raw JSON string service account payload
    if raw_json:
        try:
            return json.loads(raw_json)
        except Exception as e:
            logger.error(f"Invalid GOOGLE_CREDENTIALS_JSON value: {e}")
            return None

    # 3) File path to service account JSON
    if creds_path:
        try:
            payload = Path(creds_path).read_text(encoding="utf-8")
            return json.loads(payload)
        except Exception as e:
            logger.error(f"Invalid GOOGLE_CREDENTIALS_PATH value '{creds_path}': {e}")
            return None

    return None


def _credentials_source(settings) -> str:
    if (settings.google_credentials_b64 or "").strip():
        return "GOOGLE_CREDENTIALS_B64"
    if (settings.google_credentials_json or "").strip():
        return "GOOGLE_CREDENTIALS_JSON"
    if (settings.google_credentials_path or "").strip():
        return "GOOGLE_CREDENTIALS_PATH"
    return "none"


def google_quick_connect_available() -> bool:
    settings = get_settings()
    return bool(settings.google_oauth_configured and get_service_account_email())


def build_google_connect_url(
    redirect_uri: str,
    state: str,
) -> str:
    settings = get_settings()
    query = urlencode(
        {
            "client_id": settings.google_oauth_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "access_type": "online",
            "prompt": "consent select_account",
            "scope": " ".join(GOOGLE_CONNECT_SCOPES),
            "state": state,
        }
    )
    return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"


def sign_google_connect_state(payload: dict) -> str:
    settings = get_settings()
    secret = (settings.admin_secret or settings.supabase_service_key).encode("utf-8")
    envelope = {
        **payload,
        "nonce": secrets.token_urlsafe(12),
        "ts": int(time.time()),
    }
    raw = json.dumps(envelope, separators=(",", ":"), sort_keys=True).encode("utf-8")
    signature = hmac.new(secret, raw, hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=") + "." + signature


def verify_google_connect_state(state: str, max_age_seconds: int = 900) -> dict:
    settings = get_settings()
    secret = (settings.admin_secret or settings.supabase_service_key).encode("utf-8")

    try:
        encoded, signature = state.split(".", 1)
        padded = encoded + "=" * (-len(encoded) % 4)
        raw = base64.urlsafe_b64decode(padded.encode("utf-8"))
        expected = hmac.new(secret, raw, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Invalid signature")
        payload = json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise ValueError("Invalid Google connect state") from exc

    ts = int(payload.get("ts") or 0)
    if not ts or time.time() - ts > max_age_seconds:
        raise ValueError("Google connect state expired")

    return payload


async def exchange_google_connect_code(
    code: str,
    redirect_uri: str,
) -> dict:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_oauth_client_id,
                "client_secret": settings.google_oauth_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Accept": "application/json"},
        )

    payload = response.json()
    if response.status_code >= 400:
        detail = payload.get("error_description") or payload.get("error") or "Google token exchange failed"
        raise RuntimeError(detail)

    access_token = str(payload.get("access_token") or "").strip()
    if not access_token:
        raise RuntimeError("Google token exchange did not return an access token")

    return payload


def get_google_connect_client(access_token: str) -> gspread.Client:
    credentials = oauth_credentials.Credentials(
        token=access_token,
        scopes=GOOGLE_CONNECT_SCOPES,
    )
    return gspread.authorize(credentials)


def ensure_sheet_headers(worksheet: gspread.Worksheet) -> None:
    existing_data = worksheet.get_all_values()
    if not existing_data:
        worksheet.append_row(HEADERS)


def ensure_availability_headers(worksheet: gspread.Worksheet) -> None:
    existing_data = worksheet.get_all_values()
    if not existing_data:
        worksheet.append_row(["Date", "Time", "Status", "Patient Name", "Lead ID"])


def create_connected_sheet_for_clinic(
    *,
    access_token: str,
    clinic_name: str,
    lead_tab_name: str,
    availability_enabled: bool,
    availability_tab_name: str,
) -> dict:
    client = get_google_connect_client(access_token)
    spreadsheet = client.create(f"{clinic_name} Leads")
    lead_tab = lead_tab_name.strip() or "Leads"

    try:
        worksheet = spreadsheet.sheet1
        if worksheet.title != lead_tab:
            worksheet.update_title(lead_tab)
    except Exception:
        worksheet = spreadsheet.sheet1

    ensure_sheet_headers(worksheet)

    if availability_enabled:
        try:
            availability = spreadsheet.worksheet(availability_tab_name or "Availability")
        except gspread.WorksheetNotFound:
            availability = spreadsheet.add_worksheet(
                title=availability_tab_name or "Availability",
                rows=200,
                cols=5,
            )
        ensure_availability_headers(availability)

    service_account_email = get_service_account_email()
    if not service_account_email:
        raise RuntimeError("Clinic AI Google service account is not configured on the server")

    spreadsheet.share(service_account_email, perm_type="user", role="writer", notify=False)

    return {
        "sheet_id": spreadsheet.id,
        "sheet_title": spreadsheet.title,
        "sheet_url": f"https://docs.google.com/spreadsheets/d/{spreadsheet.id}/edit",
        "lead_tab_name": lead_tab,
        "availability_tab_name": availability_tab_name or "Availability",
    }

def extract_spreadsheet_id(url_or_id: str) -> str:
    # If it's a full URL, extract the ID
    if "spreadsheets/d/" in url_or_id:
        return url_or_id.split("spreadsheets/d/")[1].split("/")[0]
    return url_or_id.strip()

def append_lead_to_sheet(sheet_id: str, tab_name: str, lead: dict) -> None:
    """Safely append a new lead to the configured Google Sheet."""
    if not sheet_id:
        return
        
    client = get_gspread_client()
    if not client:
        return
        
    try:
        extracted_id = extract_spreadsheet_id(sheet_id)
        spreadsheet = client.open_by_key(extracted_id)
        
        try:
            worksheet = spreadsheet.worksheet(tab_name if tab_name else "Sheet1")
        except gspread.exceptions.WorksheetNotFound:
            # Fallback to first sheet if the specified tab isn't found
            worksheet = spreadsheet.sheet1
        
        # Check if headers exist
        existing_data = worksheet.get_all_values()
        if not existing_data:
            worksheet.append_row(HEADERS)
            
        # Append the new row
        row = [
            lead.get("id", ""),
            lead.get("created_at", ""),
            lead.get("patient_name", ""),
            lead.get("patient_phone", ""),
            lead.get("patient_email", ""),
            lead.get("reason_for_visit", ""),
            lead.get("preferred_datetime_text", ""),
            lead.get("status", "new")
        ]
        worksheet.append_row(row)
        logger.info(f"Successfully synced lead {lead.get('id')} to Google Sheet {extracted_id}")
        
    except Exception as e:
        # We explicitly catch ALL exceptions so we never break the main lead creation flow
        logger.error(f"Google Sheets Sync Failed for lead {lead.get('id')}: {e}")

def update_lead_status_in_sheet(sheet_id: str, tab_name: str, lead_id: str, new_status: str) -> None:
    """Optionally attempt to update the status column for an existing lead."""
    if not sheet_id:
        return
        
    client = get_gspread_client()
    if not client:
        return
        
    try:
        extracted_id = extract_spreadsheet_id(sheet_id)
        spreadsheet = client.open_by_key(extracted_id)
        
        try:
            worksheet = spreadsheet.worksheet(tab_name if tab_name else "Sheet1")
        except gspread.exceptions.WorksheetNotFound:
            worksheet = spreadsheet.sheet1
            
        # Find the row by ID (Column A)
        try:
            cell = worksheet.find(lead_id, in_column=1)
            if cell:
                # Status is column H (index 8) based on HEADERS list
                worksheet.update_cell(cell.row, 8, new_status)
                logger.info(f"Successfully updated lead {lead_id} status to '{new_status}' in Google Sheet")
        except gspread.exceptions.CellNotFound:
            logger.warning(f"Lead {lead_id} not found in Google Sheet for status update")
            
    except Exception as e:
        logger.error(f"Google Sheets Status Update Failed for lead {lead_id}: {e}")

def get_available_slots(sheet_id: str, tab_name: str) -> list:
    """Read available slots from the configured availability sheet."""
    if not sheet_id:
        logger.info("Availability check skipped: missing sheet_id")
        return []
        
    client = get_gspread_client()
    if not client:
        logger.warning("Availability check skipped: Google Sheets client unavailable")
        return []
        
    try:
        extracted_id = extract_spreadsheet_id(sheet_id)
        spreadsheet = client.open_by_key(extracted_id)
        
        try:
            worksheet = spreadsheet.worksheet(tab_name if tab_name else "Availability")
        except gspread.exceptions.WorksheetNotFound:
            logger.warning(f"Availability worksheet '{tab_name}' not found in {sheet_id}")
            return []

        # Validate required headers without crashing chat flow.
        header_row = worksheet.row_values(1)
        required_headers = {"Date", "Time", "Status"}
        if not required_headers.issubset({h.strip() for h in header_row}):
            logger.warning(
                "Availability worksheet missing required headers. "
                f"Found headers={header_row}; required={sorted(required_headers)}"
            )
            return []

        all_rows = worksheet.get_all_records()
        available_slots = []

        # Expected headers: Date, Time, Status (+ optional reservation columns)
        for i, row in enumerate(all_rows):
            status = str(row.get("Status", "")).strip().lower()
            date = str(row.get("Date", "")).strip()
            time = str(row.get("Time", "")).strip()

            if status != "available":
                continue
            if not date or not time:
                logger.warning(
                    "Skipping malformed availability row with missing date/time "
                    f"at sheet row {i + 2}: {row}"
                )
                continue

            available_slots.append(
                {
                    "date": date,
                    "time": time,
                    "row_index": i + 2,  # 1-indexed + header row
                }
            )

        logger.info(
            f"Availability lookup complete: {len(available_slots)} available slots "
            f"from tab '{tab_name if tab_name else 'Availability'}'"
        )
        
        return available_slots

    except PermissionError as e:
        settings = get_settings()
        creds_dict = _load_google_credentials_dict(settings) or {}
        logger.error(
            "Availability read failed with permissions error: "
            f"sheet_id={sheet_id} tab={tab_name if tab_name else 'Availability'} "
            f"client_email={creds_dict.get('client_email')} error={e!r}"
        )
        return []
        
    except Exception as e:
        logger.error(f"Failed to fetch available slots from Google Sheet: {e!r}")
        return []

def reserve_slot_in_sheet(sheet_id: str, tab_name: str, row_index: int, patient_name: str, lead_id: str) -> bool:
    """Update a slot to 'reserved' and attach lead info."""
    if not sheet_id or not row_index:
        return False
        
    client = get_gspread_client()
    if not client:
        return False
        
    try:
        extracted_id = extract_spreadsheet_id(sheet_id)
        spreadsheet = client.open_by_key(extracted_id)
        worksheet = spreadsheet.worksheet(tab_name if tab_name else "Availability")
        
        # Expected Columns: A=Date, B=Time, C=Status, D=Patient Name, E=Lead ID
        # Column 3 is Status
        worksheet.update_cell(row_index, 3, "reserved")
        # Column 4 is Patient Name
        worksheet.update_cell(row_index, 4, patient_name)
        # Column 5 is Lead ID
        worksheet.update_cell(row_index, 5, lead_id)
        
        logger.info(f"Successfully reserved slot at row {row_index} for {patient_name}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to reserve slot in Google Sheet at row {row_index}: {e}")
        return False
