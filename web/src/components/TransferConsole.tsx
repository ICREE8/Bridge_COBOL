'use client';

import React, { useState } from 'react';
import { ArrowRightLeft, ShieldCheck, Flame, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AccountData } from './AccountsPanel';

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
  role: 'OPERATOR' | 'AUDITOR';
}

export const TransferConsole: React.FC<TransferConsoleProps> = ({
  accounts,
  selectedAccountId,
  onExecuteTransfer,
  onTriggerStressTest,
  role
}) => {
  const [targetAccount, setTargetAccount] = useState(selectedAccountId || 'ACCT000001');
  const [action, setAction] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [amount, setAmount] = useState('10000.50');
  const [idempotencyKey, setIdempotencyKey] = useState(`idemp_${Date.now().toString(36)}`);
  const [triggerSettlement, setTriggerSettlement] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStressRunning, setIsStressRunning] = useState(false);
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
      // Generate a new idempotency key for the next transfer
      setIdempotencyKey(`idemp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`);
    } catch (err: any) {
      setLastResult({ error: err.message || 'Execution error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStress = async () => {
    if (!targetAccount) return;
    setIsStressRunning(true);
    try {
      await onTriggerStressTest(targetAccount);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsStressRunning(false);
    }
  };

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 flex flex-col h-full shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-blue-400" />
          <h2 className="font-mono-code font-bold text-sm tracking-wide text-white">
            TRANSFER & SETTLEMENT ENGINE
          </h2>
        </div>
        <span className="font-mono-code text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> TWO-PHASE COMMIT
        </span>
      </div>

      {role === 'AUDITOR' && (
        <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-lg text-amber-300 text-xs font-mono-code flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>AUDITOR MODE ACTIVE: Transfers and stress triggers are disabled for security compliance.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 font-mono-code text-xs">
        {/* Account and Action selection */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[#9CA3AF] mb-1">TARGET ACCOUNT ID</label>
            <select
              value={targetAccount}
              onChange={(e) => setTargetAccount(e.target.value)}
              disabled={role === 'AUDITOR'}
              className="w-full bg-[#0B0F17] border border-[#1F2937] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.id} - ${a.balance.toFixed(2)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#9CA3AF] mb-1">CICS ACTION</label>
            <div className="grid grid-cols-2 gap-1.5 bg-[#0B0F17] p-1 rounded border border-[#1F2937]">
              <button
                type="button"
                onClick={() => setAction('DEBIT')}
                disabled={role === 'AUDITOR'}
                className={`py-1 rounded text-center font-bold transition ${
                  action === 'DEBIT' ? 'bg-red-600 text-white' : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                DEBIT
              </button>
              <button
                type="button"
                onClick={() => setAction('CREDIT')}
                disabled={role === 'AUDITOR'}
                className={`py-1 rounded text-center font-bold transition ${
                  action === 'CREDIT' ? 'bg-emerald-600 text-white' : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                CREDIT
              </button>
            </div>
          </div>
        </div>

        {/* Currency Amount with Quick Chips */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[#9CA3AF]">AMOUNT ($ USD)</label>
            <span className="text-[10px] text-amber-400">Packs into PIC S9(9)V99 COMP-3</span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={role === 'AUDITOR'}
              className="flex-1 bg-[#0B0F17] border border-[#1F2937] rounded px-3 py-2 text-white text-base font-bold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Quick Amount Chips */}
          <div className="flex gap-2 mt-2">
            {['10000.50', '2500.00', '1500.00', '500.00'].map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={role === 'AUDITOR'}
                onClick={() => setAmount(preset)}
                className={`px-2 py-1 rounded border text-[11px] transition ${
                  amount === preset
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-[#0B0F17] border-[#1F2937] text-[#9CA3AF] hover:text-white'
                }`}
              >
                ${preset}
              </button>
            ))}
          </div>
        </div>

        {/* Idempotency Key & Solana Settlement Toggle */}
        <div className="space-y-2">
          <div>
            <label className="block text-[#9CA3AF] mb-1">REDIS IDEMPOTENCY KEY (2PC)</label>
            <input
              type="text"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              disabled={role === 'AUDITOR'}
              className="w-full bg-[#0B0F17] border border-[#1F2937] rounded px-3 py-1.5 text-xs text-blue-400 focus:outline-none focus:border-blue-500 font-mono-code"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-[#9CA3AF] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={triggerSettlement}
              onChange={(e) => setTriggerSettlement(e.target.checked)}
              disabled={role === 'AUDITOR'}
              className="rounded bg-[#0B0F17] border-[#1F2937] text-blue-600 focus:ring-0"
            />
            <span>Trigger Atomic Solana Devnet Settlement on Legacy Commit</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={isSubmitting || role === 'AUDITOR'}
            className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition"
          >
            {isSubmitting ? (
              <span>Translating & Executing...</span>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Execute Binary Transfer</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleStress}
            disabled={isStressRunning || role === 'AUDITOR'}
            className="py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
            title="Spawns 5 concurrent debit/credits to demonstrate fcntl record lock queuing"
          >
            <Flame className={`w-4 h-4 ${isStressRunning ? 'animate-bounce text-amber-200' : ''}`} />
            <span>{isStressRunning ? 'Testing Locks...' : '5x Concurrent Stress Test'}</span>
          </button>
        </div>
      </form>

      {/* Result feedback */}
      {lastResult && (
        <div className={`p-3 rounded-lg border text-xs font-mono-code ${
          lastResult.error
            ? 'bg-red-950/40 border-red-500/40 text-red-400'
            : lastResult.isIdempotentReplay
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
        }`}>
          {lastResult.error ? (
            <div>Error: {lastResult.error}</div>
          ) : (
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lastResult.isIdempotentReplay ? 'IDEMPOTENT CACHED REPLAY (ZERO DOUBLE DEBIT)' : 'TRANSACTION COMMITTED'}
              </div>
              <div className="text-[11px] opacity-90">
                New Balance: ${lastResult.account?.balanceFormatted || lastResult.account?.balance} &bull; Total Latency: {lastResult.totalLatencyMs || 2}ms
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
