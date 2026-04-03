#!/bin/bash
set -u
PORT=1201
BASE_URL="http://localhost:$PORT"
PASS=0
FAIL=0

pass() {
  local msg="$1"
  echo "PASS  $msg"
  PASS=$((PASS+1))
}

fail() {
  local msg="$1"
  echo "FAIL  $msg"
  FAIL=$((FAIL+1))
}

assert_status() {
  local route="$1"
  local expected="$2"
  local desc="$3"

  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$route")
  if [ "$code" = "$expected" ]; then
    pass "$desc -> $code"
  else
    fail "$desc -> $code (expected $expected)"
  fi
}

assert_redirect_and_cookie() {
  local route="$1"
  local expected_location="$2"
  local expected_cookie_fragment="$3"
  local desc="$4"

  local headers
  headers=$(curl -s -D - -o /dev/null "$BASE_URL$route")

  local status
  status=$(echo "$headers" | awk 'NR==1 {print $2}')
  local location
  location=$(echo "$headers" | tr -d '\r' | awk -F': ' 'tolower($1)=="location" {print $2}' | head -n 1)
  local cookie
  cookie=$(echo "$headers" | tr -d '\r' | awk -F': ' 'tolower($1)=="set-cookie" {print $2}' | head -n 1)

  if [ "$status" != "307" ]; then
    fail "$desc -> status $status (expected 307)"
    return
  fi

  if [ "$location" != "$expected_location" ]; then
    fail "$desc -> location '$location' (expected '$expected_location')"
    return
  fi

  case "$cookie" in
    *"$expected_cookie_fragment"*)
      pass "$desc -> 307 + safe redirect + cookie"
      ;;
    *)
      fail "$desc -> missing cookie fragment '$expected_cookie_fragment'"
      ;;
  esac
}

echo "=== Frontend E2E Auth Flow Tests ==="
echo ""

# Plan-aware auth pages should render normally
assert_status "/login?plan=professional" "200" "GET /login?plan=professional"
assert_status "/register?plan=premium" "200" "GET /register?plan=premium"
assert_status "/auth/complete?plan=professional" "200" "GET /auth/complete?plan=professional"

# OAuth callback error handling should always route safely to /login and set error cookie
echo "INFO  Expected behavior checks (307 redirect by design):"
assert_redirect_and_cookie \
  "/auth/callback?error=access_denied&error_description=Denied+by+provider&next=//evil.test" \
  "http://localhost:$PORT/login" \
  "clinic_ai_auth_error=" \
  "GET /auth/callback error with external-style next"

assert_redirect_and_cookie \
  "/auth/callback" \
  "http://localhost:$PORT/login" \
  "clinic_ai_auth_error=" \
  "GET /auth/callback missing code"

echo ""
echo "Results: $PASS passed, $FAIL failed out of $((PASS+FAIL))"
if [ "$FAIL" -eq 0 ]; then
  echo "ALL TESTS PASSED"
  exit 0
else
  echo "SOME TESTS FAILED"
  exit 1
fi
