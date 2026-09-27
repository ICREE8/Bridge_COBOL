'use client';

import React, { useEffect, useRef } from 'react';
import { ScrollText, Lock, Zap, FileText, ArrowRight } from 'lucide-react';

export interface AuditEventItem {
  id: string;
  type: 'PACKET_TRACE' | 'LOCK_EVENT' | 'SETTLEMENT_EVENT' | 'AUDIT_RECEIPT';
  timestamp: string;
  data: any;
}

interface AuditLogFeedProps {
  events: AuditEventItem[];
}

export const AuditLogFeed: React.FC<AuditLogFeedProps> = ({ events }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const getEventBadge = (type: AuditEventItem['type']) => {
    switch (type) {
      case 'PACKET_TRACE':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-code bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <FileText className="w-3 h-3" /> TRACE
          </span>
        );
      case 'LOCK_EVENT':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-code bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <Lock className="w-3 h-3" /> FCNTL
          </span>
        );
      case 'SETTLEMENT_EVENT':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-code bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Zap className="w-3 h-3" /> SOLANA
          </span>
        );
      case 'AUDIT_RECEIPT':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-code bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1">
            <ScrollText className="w-3 h-3" /> RECEIPT
          </span>
        );
    }
  };

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 flex flex-col h-full shadow-lg space-y-3">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-purple-400" />
          <h2 className="font-mono-code font-bold text-sm tracking-wide text-white">
            LIVE STREAMING AUDIT LOG (SSE)
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="font-mono-code text-[11px] text-emerald-400">STREAM ACTIVE</span>
        </div>
      </div>

      {/* Terminal log feed */}
      <div
        ref={scrollRef}
        className="bg-[#0B0F17] border border-[#1F2937] rounded-lg p-3 font-mono-code text-xs overflow-y-auto max-h-[300px] flex-1 space-y-2"
      >
        {events.length === 0 ? (
          <div className="text-gray-500 text-center py-6">
            Listening for Server-Sent Events from Bridge Gateway...
          </div>
        ) : (
          events.map((evt, idx) => {
            const timeStr = evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : 'NOW';

            return (
              <div
                key={evt.id || idx}
                className="p-2 rounded bg-[#111827]/80 border border-[#1F2937] space-y-1 hover:border-gray-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-[10px]">{timeStr}</span>
                    {getEventBadge(evt.type)}
                  </div>
                  <span className="text-[10px] text-gray-500">ID: {evt.id.slice(0, 12)}</span>
                </div>

                <div className="text-[11px] text-gray-300 leading-snug break-all pl-1">
                  {evt.type === 'LOCK_EVENT' && (
                    <span>
                      Record Lock: <strong className="text-amber-400">{evt.data?.state}</strong> on account{' '}
                      <span className="text-blue-300">{evt.data?.accountId}</span>{' '}
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
                    <span className="text-emerald-400">
                      Settled on Solana: Tx {evt.data?.settlement?.signature?.slice(0, 16)}... slot{' '}
                      {evt.data?.settlement?.slot}
                    </span>
                  )}
                  {evt.type === 'AUDIT_RECEIPT' && (
                    <span className="text-purple-300">
                      Receipt [{evt.data?.status}]: {evt.data?.action} {evt.data?.amount ? `$${evt.data.amount}` : ''}{' '}
                      {evt.data?.message || ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
