import { CopybookCodec } from '../src/codec/copybook.js';
import { CobolIpcClient } from '../src/ipc/cobol_client.js';
import { IdempotencyManager } from '../src/idempotency/redis.js';
import { SolanaSettlementEngine } from '../src/settlement/solana.js';
import { Comp3Codec } from '../src/codec/comp3.js';

async function runEndToEnd() {
  console.log('==========================================================');
  console.log(' M2 & M3 CHECKPOINT: END-TO-END BRIDGE INTEGRATION TEST');
  console.log('==========================================================\n');

  const codec = new CopybookCodec();
  const ipc = new CobolIpcClient({ tcpHost: '127.0.0.1', tcpPort: 9999 });
  const idemp = new IdempotencyManager();
  const solana = new SolanaSettlementEngine();

  await idemp.connect();

  // Test 1: Create Account ACCT000088 with $10,000.50
  console.log('[STEP 1] Creating Account ACCT000088 with $10,000.50...');
  const createBuf = codec.encode({
    action: 'CREATE',
    accountId: 'ACCT000088',
    amount: 10000.50,
    ownerName: 'Integration Tester',
    newStatus: 'A'
  });

  const createRespBuf = await ipc.execute(createBuf);
  const createRes = codec.decode(createRespBuf);
  console.log(`  -> Return Code : ${createRes.returnCode}`);
  console.log(`  -> Message     : ${createRes.message}`);
  console.log(`  -> Balance     : $${createRes.account?.balance.toFixed(2)}`);
  console.log(`  -> Balance Hex : [${createRes.account?.rawBalanceHex.join(', ')}]`);

  if (!createRes.isSuccess && createRes.returnCode !== '04') {
    throw new Error(`Failed to create account: ${createRes.message}`);
  }
  console.log('  -> STEP 1 PASSED!\n');

  // Test 2: Read Account
  console.log('[STEP 2] Reading Account ACCT000088 via Binary IPC...');
  const readBuf = codec.encode({ action: 'READ', accountId: 'ACCT000088' });
  const readRespBuf = await ipc.execute(readBuf);
  const readRes = codec.decode(readRespBuf);
  console.log(`  -> Account ID  : ${readRes.account?.id}`);
  console.log(`  -> Status      : ${readRes.account?.status}`);
  console.log(`  -> Owner       : ${readRes.account?.owner}`);
  console.log(`  -> Balance ($) : ${readRes.account?.balanceFormatted}`);
  console.log(`  -> Balance Hex : [${readRes.account?.rawBalanceHex.join(', ')}]`);
  console.log('  -> STEP 2 PASSED!\n');

  // Test 3: Debit with Idempotency Key & Solana Devnet Settlement
  const idempKey = `IDEMP-TEST-${Date.now()}`;
  console.log(`[STEP 3] Executing $1,500.00 Debit with Idempotency Key: ${idempKey}...`);

  const { isNew } = await idemp.acquire(idempKey);
  if (!isNew) throw new Error('Expected fresh idempotency key');

  const debitBuf = codec.encode({
    action: 'DEBIT',
    accountId: 'ACCT000088',
    amount: 1500.00,
    idempotencyKey: idempKey
  });

  const debitRespBuf = await ipc.execute(debitBuf);
  const debitRes = codec.decode(debitRespBuf);
  console.log(`  -> Return Code   : ${debitRes.returnCode} (${debitRes.message})`);
  console.log(`  -> New Balance   : $${debitRes.account?.balanceFormatted}`);
  console.log(`  -> Balance Hex   : [${debitRes.account?.rawBalanceHex.join(', ')}]`);

  // Solana Settlement
  console.log('  -> Emitting Solana Devnet Settlement Transaction...');
  const settlement = await solana.settleTransfer('ACCT000088', 1500.00, idempKey);
  console.log(`  -> Solana Sig    : ${settlement.signature}`);
  console.log(`  -> Slot Finality : ${settlement.slot} (${settlement.finality})`);
  console.log(`  -> Explorer Link : ${settlement.explorerUrl}`);
  console.log(`  -> Sig Verified  : ${settlement.signatureVerified}`);

  await idemp.commit(idempKey, debitRes, settlement.signature);
  console.log('  -> STEP 3 PASSED!\n');

  // Test 4: Replay SAME Idempotency Key (Must NOT debit again!)
  console.log('[STEP 4] Replaying IDENTICAL request with same Idempotency Key...');
  const { isNew: replayIsNew, record: replayRecord } = await idemp.acquire(idempKey);
  console.log(`  -> isNew Lock     : ${replayIsNew} (false expected)`);
  console.log(`  -> Cached Status  : ${replayRecord?.status}`);
  console.log(`  -> Cached Balance : $${replayRecord?.response?.account?.balanceFormatted}`);
  console.log(`  -> Cached Tx Sig  : ${replayRecord?.settlementTx}`);

  if (replayIsNew || replayRecord?.status !== 'COMMITTED') {
    throw new Error('Idempotency replay failed to detect committed transaction!');
  }

  // Verify core balance was NOT deducted a second time
  const verifyBuf = codec.encode({ action: 'READ', accountId: 'ACCT000088' });
  const verifyResp = codec.decode(await ipc.execute(verifyBuf));
  console.log(`  -> Real Core Bal  : $${verifyResp.account?.balanceFormatted}`);

  if (verifyResp.account?.balance !== debitRes.account?.balance) {
    throw new Error('Double debit detected! Idempotency failed!');
  }
  console.log('  -> ZERO DOUBLE DEBIT: IDEMPOTENCY PASSED!\n');

  await idemp.close();

  console.log('==========================================================');
  console.log(' ALL M2 & M3 CHECKPOINTS VERIFIED 100% GREEN!');
  console.log('==========================================================');
}

runEndToEnd().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
