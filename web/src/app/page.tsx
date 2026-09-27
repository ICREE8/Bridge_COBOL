'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { HowItWorksStrip } from '@/components/HowItWorksStrip';
import { AccountsPanel, AccountData } from '@/components/AccountsPanel';
import { TransferConsole } from '@/components/TransferConsole';
import { ContextualDetailPanel, ContextTab } from '@/components/ContextualDetailPanel';
import { PacketTraceData } from '@/components/HexPacketTracer';
import { SettlementData } from '@/components/SolanaSettlementPanel';
import { AuditEventItem } from '@/components/AuditLogFeed';
import { JargonTooltip } from '@/components/JargonTooltip';
import { Zap, ShieldCheck } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Dashboard() {
  const [role, setRole] = useState<'OPERATOR' | 'AUDITOR'>('OPERATOR');
  const [accounts, setAccounts] = useState<AccountData[]>([
    {
      id: 'ACCT000001',
      balance: 10000.50,
      balanceFormatted: '10000.50',
      status: 'A',
      owner: 'Alice Smith',
      rawBalanceHex: ['0x00', '0x00', '0x10', '0x00', '0x05', '0x0C']
    },
    {
      id: 'ACCT000088',
      balance: 7000.50,
      balanceFormatted: '7000.50',
      status: 'A',
      owner: 'Integration Tester',
      rawBalanceHex: ['0x00', '0x00', '0x07', '0x00', '0x05', '0x0C']
    }
  ]);
  const [selectedAccount, setSelectedAccount] = useState<AccountData | null>(null);
  const [activeLockAccount, setActiveLockAccount] = useState<string | null>(null);
  const [lastTrace, setLastTrace] = useState<PacketTraceData | null>(null);
  const [lastSettlement, setLastSettlement] = useState<SettlementData | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [latencyMs, setLatencyMs] = useState<number>(1.8);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Progressive Disclosure: Default to friendly STANDBY view when nothing is selected
  const [contextTab, setContextTab] = useState<ContextTab>('STANDBY');

  // Load initial accounts from Bridge REST API
  const fetchAccounts = async () => {
    setIsRefreshing(true);
    const t0 = performance.now();
    try {
      const res = await fetch(`${API_BASE}/api/v1/accounts`);
      if (res.ok) {
        const data = await res.json();
        if (data.accounts && data.accounts.length > 0) {
          setAccounts(data.accounts);
          // If an account was previously selected, keep it updated
          if (selectedAccount) {
            const found = data.accounts.find((a: AccountData) => a.id === selectedAccount.id);
            if (found) setSelectedAccount(found);
          }
        }
      }
    } catch (err) {
      console.warn('API Gateway offline or using local state fallback');
    } finally {
      setLatencyMs(Math.max(1, Math.round(performance.now() - t0)));
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccounts();

    // Connect to Server-Sent Events stream from Fastify Gateway
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${API_BASE}/api/v1/events`);

      eventSource.onmessage = (event) => {
        try {
          const item: AuditEventItem = JSON.parse(event.data);
          setAuditEvents((prev) => [...prev.slice(-40), item]);

          // Handle specific event types
          if (item.type === 'PACKET_TRACE') {
            setLastTrace(item.data);
          } else if (item.type === 'LOCK_EVENT') {
            if (item.data?.state === 'LOCK_REQUESTED') {
              setActiveLockAccount(item.data.accountId);
            } else if (item.data?.state === 'LOCK_RELEASED') {
              setActiveLockAccount(null);
            }
          } else if (item.type === 'SETTLEMENT_EVENT') {
            if (item.data?.settlement) {
              setLastSettlement(item.data.settlement);
            }
          }
        } catch (e) {
          // Parse error
        }
      };

      eventSource.onerror = () => {
        // SSE retry handled automatically
      };
    } catch (err) {
      console.warn('SSE not connected');
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Create Account handler (inline drawer)
  const handleCreateAccount = async (id: string, initialBalance: number, owner: string) => {
    const res = await fetch(`${API_BASE}/api/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: id, initialBalance, ownerName: owner, status: 'A' })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Creation failed');
    }
    await fetchAccounts();
  };

  // Transfer handler: automatically focuses on Packet Tracer & Settlement result
  const handleExecuteTransfer = async (params: {
    action: 'DEBIT' | 'CREDIT';
    accountId: string;
    amount: number;
    idempotencyKey: string;
    triggerSettlement: boolean;
  }) => {
    const t0 = performance.now();
    setActiveLockAccount(params.accountId);

    try {
      const res = await fetch(`${API_BASE}/api/v1/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      setLatencyMs(Math.max(1, Math.round(performance.now() - t0)));

      if (data.settlement) {
        setLastSettlement(data.settlement);
      }

      await fetchAccounts();
      // Automatically switch to Packet Tracer + Settlement result as requested!
      setContextTab('TRANSFER_DETAILS');
      return data;
    } finally {
      setActiveLockAccount(null);
    }
  };

  // 5x Concurrent Stress Test handler
  const handleTriggerStressTest = async (accountId: string) => {
    setActiveLockAccount(accountId);
    try {
      const res = await fetch(`${API_BASE}/api/v1/stress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, concurrency: 5 })
      });
      const data = await res.json();
      await fetchAccounts();
      // Automatically switch to Packet Tracer + Settlement result
      setContextTab('TRANSFER_DETAILS');
      return data;
    } finally {
      setActiveLockAccount(null);
    }
  };

  // Select account and reveal memory inspector
  const handleSelectAccount = (acct: AccountData) => {
    setSelectedAccount(acct);
    setContextTab('ACCOUNT_MEMORY');
  };

  const totalLedgerBalance = accounts.reduce((acc, curr) => acc + (curr.balance || 0), 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#E5E7EB] transition-colors duration-200">
      {/* Global Navigation Header with 3 Core Statuses + Theme Switcher */}
      <Header
        role={role}
        onRoleChange={setRole}
        latencyMs={latencyMs}
        onRefresh={fetchAccounts}
        isRefreshing={isRefreshing}
        activeLockAccount={activeLockAccount}
      />

      <main className="flex-1 p-4 sm:p-6 max-w-[1700px] w-full mx-auto space-y-5">
        {/* Always-Visible "How This Works" Explainer Strip with Subtitles */}
        <HowItWorksStrip />

        {/* Top Metric Cards Row with Dual Microcopy Labels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono-code">
          {/* Card 1: Accounts */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] p-4 rounded-xl shadow-xs transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-[#9CA3AF] font-sans font-medium">
                Managed Accounts (VSAM KSDS)
              </span>
              <JargonTooltip term="VSAM KSDS" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {accounts.length} Accounts
            </div>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 block font-sans">
              Indexed by Account ID Key
            </span>
          </div>

          {/* Card 2: Balance with Dual Label */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] p-4 rounded-xl shadow-xs transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-[#9CA3AF] font-sans font-medium">
                Aggregate Balance (COMP-3 packed)
              </span>
              <JargonTooltip term="COMP-3" />
            </div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
              ${totalLedgerBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 block font-sans">
              Binary Packed &bull; Zero IEEE-754 Float Error
            </span>
          </div>

          {/* Card 3: Execution Latency */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] p-4 rounded-xl shadow-xs transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-[#9CA3AF] font-sans font-medium">
                Bridge Execution Latency
              </span>
              <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">
              {latencyMs} MS
            </div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 block font-sans">
              Target: &lt;12ms (6x faster)
            </span>
          </div>

          {/* Card 4: Exclusive Control with Dual Label */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] p-4 rounded-xl shadow-xs transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-[#9CA3AF] font-sans font-medium">
                VSAM Exclusive Control
              </span>
              <JargonTooltip term="fcntl lock" />
            </div>
            <div className={`text-xl font-bold mt-1 ${activeLockAccount ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {activeLockAccount ? 'Account Currently Locked' : 'Exclusive Queue Free'}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-[#9CA3AF] mt-1 block font-sans">
              POSIX fcntl Record Locking Active
            </span>
          </div>
        </div>

        {/* Click-to-Focus 3-Column Core Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[580px]">
          {/* Column 1: Clean Accounts List (3 cols) */}
          <div className="lg:col-span-3 h-[580px] lg:h-auto">
            <AccountsPanel
              accounts={accounts}
              selectedAccountId={selectedAccount?.id || null}
              onSelectAccount={handleSelectAccount}
              onCreateAccount={handleCreateAccount}
              role={role}
              activeLockAccount={activeLockAccount}
            />
          </div>

          {/* Column 2: Primary Action Area (4 cols) */}
          <div className="lg:col-span-4 h-[580px] lg:h-auto">
            <TransferConsole
              accounts={accounts}
              selectedAccountId={selectedAccount?.id || null}
              onExecuteTransfer={handleExecuteTransfer}
              onTriggerStressTest={handleTriggerStressTest}
              onInspectTransfer={() => setContextTab('TRANSFER_DETAILS')}
              role={role}
              activeLockAccount={activeLockAccount}
            />
          </div>

          {/* Column 3: Single Contextual Detail Panel (5 cols) */}
          <div className="lg:col-span-5 h-[580px] lg:h-auto">
            <ContextualDetailPanel
              activeTab={contextTab}
              onTabChange={setContextTab}
              selectedAccount={selectedAccount}
              lastTrace={lastTrace}
              lastSettlement={lastSettlement}
              auditEvents={auditEvents}
              onQuickInspectAccount={() => {
                if (accounts.length > 0) {
                  setSelectedAccount(accounts[0]);
                  setContextTab('ACCOUNT_MEMORY');
                }
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
