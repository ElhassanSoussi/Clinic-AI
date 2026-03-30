import base64
import json
from pathlib import Path
import gspread
from google.oauth2 import credentials as oauth_credentials
from google.oauth2.service_account import Credentials as ServiceAccountCredentials
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
