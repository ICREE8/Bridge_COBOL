#!/usr/bin/env bash
# ==============================================================================
# Bridge_COBOL: Automated Docker Compose End-to-End Smoke Test Suite
#
# Validates the complete stack after `docker compose up`:
# - GnuCOBOL Core (Indexed VSAM KSDS emulator with COMP-3 & POSIX fcntl locking)
# - Redis 2PC Idempotency Store
# - Bridge API Gateway (Binary translation, REST API, Solana Devnet settlement)
# - Web Cockpit (Next.js 14 Operator UI)
# ==============================================================================

set -uo pipefail

# Configuration
API_BASE="${API_BASE_URL:-http://localhost:4000}"
UI_BASE="${UI_BASE_URL:-http://localhost:3000}"
MAX_WAIT_SECONDS="${MAX_WAIT:-30}"

# Colors
C_RESET="\033[0m"
C_BOLD="\033[1m"
C_GREEN="\033[32m"
C_RED="\033[31m"
C_YELLOW="\033[33m"
C_BLUE="\033[34m"
C_CYAN="\033[36m"
C_MAGENTA="\033[35m"

PASSED_TESTS=0
FAILED_TESTS=0
TOTAL_TESTS=0
START_TIME=$(date +%s)

# JSON Parser helper (supports python3 or node)
json_get() {
  local json="$1"
  local py_code="$2"
  python3 -c "import sys, json; data=json.loads(sys.argv[1]); $py_code" "$json" 2>/dev/null
}

log_header() {
  echo -e "\n${C_BOLD}${C_CYAN}==============================================================================${C_RESET}"
  echo -e "${C_BOLD}${C_CYAN} $1${C_RESET}"
  echo -e "${C_BOLD}${C_CYAN}==============================================================================${C_RESET}"
}

log_step() {
  echo -e "${C_BOLD}${C_BLUE}--> [STEP $1]${C_RESET} $2"
}

assert_pass() {
  local name="$1"
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  PASSED_TESTS=$((PASSED_TESTS + 1))
  echo -e "    ${C_GREEN}✔ PASS:${C_RESET} $name"
}

assert_fail() {
  local name="$1"
  local reason="${2:-}"
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  FAILED_TESTS=$((FAILED_TESTS + 1))
  echo -e "    ${C_RED}✖ FAIL:${C_RESET} $name"
  if [[ -n "$reason" ]]; then
    echo -e "      ${C_YELLOW}Reason:${C_RESET} $reason"
  fi
}

# ------------------------------------------------------------------------------
# 0. Healthcheck & Polling for Readiness
# ------------------------------------------------------------------------------
log_header "Bridge_COBOL Docker Compose End-to-End Smoke Test"
echo -e "API Gateway Target : ${C_BOLD}${API_BASE}${C_RESET}"
echo -e "Web Cockpit Target : ${C_BOLD}${UI_BASE}${C_RESET}"
echo -e "Max Polling Timeout: ${MAX_WAIT_SECONDS}s\n"

log_step 0 "Waiting for Docker Compose services to report healthy..."

API_READY=false
WAIT_ELAPSED=0

while [[ $WAIT_ELAPSED -lt $MAX_WAIT_SECONDS ]]; do
  HEALTH_STATUS=$(curl -s -m 2 "${API_BASE}/api/v1/health" 2>/dev/null || echo "")
  if [[ -n "$HEALTH_STATUS" ]] && echo "$HEALTH_STATUS" | grep -q '"status":"UP"'; then
    API_READY=true
    break
  fi
  sleep 1
  WAIT_ELAPSED=$((WAIT_ELAPSED + 1))
  echo -n "."
done
echo ""

if [[ "$API_READY" != "true" ]]; then
  echo -e "${C_RED}ERROR: Bridge API Gateway at ${API_BASE} did not become ready within ${MAX_WAIT_SECONDS}s.${C_RESET}"
  echo -e "Ensure containers are running with: ${C_BOLD}docker compose up -d${C_RESET}"
  exit 1
fi

echo -e "${C_GREEN}✔ Services are ONLINE and reachable!${C_RESET}\n"

# ------------------------------------------------------------------------------
# 1. Health Endpoint Inspection
# ------------------------------------------------------------------------------
log_step 1 "Verifying Bridge API Gateway Health Endpoint..."
HEALTH_RESP=$(curl -s "${API_BASE}/api/v1/health")
STATUS_VAL=$(json_get "$HEALTH_RESP" "print(data.get('status', ''))")
LAYER_VAL=$(json_get "$HEALTH_RESP" "print(data.get('layer', ''))")
PAYER_VAL=$(json_get "$HEALTH_RESP" "print(data.get('solanaPayer', ''))")

