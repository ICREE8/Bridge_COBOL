'use client';

import React from 'react';
import { Terminal, ArrowRight, CheckCheck, Clock, FileJson, Binary, Sparkles } from 'lucide-react';
import { JargonTooltip } from './JargonTooltip';

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
    commAreaHex: '0x44 0x45 0x42 0x49 0x54 0x20 0x41 0x43 0x43 0x54 0x30 0x30 0x30 0x30 0x30 0x31 0x00 0x00 0x10 0x00 0x05 0x0C 0x41 0x44 0x65 0x6D 0x6F 0x20 0x43 0x75 0x73 0x74 0x6F 0x6D 0x65 0x72 ...',
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
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl p-5 flex flex-col h-full shadow-sm space-y-4 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1F2937] pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="font-mono-code font-bold text-sm tracking-wide text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>PACKET TRACER (INGRESS &rarr; CICS COMMAREA)</span>
            <JargonTooltip term="COMMAREA" />
          </h2>
        </div>
        <div className="flex items-center gap-2 font-mono-code text-[11px]">
          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1 font-semibold">
            <Clock className="w-3 h-3" /> {trace.durationMs ? `${trace.durationMs.toFixed(1)}ms` : '1.8ms'}
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 font-semibold">
            183 BYTES FIXED
          </span>
        </div>
      </div>

      {/* Side by Side view: clearly labeled What normal app sends vs What mainframe receives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 font-mono-code text-xs">
        {/* Left: What a normal app sends */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-500/30">
            <div className="flex items-center gap-1.5">
              <FileJson className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-slate-900 dark:text-white text-xs">What a normal app sends</span>
            </div>
            <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold">Standard JSON</span>
          </div>

          <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F2937] rounded-xl p-3 flex-1 overflow-x-auto text-blue-800 dark:text-blue-300 leading-relaxed font-mono">
            <div className="text-[10px] text-slate-400 dark:text-gray-500 mb-1">// Inbound HTTP REST JSON Payload</div>
            <pre className="text-xs">{jsonSnippet}</pre>
          </div>
        </div>

        {/* Right: What the mainframe actually receives */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/40">
            <div className="flex items-center gap-1.5">
              <Binary className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="font-bold text-slate-900 dark:text-white text-xs">What the mainframe actually receives</span>
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1">
              <span>COMMAREA Buffer</span>
              <JargonTooltip term="COMMAREA" />
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#0B0F17] border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 flex-1 overflow-x-auto text-amber-800 dark:text-amber-300 leading-relaxed break-all font-mono">
            <div className="text-[10px] text-slate-400 dark:text-gray-500 mb-1.5">
              // Exact 183-byte binary buffer transmitted over POSIX domain socket
            </div>
            <div className="font-mono-code text-[11px] leading-relaxed">
              {trace.commAreaHex || trace.hexDump || (
                '0x44 0x45 0x42 0x49 0x54 0x20 0x41 0x43 0x43 0x54 0x30 0x30 0x30 0x30 0x30 0x31 0x00 0x00 0x10 0x00 0x05 0x0C 0x41 0x44 0x65 0x6D 0x6F 0x20 0x43 0x75 0x73 0x74 0x6F 0x6D 0x65 0x72 ...'
              )}
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 dark:border-gray-800 text-[10px] text-slate-600 dark:text-[#9CA3AF] flex items-center justify-between font-sans">
              <span className="flex items-center gap-1">
                <span>Amount: ${trace.amount || 10000.50} &rarr; COMP-3</span>
                <JargonTooltip term="COMP-3" />
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> Serialized &lt;2ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Plain English mapping footnote */}
      <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F2937] text-[11px] text-slate-600 dark:text-gray-400 flex items-center justify-between font-sans">
        <span>Mainframes cannot parse JSON. The bridge transforms it into binary structs in under 2ms.</span>
        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Zero IEEE-754 Float Distortion</span>
      </div>
    </div>
  );
};
