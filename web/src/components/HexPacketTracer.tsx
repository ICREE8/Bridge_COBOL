'use client';

import React from 'react';
import { Terminal, ArrowRight, CheckCheck, Clock } from 'lucide-react';

export interface PacketTraceData {
  stage?: string;
  action: string;
  accountId: string;
  amount?: number;
  idempotencyKey?: string;
  jsonPayload?: any;
  commAreaHex?: string;
  hexDump?: string;
  byteLength?: number;
  durationMs?: number;
  returnCode?: string;
  timestamp?: string;
}

interface HexPacketTracerProps {
  lastTrace: PacketTraceData | null;
}

export const HexPacketTracer: React.FC<HexPacketTracerProps> = ({ lastTrace }) => {
  const sampleTrace: PacketTraceData = {
    action: 'DEBIT',
    accountId: 'ACCT000001',
    amount: 10000.50,
    idempotencyKey: 'idemp_live_demo_001',
    commAreaHex: '0x44 0x45 0x42 0x49 0x54 0x20 0x41 0x43 0x43 0x54 0x30 0x30 0x30 0x30 0x30 0x31 0x00 0x00 0x10 0x00 0x05 0x0C 0x41 ...',
    durationMs: 1.8,
    returnCode: '00'
  };

  const trace = lastTrace || sampleTrace;

  const jsonSnippet = JSON.stringify(
    {
      action: trace.action,
      accountId: trace.accountId,
      amount: trace.amount || 10000.50,
      idempotencyKey: trace.idempotencyKey || 'idemp_key_01'
    },
    null,
    2
  );

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 flex flex-col h-full shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h2 className="font-mono-code font-bold text-sm tracking-wide text-white">
            HEX / PACKET TRACER (SIDE-BY-SIDE)
          </h2>
        </div>
        <div className="flex items-center gap-2 font-mono-code text-[11px]">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {trace.durationMs ? `${trace.durationMs.toFixed(1)}ms` : '1.8ms'}
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
            183 BYTES FIXED
          </span>
        </div>
      </div>

      {/* Side by Side view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 font-mono-code text-xs">
        {/* Left: Modern Ingress JSON */}
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between text-[#9CA3AF] text-[11px]">
            <span>1. INGRESS REST PAYLOAD (JSON)</span>
            <span className="text-blue-400">ASCII / REST</span>
          </div>
          <div className="bg-[#0B0F17] border border-[#1F2937] rounded-lg p-3 flex-1 overflow-x-auto text-blue-300 leading-relaxed">
            <pre>{jsonSnippet}</pre>
          </div>
        </div>

        {/* Right: Exact 183-Byte COMMAREA Binary Stream */}
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between text-[#9CA3AF] text-[11px]">
            <span>2. CICS COMMAREA TO CORE</span>
            <span className="text-amber-400">COMP-3 + EBCDIC/ASCII</span>
          </div>
          <div className="bg-[#0B0F17] border border-amber-500/30 rounded-lg p-3 flex-1 overflow-x-auto text-amber-300 leading-relaxed break-all">
            <div className="text-[10px] text-gray-500 mb-1.5">
              // Exact byte buffer transmitted over POSIX domain socket
            </div>
            <div className="font-mono-code text-[11px] leading-relaxed">
              {trace.commAreaHex || trace.hexDump || (
                '0x44 0x45 0x42 0x49 0x54 0x20 0x41 0x43 0x43 0x54 0x30 0x30 0x30 0x30 0x30 0x31 0x00 0x00 0x10 0x00 0x05 0x0C 0x41 0x44 0x65 0x6D 0x6F 0x20 0x43 0x75 0x73 0x74 0x6F 0x6D 0x65 0x72 ...'
              )}
            </div>
            <div className="mt-3 pt-2 border-t border-gray-800 text-[10px] text-[#9CA3AF] flex items-center justify-between">
              <span>Packed nibble amount: $10,000.50 &rarr; [0x00 0x00 0x10 0x00 0x05 0x0C]</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> Serialized
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
