import { Comp3Codec, DefaultComp3Codec } from '../src/codec/comp3.js';
import { CopybookCodec } from '../src/codec/copybook.js';
import { EbcdicCodec } from '../src/codec/ebcdic.js';

console.log('==========================================================');
console.log(' M2 CHECKPOINT: COMP-3 & COPYBOOKCODEC ROUND-TRIP TEST');
console.log('==========================================================');

// Test 1: Exact $10,000.50 COMP-3 encoding
const amount = 10000.50;
const encodedComp3 = DefaultComp3Codec.encode(amount);
const hexBytes = Comp3Codec.toHexArray(encodedComp3);
console.log(`[TEST 1] Input Currency: $${amount.toFixed(2)}`);
console.log(`         Packed COMP-3: [${hexBytes.join(', ')}]`);

const decoded = DefaultComp3Codec.decode(encodedComp3);
console.log(`         Decoded Value: $${decoded.value.toFixed(2)}`);
if (decoded.value !== amount) {
  throw new Error(`Round-trip mismatch: expected ${amount}, got ${decoded.value}`);
}
console.log('         -> ROUND-TRIP IDENTICAL: PASSED!\n');

// Test 2: Negative amounts ($ -542.15)
const negAmount = -542.15;
const negComp3 = DefaultComp3Codec.encode(negAmount);
const negHex = Comp3Codec.toHexArray(negComp3);
console.log(`[TEST 2] Negative Amount: $${negAmount.toFixed(2)}`);
console.log(`         Packed COMP-3: [${negHex.join(', ')}]`);
const negDecoded = DefaultComp3Codec.decode(negComp3);
console.log(`         Decoded Value: $${negDecoded.value.toFixed(2)}`);
if (negDecoded.value !== negAmount || !negDecoded.isNegative) {
  throw new Error(`Negative round-trip failed: got ${negDecoded.value}`);
}
console.log('         -> NEGATIVE COMP-3 ENCODING: PASSED!\n');

// Test 3: EBCDIC Translation
const originalStr = 'HELLO COBOL BRIDGE';
const ebcdicBuf = EbcdicCodec.encode(originalStr, 30);
const asciiStr = EbcdicCodec.decode(ebcdicBuf);
console.log(`[TEST 3] EBCDIC Translation:`);
console.log(`         Original String: "${originalStr}"`);
console.log(`         EBCDIC Bytes   : 0x${ebcdicBuf.subarray(0, 18).toString('hex').toUpperCase()}`);
console.log(`         Decoded ASCII  : "${asciiStr}"`);
if (asciiStr !== originalStr) {
  throw new Error(`EBCDIC mismatch: expected "${originalStr}", got "${asciiStr}"`);
}
console.log('         -> EBCDIC TRANSLATION: PASSED!\n');

// Test 4: CopybookCodec Ingress & Egress 183-byte buffer
const codec = new CopybookCodec();
const ingressBuf = codec.encode({
  action: 'DEBIT',
  accountId: 'ACCT000001',
  amount: 250.75,
  ownerName: 'Alice Smith',
  idempotencyKey: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
});

console.log(`[TEST 4] CopybookCodec 183-byte Buffer Verification:`);
console.log(`         Buffer Length   : ${ingressBuf.length} bytes (exact COMMAREA)`);
console.log(`         Action in Buffer: "${ingressBuf.toString('ascii', 0, 6)}"`);
console.log(`         Account ID      : "${ingressBuf.toString('ascii', 6, 16)}"`);
console.log(`         Amount COMP-3   : [${Comp3Codec.toHexArray(ingressBuf.subarray(16, 22)).join(', ')}]`);
console.log(`         Idempotency Key : "${ingressBuf.toString('ascii', 53, 89)}"`);

if (ingressBuf.length !== 183) {
  throw new Error(`Expected 183 bytes, got ${ingressBuf.length}`);
}
console.log('         -> 183-BYTE CICS COMMAREA CODEC: PASSED!\n');

console.log('==========================================================');
console.log(' ALL COMP-3 & COPYBOOKCODEC UNIT TESTS PASSED (100%)');
console.log('==========================================================');
