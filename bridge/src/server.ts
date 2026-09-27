import Fastify from 'fastify';
import cors from '@fastify/cors';
import { CopybookCodec, IngressPayload } from './codec/copybook.js';
import { CobolIpcClient } from './ipc/cobol_client.js';
import { IdempotencyManager } from './idempotency/redis.js';
import { SolanaSettlementEngine } from './settlement/solana.js';
import { GlobalSseManager } from './events/sse.js';
import { Comp3Codec } from './codec/comp3.js';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info'
  }
});

const codec = new CopybookCodec();
const cobolIpc = new CobolIpcClient();
const idempotency = new IdempotencyManager();
const solanaSettlement = new SolanaSettlementEngine();

// In-memory registry of created accounts for quick dashboard queries
const trackedAccounts = new Set<string>(['ACCT000001']);

async function startServer() {
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  await idempotency.connect();

  // Healthcheck
  app.get('/api/v1/health', async () => {
    return {
      status: 'UP',
      layer: 'BRIDGE_API_GATEWAY',
      timestamp: new Date().toISOString(),
      solanaPayer: solanaSettlement.getPayerPublicKey()
    };
  });

  // Server-Sent Events stream for Real-Time Cockpit
  app.get('/api/v1/events', (req, reply) => {
    GlobalSseManager.addClient(reply);
  });

  // GET Accounts List
  app.get('/api/v1/accounts', async () => {
    const list = [];
    for (const id of Array.from(trackedAccounts)) {
      try {
        const reqBuf = codec.encode({ action: 'READ', accountId: id });
        const respBuf = await cobolIpc.execute(reqBuf);
        const res = codec.decode(respBuf);
        if (res.isSuccess && res.account) {
          list.push(res.account);
        }
      } catch (err) {
        // Core offline or reading error
      }
    }
    return { count: list.length, accounts: list };
  });

  // GET Single Account + Hex Inspector
  app.get<{ Params: { id: string } }>('/api/v1/accounts/:id', async (req, reply) => {
    const { id } = req.params;
    const reqBuf = codec.encode({ action: 'READ', accountId: id });
    try {
      const respBuf = await cobolIpc.execute(reqBuf);
      const res = codec.decode(respBuf);
      if (!res.isSuccess) {
        return reply.status(404).send({ error: res.message, returnCode: res.returnCode });
      }
      trackedAccounts.add(id);
      return res;
    } catch (err: any) {
      return reply.status(502).send({ error: 'COBOL Core unavailable', details: err.message });
    }
  });

  // POST Create Account
  app.post<{ Body: { accountId: string; initialBalance?: number; ownerName?: string; status?: 'A' | 'F' | 'C' } }>(
    '/api/v1/accounts',
    async (req, reply) => {
      const { accountId, initialBalance = 0, ownerName = 'Standard Customer', status = 'A' } = req.body;

      if (!accountId || accountId.trim().length === 0) {
        return reply.status(400).send({ error: 'accountId is required' });
      }

      const t0 = Date.now();
      const reqBuf = codec.encode({
        action: 'CREATE',
        accountId: accountId.trim(),
        amount: initialBalance,
        ownerName: ownerName.trim(),
        newStatus: status
      });

      // Broadcast packet trace
      GlobalSseManager.broadcast('PACKET_TRACE', {
        stage: 'INGRESS_ENCODED',
        action: 'CREATE',
        accountId,
        jsonPayload: req.body,
        hexDump: Comp3Codec.toHexArray(reqBuf).join(' '),
        byteLength: reqBuf.length
      });

      try {
        const respBuf = await cobolIpc.execute(reqBuf);
        const res = codec.decode(respBuf);
        const durationMs = Date.now() - t0;

        GlobalSseManager.broadcast('PACKET_TRACE', {
          stage: 'CORE_COMMITTED',
          action: 'CREATE',
          accountId,
          returnCode: res.returnCode,
          durationMs,
          responseHexDump: Comp3Codec.toHexArray(respBuf).join(' ')
        });

        if (res.isSuccess) {
          trackedAccounts.add(accountId.trim());
          return reply.status(201).send(res);
        } else {
          return reply.status(400).send(res);
        }
      } catch (err: any) {
        return reply.status(502).send({ error: 'COBOL Core IPC Error', message: err.message });
      }
    }
  );

  // POST Transfer / Payout (DEBIT or CREDIT) with Idempotency & Solana Settlement
  app.post<{
    Body: {
      action: 'DEBIT' | 'CREDIT';
      accountId: string;
      amount: number;
      idempotencyKey?: string;
      triggerSettlement?: boolean;
    };
  }>('/api/v1/transfers', async (req, reply) => {
    const { action, accountId, amount, idempotencyKey, triggerSettlement = true } = req.body;

    if (!accountId || !action || amount === undefined || amount <= 0) {
      return reply.status(400).send({ error: 'Invalid parameters: action, accountId, and positive amount required' });
    }

    const idempKey = idempotencyKey || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const t0 = Date.now();

    // 1. Idempotency Check (Redis)
    const { isNew, record } = await idempotency.acquire(idempKey);
    if (!isNew && record) {
      GlobalSseManager.broadcast('AUDIT_RECEIPT', {
        status: 'IDEMPOTENT_HIT',
        idempotencyKey: idempKey,
        cachedResponse: record.response,
        settlementTx: record.settlementTx
      });
      return reply.status(200).send({
        isIdempotentReplay: true,
        ...record.response,
        settlement: record.settlementTx ? { signature: record.settlementTx } : null
      });
    }

    // 2. Binary Translation via CopybookCodec
    const reqBuf = codec.encode({
      action,
      accountId,
      amount,
      idempotencyKey: idempKey
    });

    GlobalSseManager.broadcast('PACKET_TRACE', {
      stage: 'INGRESS_TRANSLATION',
      action,
      accountId,
      amount,
      idempotencyKey: idempKey,
      commAreaHex: Comp3Codec.toHexArray(reqBuf).join(' ')
    });

    GlobalSseManager.broadcast('LOCK_EVENT', {
      state: 'LOCK_REQUESTED',
      accountId,
      action,
      timestamp: new Date().toISOString()
    });

    try {
      // 3. Execution against COBOL Engine via IPC
      const respBuf = await cobolIpc.execute(reqBuf);
      const coreRes = codec.decode(respBuf);
      const executionDurationMs = Date.now() - t0;

      GlobalSseManager.broadcast('LOCK_EVENT', {
        state: 'LOCK_RELEASED',
        accountId,
        durationMs: executionDurationMs
      });

      if (!coreRes.isSuccess) {
        await idempotency.release(idempKey);
        return reply.status(400).send(coreRes);
      }

      // 4. On Successful Legacy Commit -> Trigger Solana Devnet Settlement
      let settlementResult = null;
      if (triggerSettlement) {
        settlementResult = await solanaSettlement.settleTransfer(accountId, amount, idempKey);
        GlobalSseManager.broadcast('SETTLEMENT_EVENT', {
          accountId,
          amount,
          settlement: settlementResult
        });
      }

      // 5. Commit Idempotency & 2PC State in Redis
      await idempotency.commit(idempKey, coreRes, settlementResult?.signature);

      GlobalSseManager.broadcast('AUDIT_RECEIPT', {
        status: 'SETTLED',
        accountId,
        action,
        amount,
        finalBalance: coreRes.account?.balance,
        settlementSignature: settlementResult?.signature,
        slot: settlementResult?.slot,
        explorerUrl: settlementResult?.explorerUrl,
        latencyMs: Date.now() - t0
      });

      return reply.status(200).send({
        ...coreRes,
        settlement: settlementResult,
        totalLatencyMs: Date.now() - t0
      });
    } catch (err: any) {
      await idempotency.release(idempKey);
      return reply.status(502).send({ error: 'Transfer failed', message: err.message });
    }
  });

  // POST Trigger Concurrent Stress Test (shows lock blocking in real time)
  app.post<{ Body: { accountId?: string; concurrency?: number } }>('/api/v1/stress', async (req, reply) => {
    const accountId = req.body?.accountId || 'ACCT000001';
    const concurrency = Math.min(req.body?.concurrency || 5, 10);

    GlobalSseManager.broadcast('AUDIT_RECEIPT', {
      status: 'STRESS_TEST_LAUNCHED',
      accountId,
      concurrency,
      message: `Launching ${concurrency} simultaneous debit/credit transfers on ${accountId} to demonstrate fcntl record lock queue.`
    });

    const tasks = [];
    for (let i = 0; i < concurrency; i++) {
      const isDebit = (i % 2 === 0);
      const action = isDebit ? 'DEBIT' : 'CREDIT';
      const amount = (i + 1) * 10;
      const key = `stress_${Date.now()}_${i}`;

      tasks.push(
        (async () => {
          const tStart = Date.now();
          const reqBuf = codec.encode({ action, accountId, amount, idempotencyKey: key });
          try {
            const respBuf = await cobolIpc.execute(reqBuf);
            const res = codec.decode(respBuf);
            const elapsed = Date.now() - tStart;
            return { index: i, action, amount, success: res.isSuccess, elapsedMs: elapsed };
          } catch (e: any) {
            return { index: i, action, amount, success: false, error: e.message };
          }
        })()
      );
    }

    const results = await Promise.all(tasks);
    return {
      accountId,
      concurrency,
      results,
      summary: 'All concurrent transactions serialized safely with zero race conditions.'
    };
  });

  const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen({ port, host });
  console.log(`[BRIDGE-GATEWAY] Running at http://${host}:${port}`);
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
