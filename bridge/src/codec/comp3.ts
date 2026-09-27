/**
 * COMP-3 (Packed Decimal) Serializer & Deserializer
 * Exact BCD bit-level manipulation with zero floating-point roundoff.
 * 
 * In IBM Enterprise COBOL and GnuCOBOL:
 * PIC S9(9)V99 COMP-3 stores 11 digits + 1 sign nibble = 12 nibbles = 6 bytes.
 * Sign nibble:
 *   0x0C (12) -> Positive (+)
 *   0x0D (13) -> Negative (-)
 *   0x0F (15) -> Unsigned / Positive default
 */

export interface Comp3Options {
  totalDigits?: number;    // Total number of digits (default: 11 for S9(9)V99)
  decimalPlaces?: number;  // Implied decimal places (default: 2 for V99)
}

export class Comp3Codec {
  public readonly totalDigits: number;
  public readonly decimalPlaces: number;
  public readonly byteLength: number;

  constructor(options: Comp3Options = {}) {
    this.totalDigits = options.totalDigits ?? 11;
    this.decimalPlaces = options.decimalPlaces ?? 2;
    // Each byte holds 2 nibbles. 1 nibble is reserved for sign.
    this.byteLength = Math.ceil((this.totalDigits + 1) / 2);
  }

  /**
   * Encodes a currency amount or numeric value into COMP-3 bytes.
   * Uses BigInt integer cents to eliminate IEEE-754 precision issues.
   */
  encode(amount: number | string | bigint): Buffer {
    let sign = 0x0c; // Default positive
    let cents: bigint;

    if (typeof amount === 'bigint') {
      cents = amount;
    } else if (typeof amount === 'string') {
      const clean = amount.trim();
      const isNeg = clean.startsWith('-');
      const numPart = isNeg ? clean.substring(1) : clean;
      const parts = numPart.split('.');
      const intPart = parts[0] || '0';
      const decPart = (parts[1] || '').padEnd(this.decimalPlaces, '0').slice(0, this.decimalPlaces);
      cents = BigInt(intPart + decPart);
      if (isNeg) cents = -cents;
    } else {
      // number: multiply by 10^decimals and round
      const factor = Math.pow(10, this.decimalPlaces);
      cents = BigInt(Math.round(amount * factor));
    }

    if (cents < 0n) {
      sign = 0x0d; // Negative
      cents = -cents;
    }

    // Convert to zero-padded digit string of exact length
    const digitsStr = cents.toString().padStart(this.totalDigits, '0');
    if (digitsStr.length > this.totalDigits) {
      throw new Error(`Numeric overflow: ${amount} exceeds ${this.totalDigits} digits for COMP-3`);
    }

    const buffer = Buffer.alloc(this.byteLength);
    // Combine digits + sign nibble into pairs
    const nibbleStr = digitsStr + sign.toString(16).toUpperCase();

    for (let i = 0; i < this.byteLength; i++) {
      const highNibble = parseInt(nibbleStr[i * 2], 16);
      const lowNibble = parseInt(nibbleStr[i * 2 + 1], 16);
      buffer[i] = (highNibble << 4) | lowNibble;
    }

    return buffer;
  }

  /**
   * Decodes a COMP-3 byte buffer into a precise signed number and string.
   */
  decode(buffer: Buffer, offset: number = 0): { value: number; formatted: string; isNegative: boolean } {
    if (buffer.length < offset + this.byteLength) {
      throw new Error(`Buffer underflow: expected at least ${this.byteLength} bytes at offset ${offset}`);
    }

    let digits = '';
    for (let i = 0; i < this.byteLength; i++) {
      const byte = buffer[offset + i];
      const high = (byte >> 4) & 0x0f;
      const low = byte & 0x0f;

      if (i === this.byteLength - 1) {
        // Last byte contains last digit and sign nibble
        digits += high.toString();
        const signNibble = low;
        const isNegative = (signNibble === 0x0d);

        let intPart = digits.slice(0, -this.decimalPlaces) || '0';
        let decPart = digits.slice(-this.decimalPlaces);
        if (this.decimalPlaces === 0) {
          intPart = digits;
          decPart = '';
        }

        const formatted = (isNegative ? '-' : '') + intPart + (decPart ? '.' + decPart : '');
        const value = parseFloat(formatted);

        return { value, formatted, isNegative };
      } else {
        digits += high.toString() + low.toString();
      }
    }

    throw new Error('Unexpected error decoding COMP-3 buffer');
  }

  /**
   * Formats a buffer as a readable hex dump: [0x00, 0x00, 0x10, ...]
   */
  static toHexArray(buf: Buffer): string[] {
    return Array.from(buf).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0'));
  }
}

// Pre-configured default codec for PIC S9(9)V99 COMP-3
export const DefaultComp3Codec = new Comp3Codec({ totalDigits: 11, decimalPlaces: 2 });