if [[ "$STATUS_VAL" == "UP" && "$LAYER_VAL" == "BRIDGE_API_GATEWAY" ]]; then
  assert_pass "Healthcheck returned status=UP (Layer: $LAYER_VAL, Solana Payer: ${PAYER_VAL:0:8}...)"
else
  assert_fail "Healthcheck response invalid" "Payload: $HEALTH_RESP"
fi

# ------------------------------------------------------------------------------
# 2. Web Cockpit UI Reachability
# ------------------------------------------------------------------------------
log_step 2 "Verifying Next.js 14 Web Cockpit UI..."
UI_STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "${UI_BASE}" || echo "000")

if [[ "$UI_STATUS_CODE" == "200" ]]; then
  assert_pass "Web Cockpit is serving HTTP 200 at ${UI_BASE}"
else
  assert_fail "Web Cockpit returned HTTP $UI_STATUS_CODE at ${UI_BASE}"
fi

# ------------------------------------------------------------------------------
# 3. Existing Accounts Listing
# ------------------------------------------------------------------------------
log_step 3 "Querying tracked accounts list via REST..."
ACCTS_RESP=$(curl -s "${API_BASE}/api/v1/accounts")
ACCTS_COUNT=$(json_get "$ACCTS_RESP" "print(data.get('count', 0))")

if [[ "$ACCTS_COUNT" =~ ^[0-9]+$ ]]; then
  assert_pass "Accounts endpoint responded with count=$ACCTS_COUNT"
else
  assert_fail "Failed to query accounts endpoint" "Payload: $ACCTS_RESP"
fi

# ------------------------------------------------------------------------------
# 4. Account Creation with COMP-3 Packed Decimal Balance ($10,000.50)
# ------------------------------------------------------------------------------
TS_SHORT=$(date +%s | tail -c 7)
TEST_ACCT="SMK${TS_SHORT}"
log_step 4 "Creating Account ${TEST_ACCT} with \$10,000.50 initial balance..."

CREATE_PAYLOAD="{\"accountId\":\"${TEST_ACCT}\",\"initialBalance\":10000.50,\"ownerName\":\"Smoke Test Suite\",\"status\":\"A\"}"
CREATE_RESP=$(curl -s -X POST "${API_BASE}/api/v1/accounts" \
  -H "Content-Type: application/json" \
  -d "$CREATE_PAYLOAD")

CR_CODE=$(json_get "$CREATE_RESP" "print(data.get('returnCode', ''))")
CR_BAL=$(json_get "$CREATE_RESP" "print(data.get('account', {}).get('balance', 0))")
CR_HEX=$(json_get "$CREATE_RESP" "print(' '.join(data.get('account', {}).get('rawBalanceHex', [])))")

if [[ "$CR_CODE" == "00" && "$CR_BAL" == "10000.5" ]]; then
  assert_pass "Account created with ReturnCode 00 (\$10,000.50 | Hex: $CR_HEX)"
else
  assert_fail "Account creation failed" "RC=$CR_CODE, Resp: $CREATE_RESP"
fi

# ------------------------------------------------------------------------------
# 5. Account Retrieval & Hex Memory Structure Verification
# ------------------------------------------------------------------------------
log_step 5 "Reading Account ${TEST_ACCT} and inspecting 47-byte VSAM record..."
READ_RESP=$(curl -s "${API_BASE}/api/v1/accounts/${TEST_ACCT}")
RD_CODE=$(json_get "$READ_RESP" "print(data.get('returnCode', ''))")
RD_OWNER=$(json_get "$READ_RESP" "print(data.get('account', {}).get('owner', ''))")
RD_FMT=$(json_get "$READ_RESP" "print(data.get('account', {}).get('balanceFormatted', ''))")

if [[ "$RD_CODE" == "00" && "$RD_OWNER" =~ "Smoke Test" && "$RD_FMT" == "000010000.50" ]]; then
  assert_pass "Record decoded accurately (Formatted: \$$RD_FMT, Owner: $RD_OWNER)"
else
  assert_fail "Account retrieval data mismatch" "Resp: $READ_RESP"
fi

# ------------------------------------------------------------------------------
# 6. Debit Transfer with Idempotency Key & Solana Settlement
# ------------------------------------------------------------------------------
IDEMP_KEY="smoke_debit_${TS_SHORT}"
log_step 6 "Executing \$1,500.00 DEBIT with Idempotency Key '${IDEMP_KEY}'..."

