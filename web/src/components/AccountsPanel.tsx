'use client';

import React, { useState } from 'react';
import { Landmark, User, CheckCircle2, Lock, Plus, AlertCircle } from 'lucide-react';

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
  const [showCreateModal, setShowCreateModal] = useState(false);
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
      setShowCreateModal(false);
      setNewId('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1F2937] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Landmark className="w-4 h-4 text-blue-400" />
          <h2 className="font-mono-code font-bold text-sm tracking-wide text-white">
            VSAM KSDS ACCOUNTS LEDGER
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono-code bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {accounts.length} RECORDS
          </span>
        </div>

        {role === 'OPERATOR' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            New Account
          </button>
        )}
      </div>

      {/* Account List Table */}
      <div className="overflow-y-auto flex-1 p-2 space-y-1">
        {accounts.length === 0 ? (
          <div className="p-8 text-center text-[#9CA3AF] font-mono-code text-xs">
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
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500/60 shadow-md shadow-blue-500/10'
                    : 'bg-[#0B0F17]/60 border-[#1F2937] hover:border-gray-600'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-code font-bold text-sm text-white">
                      {acct.id}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono-code ${
                        acct.status === 'A'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {acct.status === 'A' ? 'ACTIVE' : 'FROZEN'}
                    </span>
                    {isLocked && (
                      <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono-code bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                        <Lock className="w-3 h-3" />
                        fcntl WRITE-LOCKED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                    <User className="w-3 h-3" />
                    <span>{acct.owner}</span>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="font-mono-code font-bold text-base text-emerald-400">
                    ${acct.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="font-mono-code text-[10px] text-amber-400/90 tracking-wider">
                    COMP-3: {acct.rawBalanceHex ? acct.rawBalanceHex.join(' ') : '0x00 0x00...'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Account Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <h3 className="font-mono-code font-bold text-base text-white">
                Initialize VSAM Account Record
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#9CA3AF] hover:text-white"
              >
                &times;
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-500/50 rounded text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 font-mono-code text-xs">
              <div>
                <label className="block text-[#9CA3AF] mb-1">ACCOUNT ID (PIC X(10))</label>
                <input
                  type="text"
                  maxLength={10}
                  value={newId}
                  onChange={(e) => setNewId(e.target.value.toUpperCase())}
                  placeholder="ACCT000002"
                  className="w-full bg-[#0B0F17] border border-[#1F2937] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[#9CA3AF] mb-1">INITIAL BALANCE ($ - PIC S9(9)V99 COMP-3)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#1F2937] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[#9CA3AF] mb-1">OWNER NAME (PIC X(30))</label>
                <input
                  type="text"
                  maxLength={30}
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#1F2937] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2"
                >
                  {isSubmitting ? 'Writing to KSDS...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
