import { Comp3Codec, DefaultComp3Codec } from './comp3.js';
import { EbcdicCodec } from './ebcdic.js';

export const COMM_AREA_SIZE = 183;

export interface IngressPayload {
  action: 'CREATE' | 'READ' | 'DEBIT' | 'CREDIT' | 'SETSTS';
  accountId: string;
  amount?: number | string;
  ownerName?: string;
  newStatus?: 'A' | 'F' | 'C';
  idempotencyKey?: string;
  useEbcdic?: boolean;
}

export interface CoreResponse {
  returnCode: string;
  isSuccess: boolean;
  message: string;
  account?: {
    id: string;
    balance: number;
    balanceFormatted: string;
    status: string;
    owner: string;
    rawBalanceHex: string[];
  };
  rawBufferHex: string;
  rawBufferBytes: string[];
}

export class CopybookCodec {
  private comp3: Comp3Codec;

  constructor(comp3Codec: Comp3Codec = DefaultComp3Codec) {
    this.comp3 = comp3Codec;
  }

  /**
   * Encodes modern JSON ingress payload into fixed-width 183-byte CICS COMMAREA
   */
  encode(payload: IngressPayload): Buffer {
    const buffer = Buffer.alloc(COMM_AREA_SIZE, 0x20); // Initialize with ASCII spaces

    // 1. REQ-ACTION: PIC X(06) [Offset 0, Len 6]
    const actionStr = payload.action.padEnd(6, ' ').slice(0, 6);
    buffer.write(actionStr, 0, 6, 'ascii');

    // 2. REQ-ACCT-ID: PIC X(10) [Offset 6, Len 10]
    const acctIdStr = payload.accountId.padEnd(10, ' ').slice(0, 10);
    buffer.write(acctIdStr, 6, 10, 'ascii');

    // 3. REQ-AMOUNT: PIC S9(9)V99 COMP-3 [Offset 16, Len 6]
    const amountVal = payload.amount ?? 0;
    const comp3Buf = this.comp3.encode(amountVal);
    comp3Buf.copy(buffer, 16, 0, 6);

    // 4. REQ-NEW-STATUS: PIC X(01) [Offset 22, Len 1]
    const status = (payload.newStatus ?? 'A').slice(0, 1);
    buffer.write(status, 22, 1, 'ascii');

    // 5. REQ-OWNER-NAME: PIC X(30) [Offset 23, Len 30]
    const owner = (payload.ownerName ?? 'Standard Account').padEnd(30, ' ').slice(0, 30);
    buffer.write(owner, 23, 30, 'ascii');

    // 6. REQ-IDEMPOTENCY-KEY: PIC X(36) [Offset 53, Len 36]
    const idemp = (payload.idempotencyKey ?? '00000000-0000-0000-0000-000000000000').padEnd(36, ' ').slice(0, 36);
    buffer.write(idemp, 53, 36, 'ascii');

    return buffer;
  }

  /**
   * Decodes 183-byte COBOL response COMMAREA into modern JSON
   */
  decode(buffer: Buffer): CoreResponse {
    if (buffer.length < COMM_AREA_SIZE) {
      throw new Error(`Invalid COMMAREA buffer size: expected ${COMM_AREA_SIZE} bytes, got ${buffer.length}`);
    }

    // 1. Return Code: offset 89, len 2
    const returnCode = buffer.toString('ascii', 89, 91);
    const isSuccess = (returnCode === '00');

    // 2. Message: offset 91, len 45
    const message = buffer.toString('ascii', 91, 136).trim();

    // 3. Account ID: offset 136, len 10
    const id = buffer.toString('ascii', 136, 146).trim();

    // 4. Balance COMP-3: offset 146, len 6
    const balanceBuf = buffer.subarray(146, 152);
    const { value: balance, formatted: balanceFormatted } = this.comp3.decode(buffer, 146);
    const rawBalanceHex = Comp3Codec.toHexArray(balanceBuf);

    // 5. Status: offset 152, len 1
    const status = buffer.toString('ascii', 152, 153);

    // 6. Owner: offset 153, len 30
    const owner = buffer.toString('ascii', 153, 183).trim();

    const rawBufferHex = buffer.toString('hex').toUpperCase();
    const rawBufferBytes = Array.from(buffer).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0'));

    const res: CoreResponse = {
      returnCode,
      isSuccess,
      message,
      rawBufferHex,
      rawBufferBytes
    };

    if (id && id.length > 0) {
      res.account = {
        id,
        balance,
        balanceFormatted,
        status,
        owner,
        rawBalanceHex
      };
    }

    return res;
  }
}
