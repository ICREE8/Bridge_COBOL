'use client';

import React from 'react';
import { Shield, ShieldAlert, Cpu, Database, Activity, RefreshCw, Zap } from 'lucide-react';

interface HeaderProps {
  role: 'OPERATOR' | 'AUDITOR';
  onRoleChange: (newRole: 'OPERATOR' | 'AUDITOR') => void;
  latencyMs: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  role,
  onRoleChange,
  latencyMs,
  onRefresh,
  isRefreshing
}) => {
  return (
    <header className="border-b border-[#1F2937] bg-[#0E131F]/90 backdrop-blur sticky top-0 z-50 px-6 py-3">
      <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Core Architecture Badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-blue-600 flex items-center justify-center font-mono-code font-bold text-black text-sm shadow-lg shadow-amber-500/20">
              CB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-code font-bold tracking-tight text-white text-base">
                  BRIDGE_COBOL
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-code bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  CICS/VSAM EMULATOR
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                GnuCOBOL Core &bull; Node.js Fastify Gateway &bull; Solana Devnet Rail
              </p>
            </div>
          </div>
        </div>

        {/* Live System Rail Statuses */}
        <div className="flex items-center gap-3 text-xs font-mono-code">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111827] border border-[#1F2937]">
            <Cpu className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-[#9CA3AF]">COBOL:</span>
            <span className="text-amber-400 font-semibold">fcntl LOCKED</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111827] border border-[#1F2937]">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[#9CA3AF]">REDIS:</span>
            <span className="text-blue-400 font-semibold">2PC IDEMP</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111827] border border-[#1F2937]">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[#9CA3AF]">SOLANA:</span>
            <span className="text-emerald-400 font-semibold">DEVNET CONFIRMED</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111827] border border-[#1F2937]">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[#9CA3AF]">LATENCY:</span>
            <span className="text-emerald-400 font-semibold">{latencyMs} ms</span>
          </div>
        </div>

        {/* RBAC Mode Selector & Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#111827] p-1 rounded-lg border border-[#1F2937]">
            <button
              onClick={() => onRoleChange('OPERATOR')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all ${
                role === 'OPERATOR'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Operator (Read/Write)
            </button>
            <button
              onClick={() => onRoleChange('AUDITOR')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all ${
                role === 'AUDITOR'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Auditor (Inspect Only)
            </button>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] text-[#9CA3AF] hover:text-white transition"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
