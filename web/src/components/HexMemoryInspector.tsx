'use client';

import React from 'react';
import { Binary, Eye, FileCode, Check } from 'lucide-react';
import { AccountData } from './AccountsPanel';

interface HexMemoryInspectorProps {
  account: AccountData | null;
}

export const HexMemoryInspector: React.FC<HexMemoryInspectorProps> = ({ account }) => {
  if (!account) {
    return (
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
        <Binary className="w-10 h-10 text-gray-600 mb-3" />
        <h3 className="font-mono-code text-sm font-semibold text-gray-300">
          Raw Memory Inspector Standby
        </h3>
        <p className="text-xs text-[#9CA3AF] max-w-xs mt-1 font-mono-code">
          Select an account record from the VSAM KSDS ledger to inspect raw binary buffer allocations.
        </p>
      </div>
    );
  }

  // Construct simulated 47-byte binary record layout for inspection
  const idAsciiHex = Array.from(Buffer.from(account.id.padEnd(10, ' ').slice(0, 10), 'ascii'))
    .map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0'));

  const balanceHex = account.rawBalanceHex || ['0x00', '0x00', '0x10', '0x00', '0x05', '0x0C'];

  const statusHex = ['0x' + Buffer.from(account.status || 'A', 'ascii')[0].toString(16).toUpperCase().padStart(2, '0')];

  const ownerAsciiHex = Array.from(Buffer.from(account.owner.padEnd(30, ' ').slice(0, 30), 'ascii'))
    .map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0'));

  const fullRecord = [...idAsciiHex, ...balanceHex, ...statusHex, ...ownerAsciiHex];

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 flex flex-col h-full shadow-lg space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-amber-400" />
          <h2 className="font-mono-code font-bold text-sm tracking-wide text-white">
            VSAM RECORD MEMORY ALLOCATION (47 BYTES)
          </h2>
        </div>
        <span className="font-mono-code text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
          ACCT: {account.id}
        </span>
      </div>

      {/* COMP-3 Nibble Breakdown Spotlight */}
      <div className="bg-[#0B0F17] border border-amber-500/40 rounded-lg p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono-code text-amber-400 font-semibold flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5" />
            COMP-3 PACKED DECIMAL SPOTLIGHT (PIC S9(9)V99)
          </span>
          <span className="text-xs font-mono-code text-emerald-400 font-bold">
            ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* 6 Bytes Hex Grid with Nibble labels */}
        <div className="grid grid-cols-6 gap-2 pt-1 font-mono-code text-center">
          {balanceHex.map((byteStr, idx) => {
            const byteVal = parseInt(byteStr, 16);
            const highNibble = (byteVal >> 4) & 0x0f;
            const lowNibble = byteVal & 0x0f;
            const isLastByte = idx === 5;

            return (
              <div key={idx} className="bg-[#111827] border border-[#1F2937] rounded p-2">
                <div className="text-[10px] text-gray-500">BYTE {idx}</div>
                <div className="text-sm font-bold text-amber-400 tracking-wider">
                  {byteStr}
                </div>
                <div className="text-[10px] text-blue-400 flex justify-center gap-1 mt-0.5 border-t border-gray-800 pt-0.5">
                  <span>{highNibble}</span>
                  <span className={isLastByte ? 'text-emerald-400 font-bold' : ''}>
                    {isLastByte ? (lowNibble === 0x0c ? 'C (+)' : 'D (-)') : lowNibble}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[11px] font-mono-code text-[#9CA3AF] flex items-center justify-between pt-1">
          <span>Nibble Mapping: 11 Digits BCD + 1 Sign Nibble (0xC=Pos, 0xD=Neg)</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <Check className="w-3 h-3" /> Zero IEEE-754 Roundoff Error
          </span>
        </div>
      </div>

      {/* Full 47-Byte Memory Dump Grid */}
      <div className="space-y-1.5 flex-1 flex flex-col font-mono-code text-xs">
        <div className="flex items-center justify-between text-[#9CA3AF] text-[11px]">
          <span>RAW BUFFER BYTES (OFFSET 0 TO 46)</span>
          <span>FORMAT: FIXED RECORD</span>
        </div>

        <div className="bg-[#0B0F17] border border-[#1F2937] rounded-lg p-3 overflow-x-auto flex-1 text-[11px] leading-relaxed">
          <div className="flex flex-wrap gap-1.5">
            {fullRecord.map((b, i) => {
              let color = 'text-gray-400 border-gray-800';
              let title = `Offset ${i}`;

              if (i < 10) {
                color = 'bg-blue-950/40 text-blue-400 border-blue-800/40';
                title = `ACCT-ID [Offset ${i}]: ${account.id[i] || ' '}`;
              } else if (i < 16) {
                color = 'bg-amber-950/40 text-amber-400 border-amber-800/60 font-bold';
                title = `ACCT-BALANCE COMP-3 [Offset ${i}]`;
              } else if (i === 16) {
                color = 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40 font-bold';
                title = `ACCT-STATUS [Offset 16]: ${account.status}`;
              } else {
                color = 'bg-purple-950/20 text-purple-300 border-purple-900/30';
                title = `ACCT-OWNER-NAME [Offset ${i}]`;
              }

              return (
                <span
                  key={i}
                  title={title}
                  className={`px-1.5 py-0.5 rounded border text-[11px] cursor-help transition hover:scale-105 ${color}`}
                >
                  {b}
                </span>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-gray-800 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/30 border border-blue-400"></span>
              <span className="text-blue-300">ACCT-ID (10B)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-400"></span>
              <span className="text-amber-300">COMP-3 BALANCE (6B)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-400"></span>
              <span className="text-emerald-300">STATUS (1B)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500/30 border border-purple-400"></span>
              <span className="text-purple-300">OWNER (30B)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
