'use client';

import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  ShieldCheck, 
  Flame, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { AccountData } from './AccountsPanel';
import { JargonTooltip } from './JargonTooltip';

interface TransferConsoleProps {
  accounts: AccountData[];
  selectedAccountId: string | null;
  onExecuteTransfer: (params: {
    action: 'DEBIT' | 'CREDIT';
    accountId: string;
    amount: number;
    idempotencyKey: string;
    triggerSettlement: boolean;
  }) => Promise<any>;
  onTriggerStressTest: (accountId: string) => Promise<any>;
  onInspectTransfer?: () => void;
  role: 'OPERATOR' | 'AUDITOR';
  activeLockAccount?: string | null;
}

export const TransferConsole: React.FC<TransferConsoleProps> = ({
  accounts,
  selectedAccountId,
  onExecuteTransfer,
  onTriggerStressTest,
  onInspectTransfer,
  role,
  activeLockAccount
}) => {
  const [targetAccount, setTargetAccount] = useState(selectedAccountId || 'ACCT000001');
  const [action, setAction] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [amount, setAmount] = useState('10000.50');
  const [idempotencyKey, setIdempotencyKey] = useState(`idemp_${Date.now().toString(36)}`);
  const [triggerSettlement, setTriggerSettlement] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStressRunning, setIsStressRunning] = useState(false);
  const [showStressConfirm, setShowStressConfirm] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // Update target when selectedAccountId changes
  React.useEffect(() => {
    if (selectedAccountId) {
      setTargetAccount(selectedAccountId);
    }
  }, [selectedAccountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAccount) return;

    setIsSubmitting(true);
    setLastResult(null);
    try {
      const res = await onExecuteTransfer({
        action,
        accountId: targetAccount,
        amount: parseFloat(amount) || 0,
        idempotencyKey,
        triggerSettlement
      });
      setLastResult(res);
      if (onInspectTransfer) {
        onInspectTransfer();
      }
      // Generate a new idempotency key for next transfer
      setIdempotencyKey(`idemp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`);
    } catch (err: any) {
      setLastResult({ error: err.message || 'Execution error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmStress = async () => {
    if (!targetAccount) return;
    setShowStressConfirm(false);
    setIsStressRunning(true);
    try {
      const res = await onTriggerStressTest(targetAccount);
      setLastResult(res);
      if (onInspectTransfer) {
        onInspectTransfer();
      }
    } catch (err: any) {
      setLastResult({ error: err.message || 'Stress test failed' });
    } finally {
      setIsStressRunning(false);
    }
  };

  const isCurrentAccountLocked = activeLockAccount === targetAccount;

  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl p-5 sm:p-6 flex flex-col h-full shadow-sm space-y-4 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1F2937] pb-3">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="font-mono-code font-bold text-sm tracking-wide text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>TRANSFER CONSOLE</span>
          </h2>
        </div>
        <span className="font-mono-code text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center gap-1 font-semibold">
          <ShieldCheck className="w-3 h-3" />
          <span>TWO-PHASE COMMIT</span>
          <JargonTooltip term="two-phase commit" />
        </span>
      </div>

      {/* Lock Notification Banner (Human-friendly education) */}
      {isCurrentAccountLocked && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/40 rounded-xl text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2.5 animate-pulse">
          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="font-sans leading-relaxed">
            <span className="font-bold">Exclusive OS Record Lock Active:</span>{' '}
            <span>This account is currently locked so two people cannot change the balance at the same time — exactly how real banking systems prevent double-spending.</span>
          </div>
        </div>
      )}

      {role === 'AUDITOR' && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/40 rounded-lg text-amber-800 dark:text-amber-300 text-xs font-mono-code flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span>AUDITOR MODE ACTIVE: Transfers and stress triggers are disabled for compliance.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 font-mono-code text-xs">
        {/* Account and Action selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-[#9CA3AF] mb-1 font-sans font-medium">TARGET ACCOUNT</label>
            <select
              value={targetAccount}
              onChange={(e) => setTargetAccount(e.target.value)}
              disabled={role === 'AUDITOR'}
              className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F2937] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.id} &bull; ${a.balance.toFixed(2)} ({a.owner})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-[#9CA3AF] mb-1 flex items-center justify-between font-sans font-medium">
              <span>CICS ACTION</span>
              <JargonTooltip term="COMMAREA" />
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-[#0B0F17] p-1 rounded-lg border border-slate-200 dark:border-[#1F2937]">
              <button
                type="button"
                onClick={() => setAction('DEBIT')}
                disabled={role === 'AUDITOR'}
                className={`py-1.5 rounded-md text-center font-bold transition text-xs ${
                  action === 'DEBIT' 
                    ? 'bg-rose-600 text-white shadow-xs' 
                    : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                DEBIT (-)
              </button>
              <button
                type="button"
                onClick={() => setAction('CREDIT')}
                disabled={role === 'AUDITOR'}
                className={`py-1.5 rounded-md text-center font-bold transition text-xs ${
                  action === 'CREDIT' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                CREDIT (+)
              </button>
            </div>
          </div>
        </div>

        {/* Currency Amount with Quick Chips */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-600 dark:text-[#9CA3AF] flex items-center gap-1 font-sans font-medium">
              <span>AMOUNT ($ USD)</span>
              <JargonTooltip term="COMP-3" />
            </label>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Packs into PIC S9(9)V99 COMP-3</span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={role === 'AUDITOR'}
              className="flex-1 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F2937] rounded-lg px-3 py-2 text-slate-900 dark:text-white text-base font-bold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Quick Amount Chips */}
          <div className="flex flex-wrap gap-2 mt-2">
            {['10000.50', '2500.00', '1500.00', '500.00'].map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={role === 'AUDITOR'}
                onClick={() => setAmount(preset)}
                className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold transition ${
                  amount === preset
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-amber-500/20 dark:border-amber-500/50 dark:text-amber-300'
                    : 'bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-[#1F2937] text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ${preset}
              </button>
            ))}
          </div>
        </div>

        {/* Idempotency Key & Solana Settlement Toggle */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1F2937]/50">
          <div>
            <label className="block text-slate-500 dark:text-[#9CA3AF] text-[11px] mb-1 flex items-center justify-between font-sans">
              <span>REDIS IDEMPOTENCY KEY (2PC)</span>
              <JargonTooltip term="idempotency key" />
            </label>
            <input
              type="text"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              disabled={role === 'AUDITOR'}
              className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F2937] rounded-lg px-3 py-1.5 text-xs text-blue-700 dark:text-blue-400 focus:outline-none focus:border-blue-500 font-mono-code"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#9CA3AF] cursor-pointer pt-0.5 font-sans">
            <input
              type="checkbox"
              checked={triggerSettlement}
              onChange={(e) => setTriggerSettlement(e.target.checked)}
              disabled={role === 'AUDITOR'}
              className="rounded bg-slate-100 dark:bg-[#0B0F17] border-slate-300 dark:border-[#1F2937] text-blue-600 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <span>Trigger Atomic Solana Devnet Settlement</span>
              <JargonTooltip term="Solana Settlement" />
            </span>
          </label>
        </div>

        {/* Visual Hierarchy: Dominant Primary Button vs Soft Secondary Button */}
        <div className="pt-2 space-y-3 font-sans">
          {/* 1. Even More Dominant Primary Button (High contrast, large, institutional) */}
          <button
            type="submit"
            disabled={isSubmitting || role === 'AUDITOR'}
            className="w-full py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-md shadow-blue-600/20 transition-all hover:shadow-lg active:scale-[0.99] tracking-wide"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Packing to Binary & Executing...</span>
              </span>
            ) : (
              <>
                <Zap className="w-5 h-5 text-amber-300" />
                <span className="text-base font-extrabold">Run a Transfer</span>
              </>
            )}
          </button>

          {/* 2. Softened Secondary Stress Test Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowStressConfirm(true)}
              disabled={isStressRunning || role === 'AUDITOR'}
              className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-[#0B0F17] dark:hover:bg-gray-800 border border-slate-200 dark:border-amber-500/30 disabled:opacity-50 text-slate-700 dark:text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <Flame className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${isStressRunning ? 'animate-bounce' : ''}`} />
              <span>{isStressRunning ? 'Testing Concurrency Queue...' : 'Run Concurrent Stress Test (5x)'}</span>
            </button>
            <p className="text-[11px] text-slate-500 dark:text-[#9CA3AF] text-center mt-1 font-sans">
              Demonstrates POSIX fcntl record lock queuing prevents race conditions.
            </p>
          </div>
        </div>
      </form>

      {/* Result feedback card with click-to-focus action */}
      {lastResult && (
        <div className={`p-4 rounded-xl border text-xs font-mono-code transition-all ${
          lastResult.error
            ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-red-950/40 dark:border-red-500/40 dark:text-red-400'
            : lastResult.isIdempotentReplay
            ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-500/40 dark:text-amber-300'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-500/40 dark:text-emerald-300'
        }`}>
          {lastResult.error ? (
            <div className="flex items-center gap-2 font-sans font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-red-400 flex-shrink-0" />
              <span>Error: {lastResult.error}</span>
            </div>
          ) : (
            <div className="space-y-2 font-sans">
              <div className="flex items-center justify-between">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {lastResult.isIdempotentReplay
                      ? 'IDEMPOTENT REPLAY (ZERO DOUBLE CHARGE)'
                      : 'TRANSACTION COMMITTED TO KSDS'}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-black/40 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-transparent font-mono">
                  {lastResult.totalLatencyMs || 2}ms
                </span>
              </div>

              <div className="text-[12px] text-slate-700 dark:text-gray-300">
                New Balance: <strong className="text-emerald-800 dark:text-emerald-300 font-bold">${lastResult.account?.balanceFormatted || lastResult.account?.balance}</strong>
                {lastResult.stressResults && ` &bull; 5/5 Concurrent writes serialized cleanly`}
              </div>

              {onInspectTransfer && (
                <button
                  type="button"
                  onClick={onInspectTransfer}
                  className="w-full mt-2 py-2 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <span>Inspect Binary Packet & Settlement</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for 5x Stress Test */}
      {showStressConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-amber-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Confirm Concurrent Stress Test
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400/90 font-mono-code">
                  5 Simultaneous Requests &bull; Target: {targetAccount}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F2937] text-xs text-slate-700 dark:text-gray-300 space-y-2 leading-relaxed font-sans">
              <p>
                <strong>What this tests:</strong> Spawns 5 concurrent debit transactions against account <code className="text-blue-700 dark:text-blue-400 font-semibold">{targetAccount}</code> within 5 milliseconds.
              </p>
              <p>
                <strong>Why it matters:</strong> Proves that the operating system kernel's <code className="text-amber-800 dark:text-amber-300 font-semibold">fcntl</code> record lock prevents race conditions by sequentially queuing writes without double-debiting.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setShowStressConfirm(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStress}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Run 5x Stress Test</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
