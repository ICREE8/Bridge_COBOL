import { FastifyReply } from 'fastify';

export interface AuditEvent {
  id: string;
  type: 'PACKET_TRACE' | 'LOCK_EVENT' | 'SETTLEMENT_EVENT' | 'AUDIT_RECEIPT';
  timestamp: string;
  data: any;
}

export class SseStreamManager {
  private clients: Set<FastifyReply> = new Set();
  private history: AuditEvent[] = [];
  private maxHistory: number = 100;

  addClient(reply: FastifyReply) {
    this.clients.add(reply);

    // Send headers for SSE
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send recent history
    for (const event of this.history.slice(-20)) {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    reply.raw.on('close', () => {
      this.clients.delete(reply);
    });
  }

  broadcast(type: AuditEvent['type'], data: any) {
    const event: AuditEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      timestamp: new Date().toISOString(),
      data
    };

    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      try {
        client.raw.write(payload);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  getHistory(): AuditEvent[] {
    return [...this.history];
  }
}

export const GlobalSseManager = new SseStreamManager();
