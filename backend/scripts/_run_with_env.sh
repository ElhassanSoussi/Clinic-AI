#!/bin/bash
set -a && source /Users/a1234/Clinic-AI/backend/.env && set +a
exec /Users/a1234/Clinic-AI/backend/venv/bin/python "$@"
