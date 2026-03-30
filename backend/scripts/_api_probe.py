#!/usr/bin/env python3
"""Test which Google API operations work with the service account."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))

from app.services.google_sheets import _load_google_credentials_dict, get_settings
from google.oauth2.service_account import Credentials
from google.auth.transport.requests import AuthorizedSession

creds_dict = _load_google_credentials_dict(get_settings())
print(f"project_id: {creds_dict.get('project_id')}")
print(f"client_email: {creds_dict.get('client_email')}")

sheets_scopes = ["https://www.googleapis.com/auth/spreadsheets"]
creds = Credentials.from_service_account_info(creds_dict, scopes=sheets_scopes)
session = AuthorizedSession(creds)

# Test 1: read existing sheet
sid = "1xYX1KvYC8bo4EgGDiSsutgCLV0p9w_x2EI0jOpf-Ry8"
r1 = session.get(
    f"https://sheets.googleapis.com/v4/spreadsheets/{sid}?includeGridData=false",
    timeout=15,
)
print(f"\n1) READ existing sheet: HTTP {r1.status_code}")
if r1.status_code != 200:
    print(r1.text[:400])
else:
    print(f"   title: {r1.json().get('properties',{}).get('title')}")

# Test 2: create new sheet
body = {"properties": {"title": "test_probe"}, "sheets": [{"properties": {"title": "Sheet1"}}]}
r2 = session.post("https://sheets.googleapis.com/v4/spreadsheets", json=body, timeout=15)
print(f"\n2) CREATE new sheet: HTTP {r2.status_code}")
if r2.status_code != 200:
    print(r2.text[:400])
else:
    print(f"   new_id: {r2.json()['spreadsheetId']}")

# Test 3: check if Sheets API is enabled via discovery
r3 = session.get(
    "https://sheets.googleapis.com/v4/spreadsheets/nonexistent",
    timeout=15,
)
print(f"\n3) READ nonexistent sheet: HTTP {r3.status_code}")
print(r3.text[:300])
