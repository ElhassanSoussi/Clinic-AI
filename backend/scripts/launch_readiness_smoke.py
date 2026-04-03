import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen


BACKEND_URL = os.getenv("CLINIC_AI_BACKEND_URL", "http://127.0.0.1:7001/api").rstrip("/")
FRONTEND_URL = os.getenv("CLINIC_AI_FRONTEND_URL", "http://127.0.0.1:1201").rstrip("/")
EMAIL = os.getenv("CLINIC_AI_SMOKE_EMAIL", "")
PASSWORD = os.getenv("CLINIC_AI_SMOKE_PASSWORD", "")


def fetch_json(url: str, *, method: str = "GET", body: dict | None = None, token: str = "") -> tuple[int, object]:
    payload = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(url, data=payload, headers=headers, method=method)
    with urlopen(request) as response:
        raw = response.read().decode("utf-8")
        return response.status, json.loads(raw) if raw else {}


def fetch_status(url: str) -> int:
    with urlopen(url) as response:
        response.read()
        return response.status


def check(name: str, fn) -> tuple[bool, str]:
    try:
        result = fn()
        return True, f"{name}: {result}"
    except HTTPError as exc:
        detail = exc.read().decode("utf-8")
        return False, f"{name}: HTTP {exc.code} {detail}"
    except URLError as exc:
        return False, f"{name}: {exc.reason}"
    except Exception as exc:
        return False, f"{name}: {exc}"


def main() -> int:
    checks: list[tuple[bool, str]] = []

    checks.append(check("Backend health", lambda: fetch_json(urljoin(f"{BACKEND_URL}/", "health"))[0]))
    checks.append(check("Billing plans", lambda: fetch_json(urljoin(f"{BACKEND_URL}/", "billing/plans"))[0]))

    for path in ["/", "/login", "/register", "/dashboard", "/dashboard/operations"]:
        checks.append(check(f"Frontend {path}", lambda path=path: fetch_status(f"{FRONTEND_URL}{path}")))

    token = ""
    if EMAIL and PASSWORD:
        def login() -> str:
            _, body = fetch_json(
                urljoin(f"{BACKEND_URL}/", "auth/login"),
                method="POST",
                body={"email": EMAIL, "password": PASSWORD},
            )
            value = body.get("access_token") or ""
            if not value:
                raise RuntimeError("Login succeeded without an access token.")
            return value

        try:
            token = login()
            checks.append((True, "Auth login: 200"))
            checks.append(check("Clinic profile", lambda: fetch_json(urljoin(f"{BACKEND_URL}/", "clinics/me"), token=token)[0]))
            checks.append(check("Frontdesk analytics", lambda: fetch_json(urljoin(f"{BACKEND_URL}/", "frontdesk/analytics"), token=token)[0]))
            checks.append(check("Operations overview", lambda: fetch_json(urljoin(f"{BACKEND_URL}/", "frontdesk/operations"), token=token)[0]))
            checks.append(check("System readiness", lambda: fetch_json(urljoin(f"{BACKEND_URL}/", "frontdesk/system-readiness"), token=token)[0]))
            checks.append(check("Billing status", lambda: fetch_json(urljoin(f"{BACKEND_URL}/", "billing/status"), token=token)[0]))

            _, readiness = fetch_json(urljoin(f"{BACKEND_URL}/", "frontdesk/system-readiness"), token=token)
            print("\nSystem readiness")
            for item in readiness.get("items", []):
                print(f"- {item.get('label')}: {item.get('status')} — {item.get('summary')}")
        except HTTPError as exc:
            detail = exc.read().decode("utf-8")
            checks.append((False, f"Auth login: HTTP {exc.code} {detail}"))
        except URLError as exc:
            checks.append((False, f"Auth login: {exc.reason}"))
        except Exception as exc:
            checks.append((False, f"Auth login: {exc}"))

    passed = [message for ok, message in checks if ok]
    failed = [message for ok, message in checks if not ok]

    print("\nSmoke check results")
    for message in passed:
        print(f"PASS {message}")
    for message in failed:
        print(f"FAIL {message}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
