from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.main import create_app
from app.rate_limit import rate_limiter


@pytest.fixture(autouse=True)
def clear_rate_limiter() -> None:
    rate_limiter.clear()


@pytest.fixture
def client() -> TestClient:
    app = create_app(scheduler_enabled=False)
    with TestClient(app) as test_client:
        yield test_client