DEBIT_PAYLOAD="{\"action\":\"DEBIT\",\"accountId\":\"${TEST_ACCT}\",\"amount\":1500.00,\"idempotencyKey\":\"${IDEMP_KEY}\",\"triggerSettlement\":true}"
DEBIT_RESP=$(curl -s -X POST "${API_BASE}/api/v1/transfers" \
  -H "Content-Type: application/json" \
  -d "$DEBIT_PAYLOAD")

DB_CODE=$(json_get "$DEBIT_RESP" "print(data.get('returnCode', ''))")
DB_BAL=$(json_get "$DEBIT_RESP" "print(data.get('account', {}).get('balance', 0))")
DB_SIG=$(json_get "$DEBIT_RESP" "print(data.get('settlement', {}).get('signature', ''))")
DB_SLOT=$(json_get "$DEBIT_RESP" "print(data.get('settlement', {}).get('slot', ''))")
DB_SIM=$(json_get "$DEBIT_RESP" "print(data.get('settlement', {}).get('isSimulated', ''))")
DB_VERIFIED=$(json_get "$DEBIT_RESP" "print(data.get('settlement', {}).get('signatureVerified', ''))")

if [[ "$DB_CODE" == "00" && "$DB_BAL" == "8500.5" && -n "$DB_SIG" ]]; then
  if [[ "$DB_SIM" == "True" || "$DB_SIM" == "true" ]]; then
    SETTLE_MODE="${C_YELLOW}ED25519 FALLBACK PROOF (RPC Timeout SLA Protection)${C_RESET}"
  else
    SETTLE_MODE="${C_GREEN}LIVE SOLANA DEVNET ON-CHAIN${C_RESET}"
  fi
  assert_pass "Debit committed (\$10,000.50 -> \$8,500.50). Settlement: ${SETTLE_MODE}"
  echo -e "      ${C_CYAN}Sig:${C_RESET} ${DB_SIG:0:24}... | Slot: #${DB_SLOT} | Ed25519 Verified: ${DB_VERIFIED}"
else
  assert_fail "Debit transfer failed" "RC=$DB_CODE, Resp: $DEBIT_RESP"
fi

# ------------------------------------------------------------------------------
# 7. Strict Idempotency Replay (Double-Debit Attack Prevention)
# ------------------------------------------------------------------------------
log_step 7 "Replaying identical DEBIT request with SAME Idempotency Key..."
REPLAY_RESP=$(curl -s -X POST "${API_BASE}/api/v1/transfers" \
  -H "Content-Type: application/json" \
  -d "$DEBIT_PAYLOAD")

IS_REPLAY=$(json_get "$REPLAY_RESP" "print(data.get('isIdempotentReplay', ''))")
RP_BAL=$(json_get "$REPLAY_RESP" "print(data.get('account', {}).get('balance', 0))")

# Re-read account directly from core to guarantee balance was not double-debited
VERIFY_RESP=$(curl -s "${API_BASE}/api/v1/accounts/${TEST_ACCT}")
CORE_BAL=$(json_get "$VERIFY_RESP" "print(data.get('account', {}).get('balance', 0))")

if [[ "$IS_REPLAY" == "True" || "$IS_REPLAY" == "true" ]] && [[ "$CORE_BAL" == "8500.5" ]]; then
  assert_pass "Idempotency catch active! Zero double-debit (Core Balance strictly \$8,500.50)"
else
  assert_fail "Idempotency replay failed to protect balance" "isIdempotentReplay=$IS_REPLAY, CoreBal=$CORE_BAL"
fi

# ------------------------------------------------------------------------------
# 8. Credit Transfer ($500.00)
# ------------------------------------------------------------------------------
log_step 8 "Executing \$500.00 CREDIT transfer..."
CREDIT_PAYLOAD="{\"action\":\"CREDIT\",\"accountId\":\"${TEST_ACCT}\",\"amount\":500.00,\"triggerSettlement\":false}"
CREDIT_RESP=$(curl -s -X POST "${API_BASE}/api/v1/transfers" \
  -H "Content-Type: application/json" \
  -d "$CREDIT_PAYLOAD")

CD_CODE=$(json_get "$CREDIT_RESP" "print(data.get('returnCode', ''))")
CD_BAL=$(json_get "$CREDIT_RESP" "print(data.get('account', {}).get('balance', 0))")

if [[ "$CD_CODE" == "00" && "$CD_BAL" == "9000.5" ]]; then
  assert_pass "Credit committed successfully (\$8,500.50 + \$500.00 = \$9,000.50)"
