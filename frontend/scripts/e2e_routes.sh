#!/bin/bash
set -u
PORT=1201
PASS=0
FAIL=0

test_route() {
  local method="$1"
  local route="$2"
  local expected="$3"
  local desc="$4"
  
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT$route")
  if [ "$code" = "$expected" ]; then
    echo "PASS  $method $route -> $code  ($desc)"
    PASS=$((PASS+1))
  else
    echo "FAIL  $method $route -> $code (expected $expected)  ($desc)"
    FAIL=$((FAIL+1))
  fi
}

echo "=== Frontend E2E Route Tests ==="
echo ""

# Public pages (should return 200)
test_route GET "/" "200" "Homepage"
test_route GET "/login" "200" "Login page"
test_route GET "/register" "200" "Register page"
test_route GET "/onboarding" "200" "Onboarding page"

# Chat with slug (should render page even for non-existent clinic)
test_route GET "/chat/test-clinic" "200" "Chat page (dynamic slug)"

# Contact page
test_route GET "/contact" "200" "Contact / Book a Demo page"

# Auth complete page (OAuth callback landing)
test_route GET "/auth/complete" "200" "OAuth complete page"

# Dashboard pages (auth is client-side, so pages render 200 and redirect in browser)
test_route GET "/dashboard" "200" "Dashboard page (client-side auth)"
test_route GET "/dashboard/leads" "200" "Leads page (client-side auth)"
test_route GET "/dashboard/settings" "200" "Settings page (client-side auth)"
test_route GET "/dashboard/billing" "200" "Billing page (client-side auth)"

# 404 for non-existent routes
echo "INFO  Expected behavior checks (non-200 by design):"
test_route GET "/this-does-not-exist" "404" "404 for unknown route"

# Static assets
test_route GET "/widget.js" "200" "Widget JS"
test_route GET "/test-embed.html" "200" "Test embed page"

echo ""
echo "Results: $PASS passed, $FAIL failed out of $((PASS+FAIL))"
if [ "$FAIL" -eq 0 ]; then
  echo "ALL TESTS PASSED"
  exit 0
else
  echo "SOME TESTS FAILED"
  exit 1
fi
