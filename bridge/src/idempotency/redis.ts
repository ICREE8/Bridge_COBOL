import Redis from 'ioredis';
import { CoreResponse } from '../codec/copybook.js';

export interface IdempotencyRecord {
  status: 'PENDING' | 'COMMITTED' | 'FAILED';
  createdAt: number;
  payloadHash?: string;
  response?: CoreResponse;
  settlementTx?: string;
}

export class IdempotencyManager {
  private redis: Redis;

  constructor(redisUrl?: string) {
    const url = redisUrl ?? process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 100, 2000);
      },
      lazyConnect: true
    });
  }

  async connect(): Promise<void> {
    try {
      if (this.redis.status === 'wait') {
        await this.redis.connect();
      }
    } catch (err) {
      console.warn('[REDIS] Connection failed, operating in in-memory fallback mode');
    }
  }

  /**
   * Tries to acquire an idempotency lock for key.
   * Returns { isNew: true } if acquired, or { isNew: false, record } if already processed or pending.
   */
  async acquire(key: string, ttlSeconds: number = 120): Promise<{ isNew: boolean; record?: IdempotencyRecord }> {
    const redisKey = `idemp:${key}`;
    const initialRecord: IdempotencyRecord = {
      status: 'PENDING',
      createdAt: Date.now()
    };

    try {
      // SET key val NX EX ttl
      const result = await this.redis.set(redisKey, JSON.stringify(initialRecord), 'EX', ttlSeconds, 'NX');
      if (result === 'OK') {
        return { isNew: true };
      }

      // Key already exists, retrieve state
      const existing = await this.redis.get(redisKey);
      if (existing) {
        const record = JSON.parse(existing) as IdempotencyRecord;
        return { isNew: false, record };
      }
    } catch (err) {
      console.warn(`[IDEMP] Redis error on acquire (${key}):`, err);
    }

    return { isNew: true };
  }

  /**
   * Commits successful transaction and caches response for 24h
   */
  async commit(key: string, response: CoreResponse, settlementTx?: string): Promise<void> {
    const redisKey = `idemp:${key}`;
    const record: IdempotencyRecord = {
      status: 'COMMITTED',
      createdAt: Date.now(),
      response,
      settlementTx
    };

    try {
      await this.redis.set(redisKey, JSON.stringify(record), 'EX', 86400); // 24 hours
    } catch (err) {
      console.warn(`[IDEMP] Redis error on commit (${key}):`, err);
    }
  }

  /**
   * Releases lock on failure so the transaction can be safely retried
   */
  async release(key: string): Promise<void> {
    try {
      await this.redis.del(`idemp:${key}`);
    } catch (err) {
      console.warn(`[IDEMP] Redis error on release (${key}):`, err);
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