else
  assert_fail "Credit transfer failed" "RC=$CD_CODE, Resp: $CREDIT_RESP"
fi

# ------------------------------------------------------------------------------
# 9. Business Rule Validation: Insufficient Funds
# ------------------------------------------------------------------------------
log_step 9 "Attempting overdraft (\$50,000.00) to test return code 02..."
OVERDRAFT_PAYLOAD="{\"action\":\"DEBIT\",\"accountId\":\"${TEST_ACCT}\",\"amount\":50000.00,\"triggerSettlement\":false}"
OVERDRAFT_RESP=$(curl -s -X POST "${API_BASE}/api/v1/transfers" \
  -H "Content-Type: application/json" \
  -d "$OVERDRAFT_PAYLOAD")

OD_CODE=$(json_get "$OVERDRAFT_RESP" "print(data.get('returnCode', ''))")
OD_MSG=$(json_get "$OVERDRAFT_RESP" "print(data.get('message', ''))")

if [[ "$OD_CODE" == "02" ]]; then
  assert_pass "COBOL business constraint enforced: ReturnCode 02 ($OD_MSG)"
else
  assert_fail "Overdraft should have failed with RC=02" "Got RC=$OD_CODE, Resp: $OVERDRAFT_RESP"
fi

# ------------------------------------------------------------------------------
# 10. Concurrency & POSIX fcntl Record Locking Stress Test
# ------------------------------------------------------------------------------
log_step 10 "Triggering concurrent stress test (5 simultaneous transfers on ${TEST_ACCT})..."
STRESS_PAYLOAD="{\"accountId\":\"${TEST_ACCT}\",\"concurrency\":5}"
STRESS_RESP=$(curl -s -X POST "${API_BASE}/api/v1/stress" \
  -H "Content-Type: application/json" \
  -d "$STRESS_PAYLOAD")

STRESS_COUNT=$(json_get "$STRESS_RESP" "print(len(data.get('results', [])))")
STRESS_FAILURES=$(json_get "$STRESS_RESP" "print(sum(1 for r in data.get('results', []) if not r.get('success', False)))")

if [[ "$STRESS_COUNT" == "5" && "$STRESS_FAILURES" == "0" ]]; then
  assert_pass "POSIX fcntl record lock serialized 5 concurrent requests with 0 deadlocks"
else
  assert_fail "Concurrent stress test failed" "Count=$STRESS_COUNT, Failures=$STRESS_FAILURES, Resp: $STRESS_RESP"
fi

# ------------------------------------------------------------------------------
# 11. SSE Stream Handshake Test
# ------------------------------------------------------------------------------
log_step 11 "Validating Server-Sent Events (SSE) telemetry stream..."
SSE_HEADER=$(curl -s -m 2 -i "${API_BASE}/api/v1/events" 2>&1 | head -n 10 || echo "")

if echo "$SSE_HEADER" | grep -qi "text/event-stream"; then
  assert_pass "SSE telemetry connection active (Content-Type: text/event-stream)"
else
  assert_fail "SSE stream connection failed" "Headers: $SSE_HEADER"
fi

# ------------------------------------------------------------------------------
# Summary & Exit
# ------------------------------------------------------------------------------
ELAPSED=$(($(date +%s) - START_TIME))
echo -e "\n${C_BOLD}${C_CYAN}==============================================================================${C_RESET}"
echo -e "${C_BOLD} SMOKE TEST SUITE SUMMARY${C_RESET}"
echo -e "${C_BOLD}${C_CYAN}==============================================================================${C_RESET}"
echo -e "Total Tests Run : ${C_BOLD}${TOTAL_TESTS}${C_RESET}"
echo -e "Passed          : ${C_GREEN}${C_BOLD}${PASSED_TESTS}${C_RESET}"
echo -e "Failed          : $(if [[ $FAILED_TESTS -gt 0 ]]; then echo -e "${C_RED}${C_BOLD}${FAILED_TESTS}${C_RESET}"; else echo -e "${C_GREEN}0${C_RESET}"; fi)"
echo -e "Total Duration  : ${ELAPSED}s"

if [[ $FAILED_TESTS -eq 0 ]]; then
  echo -e "\n${C_GREEN}${C_BOLD}✔ ALL DOCKER COMPOSE INTEGRATION TESTS PASSED 100%!${C_RESET}\n"
  exit 0
else
  echo -e "\n${C_RED}${C_BOLD}✖ SMOKE TEST SUITE FAILED WITH ${FAILED_TESTS} ERROR(S)${C_RESET}\n"
  exit 1
fi
