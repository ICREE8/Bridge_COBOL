'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ScrollText, Lock, Zap, FileText, ChevronDown, ChevronUp, Copy, Check, Clock } from 'lucide-react';
import { JargonTooltip } from './JargonTooltip';

export interface AuditEventItem {
  id: string;
  type: 'PACKET_TRACE' | 'LOCK_EVENT' | 'SETTLEMENT_EVENT' | 'AUDIT_RECEIPT';
  timestamp: string;
  data: any;
}

interface AuditLogFeedProps {
  events: AuditEventItem[];
  selectedEventId?: string | null;
  onSelectEvent?: (event: AuditEventItem) => void;
}

export const AuditLogFeed: React.FC<AuditLogFeedProps> = ({
  events,
  selectedEventId: propSelectedId,
  onSelectEvent
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedId = propSelectedId !== undefined ? propSelectedId : internalSelectedId;

  // Auto-scroll to bottom on new events if not inspecting an event
  useEffect(() => {
    if (scrollRef.current && !selectedId) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, selectedId]);

  const handleToggleEvent = (evt: AuditEventItem) => {
    const nextId = selectedId === evt.id ? null : evt.id;
    setInternalSelectedId(nextId);
    if (onSelectEvent) {
      onSelectEvent(evt);
    }
  };

  const handleCopyJson = (data: any, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getEventBadge = (type: AuditEventItem['type']) => {
    switch (type) {
      case 'PACKET_TRACE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30 flex items-center gap-1 font-semibold">
            <FileText className="w-3 h-3" /> TRACE
          </span>
        );
      case 'LOCK_EVENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 flex items-center gap-1 font-semibold">
            <Lock className="w-3 h-3" /> FCNTL
          </span>
        );
      case 'SETTLEMENT_EVENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 flex items-center gap-1 font-semibold">
            <Zap className="w-3 h-3" /> SOLANA
          </span>
        );
      case 'AUDIT_RECEIPT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30 flex items-center gap-1 font-semibold">
            <ScrollText className="w-3 h-3" /> RECEIPT
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl p-5 flex flex-col h-full shadow-sm space-y-3 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1F2937] pb-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h2 className="font-mono-code font-bold text-sm tracking-wide text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>LIVE AUDIT LOG (SSE STREAM)</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="font-mono-code text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">STREAMING ACTIVE</span>
        </div>
      </div>

      <div className="text-[11px] text-slate-500 dark:text-gray-400 font-mono-code flex items-center justify-between px-1">
        <span>CLICK ANY EVENT TO EXPAND FULL CONTEXT</span>
        <span>{events.length} EVENTS</span>
      </div>

      {/* Terminal log feed */}
      <div
        ref={scrollRef}
        className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F2937] rounded-xl p-3 font-mono-code text-xs overflow-y-auto flex-1 space-y-2 min-h-[300px]"
      >
        {events.length === 0 ? (
          <div className="text-slate-400 dark:text-gray-500 text-center py-12 flex flex-col items-center justify-center space-y-2">
            <Clock className="w-6 h-6 text-slate-400 dark:text-gray-600 animate-pulse" />
            <span>Listening for Server-Sent Events from Bridge Gateway...</span>
            <span className="text-[11px] text-slate-400 dark:text-gray-600">Run a transfer to watch real-time audit receipts</span>
          </div>
        ) : (
          events.map((evt, idx) => {
            const timeStr = evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : 'NOW';
            const isExpanded = selectedId === evt.id;

            return (
              <div
                key={evt.id || idx}
                onClick={() => handleToggleEvent(evt)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isExpanded
                    ? 'bg-purple-50/60 dark:bg-purple-950/20 border-purple-300 dark:border-purple-500/60 shadow-sm ring-1 ring-purple-300 dark:ring-purple-500/30'
                    : 'bg-white dark:bg-[#111827]/80 border-slate-200 dark:border-[#1F2937] hover:border-slate-300 dark:hover:border-gray-600'
                }`}
              >
                {/* Collapsed summary line */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 dark:text-gray-500 text-[10px]">{timeStr}</span>
                    {getEventBadge(evt.type)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">ID: {evt.id.slice(0, 10)}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500" />
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-700 dark:text-gray-300 leading-snug break-all pt-1.5 font-sans">
                  {evt.type === 'LOCK_EVENT' && (
                    <span>
                      Record Lock: <strong className="text-amber-700 dark:text-amber-400">{evt.data?.state}</strong> on account{' '}
                      <span className="text-blue-700 dark:text-blue-300 font-semibold">{evt.data?.accountId}</span>{' '}
                      {evt.data?.durationMs && `(held for ${evt.data.durationMs}ms)`}
                    </span>
                  )}
                  {evt.type === 'PACKET_TRACE' && (
                    <span>
                      Trace [{evt.data?.stage}]: {evt.data?.action} on {evt.data?.accountId}{' '}
                      {evt.data?.returnCode && `RC=${evt.data.returnCode}`}
                    </span>
                  )}
                  {evt.type === 'SETTLEMENT_EVENT' && (
                    <span className={evt.data?.settlement?.isSimulated ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-400'}>
                      Settled on Solana {evt.data?.settlement?.isSimulated ? '(Fallback Ed25519 Proof)' : '(Live Devnet)'}: Tx{' '}
                      {evt.data?.settlement?.signature?.slice(0, 16)}... slot{' '}
                      {evt.data?.settlement?.slot}
                    </span>
                  )}
                  {evt.type === 'AUDIT_RECEIPT' && (
                    <span className="text-purple-700 dark:text-purple-300">
                      Receipt [{evt.data?.status}]: {evt.data?.action} {evt.data?.amount ? `$${evt.data.amount}` : ''}{' '}
                      {evt.data?.message || ''}
                    </span>
                  )}
                </div>

                {/* Expanded Detail View when clicked */}
                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-500/30 text-xs space-y-2 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-purple-800 dark:text-purple-300 font-bold">FULL CONTEXT & PAYLOAD</span>
                      <button
                        onClick={() => handleCopyJson(evt, evt.id)}
                        className="flex items-center gap-1 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition px-2 py-0.5 rounded bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-transparent"
                      >
                        {copiedId === evt.id ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === evt.id ? 'Copied' : 'Copy JSON'}</span>
                      </button>
                    </div>

                    <pre className="p-2.5 rounded-lg bg-white dark:bg-black/60 border border-slate-200 dark:border-gray-800 text-slate-800 dark:text-purple-200 text-[11px] overflow-x-auto max-h-48 leading-relaxed font-mono">
                      {JSON.stringify(evt.data, null, 2)}
                    </pre>

                    {evt.type === 'LOCK_EVENT' && (
                      <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-tight font-sans">
                        <strong>Kernel Lock Verification:</strong> POSIX fcntl record lock was requested and held exclusively to prevent concurrent memory overwrite.
                      </p>
                    )}
                    {evt.type === 'SETTLEMENT_EVENT' && (
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 leading-tight font-sans">
                        <strong>Solana Proof:</strong> Finalized slot #{evt.data?.settlement?.slot} with cryptographic verification.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
