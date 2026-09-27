'use client';

import React from 'react';
import { Binary, Eye, FileCode, Check, Info } from 'lucide-react';
import { AccountData } from './AccountsPanel';
import { JargonTooltip } from './JargonTooltip';

interface HexMemoryInspectorProps {
  account: AccountData | null;
}

export const HexMemoryInspector: React.FC<HexMemoryInspectorProps> = ({ account }) => {
  if (!account) {
    return (
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl p-8 h-full flex flex-col items-center justify-center text-center shadow-sm">
        <Binary className="w-12 h-12 text-slate-300 dark:text-gray-600 mb-3" />
        <h3 className="font-mono-code text-sm font-semibold text-slate-800 dark:text-gray-300">
          Raw Memory Inspector Standby
        </h3>
        <p className="text-xs text-slate-500 dark:text-[#9CA3AF] max-w-sm mt-1.5 leading-relaxed">
          Select an account record from the VSAM ledger on the left to inspect its exact 47-byte binary memory allocation.
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
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl p-5 flex flex-col h-full shadow-sm space-y-4 transition-colors duration-200">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1F2937] pb-3">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h2 className="font-mono-code font-bold text-sm tracking-wide text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>VSAM RECORD MEMORY (47 BYTES)</span>
            <JargonTooltip term="VSAM KSDS" />
          </h2>
        </div>
        <span className="font-mono-code text-xs px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-amber-500/10 text-blue-700 dark:text-amber-400 border border-blue-200 dark:border-amber-500/30 font-semibold">
          ACCT: {account.id}
        </span>
      </div>

      {/* COMP-3 Nibble Breakdown Spotlight */}
      <div className="bg-slate-50 dark:bg-[#0B0F17] border border-amber-200 dark:border-amber-500/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono-code text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5" />
            <span>ACCOUNT BALANCE (COMP-3 PACKED)</span>
            <JargonTooltip term="COMP-3" />
          </span>
          <span className="text-xs font-mono-code text-emerald-700 dark:text-emerald-400 font-bold">
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
              <div key={idx} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-lg p-2 hover:border-amber-400 transition shadow-xs">
                <div className="text-[10px] text-slate-400 dark:text-gray-500">BYTE {idx}</div>
                <div className="text-sm font-bold text-amber-600 dark:text-amber-400 tracking-wider my-0.5">
                  {byteStr}
                </div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 flex justify-center gap-1 border-t border-slate-100 dark:border-gray-800 pt-0.5 font-semibold">
                  <span>{highNibble}</span>
                  <span className={isLastByte ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                    {isLastByte ? (lowNibble === 0x0c ? 'C (+)' : 'D (-)') : lowNibble}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[11px] font-mono-code text-slate-600 dark:text-[#9CA3AF] flex flex-wrap items-center justify-between gap-1 pt-1 font-sans">
          <span>Nibble Mapping: 11 Digits BCD + 1 Sign Nibble (0xC=Positive, 0xD=Negative)</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <Check className="w-3 h-3" /> Zero IEEE-754 Roundoff Error
          </span>
        </div>
      </div>

      {/* Full 47-Byte Memory Dump Grid */}
      <div className="space-y-1.5 flex-1 flex flex-col font-mono-code text-xs">
        <div className="flex items-center justify-between text-slate-500 dark:text-[#9CA3AF] text-[11px]">
          <span>RAW BUFFER BYTES (OFFSETS 0 TO 46)</span>
          <span>FORMAT: FIXED RECORD</span>
        </div>

        <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F2937] rounded-xl p-3 overflow-x-auto flex-1 text-[11px] leading-relaxed">
          <div className="flex flex-wrap gap-1.5">
            {fullRecord.map((b, i) => {
              let color = 'bg-white text-slate-600 border-slate-200 dark:bg-transparent dark:text-gray-400 dark:border-gray-800';
              let title = `Offset ${i}`;

              if (i < 10) {
                color = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40';
                title = `ACCT-ID [Offset ${i}]: ${account.id[i] || ' '}`;
              } else if (i < 16) {
                color = 'bg-amber-50 text-amber-700 border-amber-300 font-bold dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60';
                title = `ACCT-BALANCE COMP-3 [Offset ${i}]`;
              } else if (i === 16) {
                color = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40';
                title = `ACCT-STATUS [Offset 16]: ${account.status}`;
              } else {
                color = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-900/30';
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
          <div className="flex flex-wrap items-center gap-4 mt-3 pt-2.5 border-t border-slate-200 dark:border-gray-800 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 dark:bg-blue-500/30 border border-blue-400"></span>
              <span className="text-blue-800 dark:text-blue-300 font-medium">ACCT-ID (10B)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 dark:bg-amber-500/30 border border-amber-400"></span>
              <span className="text-amber-800 dark:text-amber-300 font-medium">COMP-3 BALANCE (6B)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 dark:bg-emerald-500/30 border border-emerald-400"></span>
              <span className="text-emerald-800 dark:text-emerald-300 font-medium">STATUS (1B)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-100 dark:bg-purple-500/30 border border-purple-400"></span>
              <span className="text-purple-800 dark:text-purple-300 font-medium">OWNER (30B)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
