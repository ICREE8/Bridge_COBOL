'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AccountsPanel, AccountData } from '@/components/AccountsPanel';
import { HexMemoryInspector } from '@/components/HexMemoryInspector';
import { TransferConsole } from '@/components/TransferConsole';
import { HexPacketTracer, PacketTraceData } from '@/components/HexPacketTracer';
import { SolanaSettlementPanel, SettlementData } from '@/components/SolanaSettlementPanel';
import { AuditLogFeed, AuditEventItem } from '@/components/AuditLogFeed';

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
  const [selectedAccount, setSelectedAccount] = useState<AccountData | null>(accounts[0]);
  const [activeLockAccount, setActiveLockAccount] = useState<string | null>(null);
  const [lastTrace, setLastTrace] = useState<PacketTraceData | null>(null);
  const [lastSettlement, setLastSettlement] = useState<SettlementData | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [latencyMs, setLatencyMs] = useState<number>(1.8);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

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
          // Keep selected account or set to first
          const found = data.accounts.find((a: AccountData) => a.id === selectedAccount?.id);
          setSelectedAccount(found || data.accounts[0]);
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

  // Create Account handler
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

  // Transfer handler
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
      return data;
    } finally {
      setActiveLockAccount(null);
    }
  };

  // 5x Concurrent Stress Test handler (Demonstrates blocking fcntl record lock queuing)
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
      return data;
    } finally {
      setActiveLockAccount(null);
    }
  };

  const totalLedgerBalance = accounts.reduce((acc, curr) => acc + (curr.balance || 0), 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17]">
      <Header
        role={role}
        onRoleChange={setRole}
        latencyMs={latencyMs}
        onRefresh={fetchAccounts}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 p-6 max-w-[1700px] w-full mx-auto space-y-6">
        {/* Top Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono-code">
          <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-xl">
            <span className="text-xs text-[#9CA3AF]">TOTAL MANAGED KSDS RECORDS</span>
            <div className="text-2xl font-bold text-white mt-1">
              {accounts.length} ACCOUNTS
            </div>
            <span className="text-[11px] text-blue-400 mt-1 block">Indexed by Account ID Key</span>
          </div>

          <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-xl">
            <span className="text-xs text-[#9CA3AF]">AGGREGATE LEDGER BALANCE</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              ${totalLedgerBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-amber-400 mt-1 block">Packed COMP-3 Binary Format</span>
          </div>

          <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-xl">
            <span className="text-xs text-[#9CA3AF]">TRANSLATION + EXECUTION LATENCY</span>
            <div className="text-2xl font-bold text-blue-400 mt-1">
              {latencyMs} MS
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block">Target: p99 &lt; 12ms (Beaten by 6x)</span>
          </div>

          <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-xl">
            <span className="text-xs text-[#9CA3AF]">VSAM EXCLUSIVE CONTROL</span>
            <div className={`text-2xl font-bold mt-1 ${activeLockAccount ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
              {activeLockAccount ? 'RECORD LOCKED' : 'EXCLUSIVE QUEUE IDLE'}
            </div>
            <span className="text-[11px] text-[#9CA3AF] mt-1 block">POSIX fcntl Record Locking</span>
          </div>
        </div>

        {/* 3-Column Core Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Column 1: Accounts Panel & Raw Hex Memory Inspector */}
          <div className="space-y-6 flex flex-col">
            <div className="h-[360px]">
              <AccountsPanel
                accounts={accounts}
                selectedAccountId={selectedAccount?.id || null}
                onSelectAccount={setSelectedAccount}
                onCreateAccount={handleCreateAccount}
                role={role}
                activeLockAccount={activeLockAccount}
              />
            </div>
            <div className="flex-1 min-h-[300px]">
              <HexMemoryInspector account={selectedAccount} />
            </div>
          </div>

          {/* Column 2: Transfer Console & Side-by-Side Packet Tracer */}
          <div className="space-y-6 flex flex-col">
            <div className="h-[360px]">
              <TransferConsole
                accounts={accounts}
                selectedAccountId={selectedAccount?.id || null}
                onExecuteTransfer={handleExecuteTransfer}
                onTriggerStressTest={handleTriggerStressTest}
                role={role}
              />
            </div>
            <div className="flex-1 min-h-[300px]">
              <HexPacketTracer lastTrace={lastTrace} />
            </div>
          </div>

          {/* Column 3: Modern Solana Settlement & Streaming Audit Log Feed */}
          <div className="space-y-6 flex flex-col">
            <div className="h-[280px]">
              <SolanaSettlementPanel settlement={lastSettlement} />
            </div>
            <div className="flex-1 min-h-[380px]">
              <AuditLogFeed events={auditEvents} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
