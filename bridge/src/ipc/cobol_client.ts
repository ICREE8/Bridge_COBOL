import * as net from 'net';
import * as path from 'path';
import * as fs from 'fs';
import { COMM_AREA_SIZE } from '../codec/copybook.js';

export interface CobolClientConfig {
  socketPath?: string;
  tcpHost?: string;
  tcpPort?: number;
  timeoutMs?: number;
}

export class CobolIpcClient {
  private socketPath: string;
  private tcpHost: string;
  private tcpPort: number;
  private timeoutMs: number;

  constructor(config: CobolClientConfig = {}) {
    this.socketPath = config.socketPath ?? process.env.COBOL_SOCKET_PATH ?? '/tmp/bankcore.sock';
    this.tcpHost = config.tcpHost ?? process.env.COBOL_TCP_HOST ?? '127.0.0.1';
    this.tcpPort = config.tcpPort ?? (process.env.COBOL_TCP_PORT ? parseInt(process.env.COBOL_TCP_PORT) : 9999);
    this.timeoutMs = config.timeoutMs ?? 5000;
  }

  /**
   * Sends raw 183-byte buffer to COBOL core via domain socket or TCP, and reads 183-byte response.
   */
  async execute(buffer: Buffer): Promise<Buffer> {
    if (buffer.length !== COMM_AREA_SIZE) {
      throw new Error(`Invalid buffer size: expected ${COMM_AREA_SIZE}, got ${buffer.length}`);
    }

    // Attempt Unix Domain Socket first if file exists
    if (fs.existsSync(this.socketPath)) {
      try {
        return await this.sendViaSocket({ path: this.socketPath }, buffer);
      } catch (err) {
        console.warn(`[IPC] Unix socket failed, attempting TCP fallback...`, err);
      }
    }

    // Fallback to TCP (useful inside Docker Compose network)
    return await this.sendViaSocket({ host: this.tcpHost, port: this.tcpPort }, buffer);
  }

  private sendViaSocket(connectOpts: net.SocketConnectOpts, buffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let timer: NodeJS.Timeout;
      const chunks: Buffer[] = [];
      let totalReceived = 0;

      timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`COBOL IPC connection timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      socket.connect(connectOpts, () => {
        socket.write(buffer);
      });

      socket.on('data', (data) => {
        chunks.push(data);
        totalReceived += data.length;
        if (totalReceived >= COMM_AREA_SIZE) {
          clearTimeout(timer);
          socket.end();
          const response = Buffer.concat(chunks, COMM_AREA_SIZE);
          resolve(response);
        }
      });

      socket.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      socket.on('close', () => {
        clearTimeout(timer);
        if (totalReceived < COMM_AREA_SIZE && totalReceived > 0) {
          reject(new Error(`Incomplete response from COBOL: got ${totalReceived} bytes, expected ${COMM_AREA_SIZE}`));
        }
      });
    });
  }
}
