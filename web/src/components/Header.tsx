'use client';

import React from 'react';
import { Shield, ShieldAlert, Cpu, Activity, RefreshCw, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { JargonTooltip } from './JargonTooltip';

interface HeaderProps {
  role: 'OPERATOR' | 'AUDITOR';
  onRoleChange: (newRole: 'OPERATOR' | 'AUDITOR') => void;
  latencyMs: number;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeLockAccount?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  role,
  onRoleChange,
  latencyMs,
  onRefresh,
  isRefreshing,
  activeLockAccount
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-slate-200 dark:border-[#1F2937] bg-white/95 dark:bg-[#0E131F]/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-3 transition-colors duration-200">
      <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Clean Institutional Identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 dark:bg-gradient-to-br dark:from-amber-500 dark:to-blue-600 flex items-center justify-center font-mono-code font-bold text-white dark:text-black text-sm shadow-sm">
            CB
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-slate-900 dark:text-white text-base">
                Bridge_COBOL
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-semibold bg-blue-50 dark:bg-amber-500/10 text-blue-700 dark:text-amber-400 border border-blue-200 dark:border-amber-500/30">
                Core Banking Modernization
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">
              Mainframe VSAM Ledger &bull; Fastify Gateway &bull; Solana Settlement Rail
            </p>
          </div>
        </div>

        {/* Streamlined Top Bar: Exactly the 3 Most Important Status Indicators */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono-code">
          {/* 1. COBOL Engine Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937]">
            <Cpu className={`w-3.5 h-3.5 ${activeLockAccount ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span className="text-slate-500 dark:text-[#9CA3AF]">COBOL Core:</span>
            <span className={`font-semibold ${activeLockAccount ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {activeLockAccount ? 'Locked (Writing)' : 'Online (Idle)'}
            </span>
            <JargonTooltip term="fcntl lock" />
          </div>

          {/* 2. Latency */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937]">
            <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-emerald-400" />
            <span className="text-slate-500 dark:text-[#9CA3AF]">Latency:</span>
            <span className="text-blue-700 dark:text-emerald-400 font-bold">{latencyMs} ms</span>
          </div>

          {/* 3. Role Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-[#111827] p-1 rounded-lg border border-slate-200 dark:border-[#1F2937]">
            <button
              onClick={() => onRoleChange('OPERATOR')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                role === 'OPERATOR'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Operator
            </button>
            <button
              onClick={() => onRoleChange('AUDITOR')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                role === 'AUDITOR'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Auditor
            </button>
          </div>

          {/* Sun / Moon Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#111827] dark:hover:bg-[#1F2937] border border-slate-200 dark:border-[#1F2937] text-slate-700 dark:text-gray-300 transition"
            title={theme === 'light' ? 'Switch to Engineer / Terminal Dark Mode' : 'Switch to Clean Institutional Light Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-4 h-4 text-slate-700" />
                <span className="hidden sm:inline text-xs font-sans font-medium">Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline text-xs font-sans font-medium">Light Mode</span>
              </>
            )}
          </button>

          {/* Refresh Ledger Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#111827] dark:hover:bg-[#1F2937] border border-slate-200 dark:border-[#1F2937] text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white transition"
            title="Refresh Ledger Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
