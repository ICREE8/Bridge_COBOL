'use client';

import React, { useState } from 'react';
import { Landmark, User, Lock, Plus, AlertCircle, ChevronRight, X, Sparkles } from 'lucide-react';
import { JargonTooltip } from './JargonTooltip';

export interface AccountData {
  id: string;
  balance: number;
  balanceFormatted: string;
  status: string;
  owner: string;
  rawBalanceHex: string[];
}

interface AccountsPanelProps {
  accounts: AccountData[];
  selectedAccountId: string | null;
  onSelectAccount: (account: AccountData) => void;
  onCreateAccount: (id: string, initialBalance: number, owner: string) => Promise<void>;
  role: 'OPERATOR' | 'AUDITOR';
  activeLockAccount: string | null;
}

export const AccountsPanel: React.FC<AccountsPanelProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  onCreateAccount,
  role,
  activeLockAccount
}) => {
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [newId, setNewId] = useState('');
  const [newBalance, setNewBalance] = useState('10000.50');
  const [newOwner, setNewOwner] = useState('Enterprise Corp');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onCreateAccount(newId.trim(), parseFloat(newBalance) || 0, newOwner.trim());
      setShowCreateInline(false);
      setNewId('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl flex flex-col h-full shadow-sm transition-colors duration-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1F2937] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="font-mono-code font-bold text-sm tracking-wide text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>MANAGED ACCOUNTS</span>
            <JargonTooltip term="VSAM KSDS" />
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono-code bg-slate-100 dark:bg-blue-500/10 text-slate-700 dark:text-blue-400 border border-slate-200 dark:border-blue-500/20 font-semibold">
            {accounts.length}
          </span>
        </div>

        {role === 'OPERATOR' && (
          <button
            onClick={() => setShowCreateInline(!showCreateInline)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition"
          >
            {showCreateInline ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showCreateInline ? 'Close' : 'New Account'}</span>
          </button>
        )}
      </div>

      {/* Inline Account Creation Drawer */}
      {showCreateInline && (
        <div className="p-4 bg-slate-50 dark:bg-[#0B0F17] border-b border-slate-200 dark:border-[#1F2937] animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Initialize VSAM Account Record</span>
            </span>
            <span className="text-[10px] font-mono-code text-slate-500 dark:text-gray-500">Fixed 47-Byte Allocation</span>
          </div>

          {errorMsg && (
            <div className="mb-3 p-2.5 bg-rose-50 dark:bg-red-950/40 border border-rose-200 dark:border-red-500/50 rounded-lg text-rose-700 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-3 font-mono-code text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 dark:text-[#9CA3AF] text-[10px] mb-1 font-sans font-medium">ACCOUNT ID (10B)</label>
                <input
                  type="text"
                  maxLength={10}
                  value={newId}
                  onChange={(e) => setNewId(e.target.value.toUpperCase())}
                  placeholder="ACCT000002"
                  className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-[#9CA3AF] text-[10px] mb-1 font-sans font-medium">
                  BALANCE ($ COMP-3) <JargonTooltip term="COMP-3" />
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-[#9CA3AF] text-[10px] mb-1 font-sans font-medium">OWNER NAME (30B)</label>
              <input
                type="text"
                maxLength={30}
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-1 font-sans">
              <button
                type="button"
                onClick={() => setShowCreateInline(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
              >
                {isSubmitting ? 'Writing to KSDS...' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account List Table with Click-to-Focus visual cue */}
      <div className="overflow-y-auto flex-1 p-3 space-y-2">
        <div className="text-[11px] text-slate-500 dark:text-[#9CA3AF] font-mono-code px-1 flex items-center justify-between">
          <span>VSAM KSDS RECORDS</span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold">CLICK TO INSPECT</span>
        </div>

        {accounts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-[#9CA3AF] font-mono-code text-xs">
            No VSAM records loaded. Initialize via Fastify gateway.
          </div>
        ) : (
          accounts.map((acct) => {
            const isSelected = selectedAccountId === acct.id;
            const isLocked = activeLockAccount === acct.id;

            return (
              <div
                key={acct.id}
                onClick={() => onSelectAccount(acct)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between relative group ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-sm ring-1 ring-blue-500/50'
                    : 'bg-white dark:bg-[#0B0F17]/70 border-slate-200 dark:border-[#1F2937] hover:border-slate-300 dark:hover:border-gray-600 hover:bg-slate-50/50 dark:hover:bg-[#0B0F17]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-code font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition">
                      {acct.id}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono-code font-semibold ${
                        acct.status === 'A'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                      }`}
                    >
                      {acct.status === 'A' ? 'ACTIVE' : 'FROZEN'}
                    </span>
                    {isLocked && (
                      <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono-code bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40 animate-pulse font-semibold">
                        <Lock className="w-3 h-3" />
                        LOCKED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#9CA3AF]">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{acct.owner}</span>
                  </div>
                </div>

                <div className="text-right space-y-1 flex flex-col items-end">
                  <div className="font-mono-code font-bold text-base text-emerald-700 dark:text-emerald-400">
                    ${acct.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono-code text-amber-700 dark:text-amber-400 font-medium">
                    <span>COMP-3</span>
                    <ChevronRight className={`w-3.5 h-3.5 transition ${isSelected ? 'text-blue-600 dark:text-blue-400 translate-x-0.5' : 'text-slate-400 dark:text-gray-600'}`} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2.5 border-t border-slate-100 dark:border-[#1F2937] text-[11px] font-mono-code text-slate-500 dark:text-gray-500 bg-slate-50/50 dark:bg-[#0B0F17]/40 flex items-center justify-between">
        <span>KSDS Key Index: Account ID</span>
        <span className="text-blue-600 dark:text-blue-400 font-semibold">Click row &rarr; Inspects Memory</span>
      </div>
    </div>
  );
};
