#!/usr/bin/env python3
"""Create a service-account-owned spreadsheet with Availability tab, 
then update the demo clinic config to point to it."""
import os
import sys
import json

# Ensure backend dir is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.google_sheets import _load_google_credentials_dict, get_settings
from google.oauth2.service_account import Credentials
from google.auth.transport.requests import AuthorizedSession
from app.dependencies import get_supabase

# Use ONLY Sheets scope (Drive API is disabled on this GCP project)
SHEETS_ONLY_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

settings = get_settings()
creds_dict = _load_google_credentials_dict(settings)
creds = Credentials.from_service_account_info(creds_dict, scopes=SHEETS_ONLY_SCOPES)
session = AuthorizedSession(creds)

# Create spreadsheet with Sheets API v4 (does NOT need Drive API)
body = {
    "properties": {"title": "ClinicAI Availability - Auto Created"},
    "sheets": [
        {
            "properties": {"title": "Sheet1"},
            "data": [{
                "startRow": 0, "startColumn": 0,
                "rowData": [
                    {"values": [{"userEnteredValue": {"stringValue": h}}
                                for h in ["ID", "Created At", "Patient Name", "Phone",
                                           "Email", "Reason", "Preferred Time", "Status"]]}
                ]
            }]
        },
        {
            "properties": {"title": "Availability"},
            "data": [{
                "startRow": 0, "startColumn": 0,
                "rowData": [
                    {"values": [{"userEnteredValue": {"stringValue": h}}
                                for h in ["Date", "Time", "Status", "Patient Name", "Lead ID"]]},
                    {"values": [{"userEnteredValue": {"stringValue": v}}
                                for v in ["2026-03-28", "10:00 AM", "available", "", ""]]},
                    {"values": [{"userEnteredValue": {"stringValue": v}}
                                for v in ["2026-03-28", "11:00 AM", "available", "", ""]]},
                    {"values": [{"userEnteredValue": {"stringValue": v}}
                                for v in ["2026-03-28", "2:00 PM", "available", "", ""]]},
                    {"values": [{"userEnteredValue": {"stringValue": v}}
                                for v in ["2026-03-28", "4:00 PM", "available", "", ""]]},
                ]
            }]
        }
    ]
}

print("Creating spreadsheet via Sheets API v4 ...")
r = session.post("https://sheets.googleapis.com/v4/spreadsheets", json=body, timeout=20)
print(f"HTTP {r.status_code}")

if r.status_code != 200:
    print("FAILED:", r.text[:500])
    sys.exit(1)

data = r.json()
new_sheet_id = data["spreadsheetId"]
new_sheet_url = data["spreadsheetUrl"]
print(f"NEW_SHEET_ID={new_sheet_id}")
print(f"NEW_SHEET_URL={new_sheet_url}")

# Verify read-back using sheets-only scoped gspread client
print("\nVerifying availability tab read-back ...")
import gspread
from oauth2client.service_account import ServiceAccountCredentials
sheets_creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, SHEETS_ONLY_SCOPES)
client = gspread.authorize(sheets_creds)
ss = client.open_by_key(new_sheet_id)
ws = ss.worksheet("Availability")
header = ws.row_values(1)
records = ws.get_all_records()
available = [r for r in records if str(r.get("Status", "")).strip().lower() == "available"]
print(f"  header={header}")
print(f"  total_rows={len(records)}, available={len(available)}")

# Update demo clinic config
print("\nUpdating demo-clinic config in Supabase ...")
db = get_supabase()
clinic = db.table("clinics").select("id,slug,google_sheet_id").eq("slug", "demo-clinic").single().execute()
if not clinic.data:
    print("ERROR: demo-clinic not found!")
    sys.exit(1)

old_sheet = clinic.data.get("google_sheet_id", "")
clinic_id = clinic.data["id"]
print(f"  clinic_id={clinic_id}, old_sheet_id={old_sheet}")

db.table("clinics").update({
    "google_sheet_id": new_sheet_id,
    "google_sheet_tab": "Sheet1",
    "availability_enabled": True,
    "availability_sheet_tab": "Availability",
}).eq("id", clinic_id).execute()

print(f"  demo-clinic now points to NEW sheet: {new_sheet_id}")
print("\nDone! The service account owns this sheet, so all reads/writes will work.")
