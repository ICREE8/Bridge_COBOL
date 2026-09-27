'use client';

import React from 'react';
import { 
  Binary, 
  Terminal, 
  ScrollText, 
  Zap, 
  ArrowRight, 
  Eye, 
  Layers, 
  Sparkles,
  MousePointerClick,
  Info
} from 'lucide-react';
import { AccountData } from './AccountsPanel';
import { HexMemoryInspector } from './HexMemoryInspector';
import { HexPacketTracer, PacketTraceData } from './HexPacketTracer';
import { SolanaSettlementPanel, SettlementData } from './SolanaSettlementPanel';
import { AuditLogFeed, AuditEventItem } from './AuditLogFeed';

export type ContextTab = 'STANDBY' | 'ACCOUNT_MEMORY' | 'TRANSFER_DETAILS' | 'AUDIT_LOG';

interface ContextualDetailPanelProps {
  activeTab: ContextTab;
  onTabChange: (tab: ContextTab) => void;
  selectedAccount: AccountData | null;
  lastTrace: PacketTraceData | null;
  lastSettlement: SettlementData | null;
  auditEvents: AuditEventItem[];
  onQuickInspectAccount?: () => void;
}

export const ContextualDetailPanel: React.FC<ContextualDetailPanelProps> = ({
  activeTab,
  onTabChange,
  selectedAccount,
  lastTrace,
  lastSettlement,
  auditEvents,
  onQuickInspectAccount
}) => {
  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl flex flex-col h-full shadow-sm transition-colors duration-200 overflow-hidden">
      {/* Tab Switcher Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-[#1F2937] bg-slate-50/60 dark:bg-[#0E131F] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F2937] shadow-xs">
          {/* Tab 1: Hex Memory */}
          <button
            onClick={() => onTabChange('ACCOUNT_MEMORY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono-code transition ${
              activeTab === 'ACCOUNT_MEMORY'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 font-bold shadow-xs'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Binary className="w-3.5 h-3.5" />
            <span>Memory (Hex)</span>
            {selectedAccount && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-black/40 text-blue-700 dark:text-amber-400 font-semibold">
                {selectedAccount.id}
              </span>
            )}
          </button>

          {/* Tab 2: Packet Tracer & Settlement */}
          <button
            onClick={() => onTabChange('TRANSFER_DETAILS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono-code transition ${
              activeTab === 'TRANSFER_DETAILS'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 font-bold shadow-xs'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Packet & Settle</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-black/40 text-emerald-700 dark:text-emerald-400 font-semibold">
              183B
            </span>
          </button>

          {/* Tab 3: Live Audit Log */}
          <button
            onClick={() => onTabChange('AUDIT_LOG')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono-code transition ${
              activeTab === 'AUDIT_LOG'
                ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40 font-bold shadow-xs'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>Audit Feed</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 font-semibold">
              {auditEvents.length}
            </span>
          </button>
        </div>

        {activeTab !== 'STANDBY' && (
          <button
            onClick={() => onTabChange('STANDBY')}
            className="text-[11px] font-mono-code text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-gray-800 transition"
          >
            Reset Focus
          </button>
        )}
      </div>

      {/* Main Contextual Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 1. Friendly Standby / Empty State */}
        {activeTab === 'STANDBY' && (
          <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-6 animate-in fade-in duration-150">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
              <MousePointerClick className="w-8 h-8 animate-pulse" />
            </div>

            <div className="max-w-md space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Select an account or run a transfer to inspect the binary details
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 leading-relaxed font-sans">
                This inspector reveals what happens beneath the surface when modern APIs interact with legacy mainframe COBOL ledgers.
              </p>
            </div>

            {/* 3 Quick Action Discovery Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-left">
              <div
                onClick={() => {
                  if (onQuickInspectAccount) onQuickInspectAccount();
                  else onTabChange('ACCOUNT_MEMORY');
                }}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1F2937] bg-slate-50/70 dark:bg-[#0B0F17] hover:border-blue-400 dark:hover:border-blue-500 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Binary className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  Account Memory
                </div>
                <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-1 leading-snug">
                  Inspect 47-byte fixed VSAM record & COMP-3 nibbles.
                </div>
              </div>

              <div
                onClick={() => onTabChange('TRANSFER_DETAILS')}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1F2937] bg-slate-50/70 dark:bg-[#0B0F17] hover:border-emerald-400 dark:hover:border-emerald-500 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  Packet & Settle
                </div>
                <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-1 leading-snug">
                  Side-by-side JSON to COMMAREA buffer & Solana proof.
                </div>
              </div>

              <div
                onClick={() => onTabChange('AUDIT_LOG')}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1F2937] bg-slate-50/70 dark:bg-[#0B0F17] hover:border-purple-400 dark:hover:border-purple-500 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <ScrollText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition" />
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  Audit Feed
                </div>
                <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-1 leading-snug">
                  Streaming SSE receipts & POSIX lock events.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Account Memory View */}
        {activeTab === 'ACCOUNT_MEMORY' && (
          <div className="h-full animate-in fade-in duration-150">
            <HexMemoryInspector account={selectedAccount} />
          </div>
        )}

        {/* 3. Transfer Details View (Side-by-Side Packet Tracer + Solana Settlement) */}
        {activeTab === 'TRANSFER_DETAILS' && (
          <div className="h-full space-y-4 animate-in fade-in duration-150">
            <HexPacketTracer lastTrace={lastTrace} />
            <SolanaSettlementPanel settlement={lastSettlement} />
          </div>
        )}

        {/* 4. Live Audit Log View */}
        {activeTab === 'AUDIT_LOG' && (
          <div className="h-full animate-in fade-in duration-150">
            <AuditLogFeed events={auditEvents} />
          </div>
        )}
      </div>
    </div>
  );
};
