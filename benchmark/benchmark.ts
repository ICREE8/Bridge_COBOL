import { CopybookCodec } from '../bridge/src/codec/copybook.js';
import { CobolIpcClient } from '../bridge/src/ipc/cobol_client.js';

async function runBenchmark() {
  console.log('=================================================================');
  console.log(' BRIDGE_COBOL LATENCY BENCHMARK');
  console.log(' Measures: JSON -> Binary Encode -> IPC -> fcntl Lock ->');
  console.log('           VSAM Disk Write -> IPC -> Binary Decode -> JSON');
  console.log(' Target   : p99 < 12.0 ms');
  console.log('=================================================================\n');

  const codec = new CopybookCodec();
  const ipc = new CobolIpcClient({ tcpHost: '127.0.0.1', tcpPort: 9999 });

  // Warmup
  console.log('Warming up core and IPC connection...');
  for (let i = 0; i < 10; i++) {
    const buf = codec.encode({ action: 'READ', accountId: 'ACCT000001' });
    await ipc.execute(buf);
  }

  const iterations = 100;
  const latencies: number[] = [];
  console.log(`Executing ${iterations} consecutive full-cycle transactions...`);

  const tStartTotal = performance.now();

  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    const action = (i % 2 === 0) ? 'CREDIT' : 'DEBIT';
    const amount = 10.00;
    const reqBuf = codec.encode({
      action,
      accountId: 'ACCT000001',
      amount,
      idempotencyKey: `bench_${i}`
    });

    const respBuf = await ipc.execute(reqBuf);
    const res = codec.decode(respBuf);

    if (!res.isSuccess) {
      console.warn(`Warning on iteration ${i}: ${res.message}`);
    }

    const t1 = performance.now();
    latencies.push(t1 - t0);
  }

  const totalTimeMs = performance.now() - tStartTotal;
  latencies.sort((a, b) => a - b);

  const min = latencies[0];
  const max = latencies[latencies.length - 1];
  const p50 = latencies[Math.floor(latencies.length * 0.50)];
  const p90 = latencies[Math.floor(latencies.length * 0.90)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const opsSec = (iterations / (totalTimeMs / 1000)).toFixed(1);

  console.log('\n--- BENCHMARK RESULTS ---');
  console.log(`Total Requests  : ${iterations}`);
  console.log(`Throughput      : ${opsSec} ops/sec`);
  console.log(`Min Latency     : ${min.toFixed(2)} ms`);
  console.log(`Avg Latency     : ${avg.toFixed(2)} ms`);
  console.log(`p50 (Median)    : ${p50.toFixed(2)} ms`);
  console.log(`p90             : ${p90.toFixed(2)} ms`);
  console.log(`p95             : ${p95.toFixed(2)} ms`);
  console.log(`p99 (Target<12) : ${p99.toFixed(2)} ms`);
  console.log(`Max Latency     : ${max.toFixed(2)} ms`);
  console.log('-------------------------\n');

  if (p99 < 12.0) {
    console.log(`>>> CHECKPOINT GREEN: p99 is ${p99.toFixed(2)} ms, comfortably outperforming the 12.0 ms target! <<<`);
  } else {
    console.warn(`>>> Warning: p99 (${p99.toFixed(2)} ms) exceeded 12 ms <<<`);
  }
}

runBenchmark().catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
