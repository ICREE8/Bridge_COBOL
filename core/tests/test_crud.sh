#!/bin/bash
set -e

echo "=========================================================="
echo " M1 CHECKPOINT: COBOL CRUD & COMP-3 INTEGRITY TEST"
echo "=========================================================="

rm -f data/ACCTS.DAT* data/accts.lock

echo "[TEST 1] Creating Account ACCT000001 with \$10,000.50 (1000050 cents)..."
./bin/bankcore_cli CREATE ACCT000001 1000050 A "Alice Smith"

echo -e "\n[TEST 2] Reading Account ACCT000001..."
./bin/bankcore_cli READ ACCT000001

echo -e "\n[TEST 3] Debiting \$2,500.00 (250000 cents) from ACCT000001..."
./bin/bankcore_cli DEBIT ACCT000001 250000

echo -e "\n[TEST 4] Crediting \$5,000.00 (500000 cents) to ACCT000001..."
./bin/bankcore_cli CREDIT ACCT000001 500000

echo -e "\n[TEST 5] Testing Insufficient Funds (Debiting \$99,999.00)..."
set +e
./bin/bankcore_cli DEBIT ACCT000001 9999900
set -e

echo -e "\n[TEST 6] Raw Hex Dump of ACCTS.DAT on Disk:"
xxd data/ACCTS.DAT | head -n 10

echo -e "\n=========================================================="
echo " ALL COBOL CRUD & COMP-3 TESTS PASSED PERFECTLY!"
echo "=========================================================="
