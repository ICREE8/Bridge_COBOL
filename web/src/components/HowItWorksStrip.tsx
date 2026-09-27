'use client';

import React, { useState } from 'react';
import { 
  ArrowRight, 
  Binary, 
  Lock, 
  Zap, 
  ScrollText, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Sparkles,
  Info
} from 'lucide-react';

export const HowItWorksStrip: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const steps = [
    {
      num: '1',
      title: 'Send JSON Request',
      subtitle: 'Normal app language',
      icon: <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">JSON</span>,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
      border: 'border-slate-200 dark:border-blue-500/30',
      desc: 'Modern web & mobile clients send standard JSON payloads with amount, account ID, and idempotency key.'
    },
    {
      num: '2',
      title: 'Binary Packing',
      subtitle: 'Translated into mainframe binary money format',
      icon: <Binary className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
      border: 'border-slate-200 dark:border-amber-500/30',
      desc: 'Fastify gateway packs floating-point numbers into 6-byte COMP-3 packed decimal and 183-byte COMMAREA buffers with zero float rounding errors.'
    },
    {
      num: '3',
      title: 'COBOL Ledger Lock',
      subtitle: 'Account is locked so two people can’t change it at the same time',
      icon: <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-red-400" />,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
      border: 'border-slate-200 dark:border-red-500/30',
      desc: 'The compiled GnuCOBOL engine acquires an exclusive POSIX fcntl kernel byte-range lock on the VSAM record to prevent double-spending.'
    },
    {
      num: '4',
      title: 'Solana Settlement',
      subtitle: 'Result is settled (or cryptographically proven) on modern rails',
      icon: <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
      border: 'border-slate-200 dark:border-emerald-500/30',
      desc: 'Simultaneously posts an immutable on-chain signature or Ed25519 cryptographic proof in sub-second time, replacing 48-hour batch windows.'
    },
    {
      num: '5',
      title: 'Real-Time Audit',
      subtitle: 'Everything is recorded live for audit',
      icon: <ScrollText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30',
      border: 'border-slate-200 dark:border-purple-500/30',
      desc: 'Every lock acquisition, memory translation, and transaction receipt streams to auditor dashboards over Server-Sent Events.'
    }
  ];

  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl shadow-sm transition-colors duration-200 overflow-hidden">
      {/* Top Banner Bar */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-[#1F2937] flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-gradient-to-r dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>HOW THIS WORKS</span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-gray-400 hidden sm:inline">
                &bull; 5-Step Pipeline from Cloud JSON to Mainframe VSAM Ledger
              </span>
            </h3>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-[#0B0F17] hover:bg-slate-100 dark:hover:bg-gray-800 border border-slate-200 dark:border-[#1F2937] text-xs font-medium text-blue-700 dark:text-blue-400 transition"
        >
          <Info className="w-3.5 h-3.5" />
          <span>{isExpanded ? 'Hide Story' : 'The 60-Second Story'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Sequential 5-Step Pipeline Strip with ALWAYS-VISIBLE Plain-English Subtitles */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {steps.map((s, idx) => (
          <div
            key={s.num}
            className={`bg-slate-50/70 dark:bg-[#0B0F17] border ${s.border} rounded-xl p-3.5 flex flex-col justify-between relative group hover:border-blue-400 transition`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-mono-code px-2 py-0.5 rounded-full font-bold border ${s.badgeColor}`}>
                  STEP {s.num}
                </span>
                <div className="flex items-center">{s.icon}</div>
              </div>

              <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition">
                {s.title}
              </div>

              {/* ALWAYS VISIBLE Plain-English Subtitle */}
              <div className="text-[11px] text-slate-600 dark:text-gray-400 mt-1 leading-snug font-sans font-medium">
                “{s.subtitle}”
              </div>
            </div>

            {/* Connecting Chevron on Desktop */}
            {idx < steps.length - 1 && (
              <div className="hidden lg:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-gray-700 items-center justify-center text-slate-400 dark:text-gray-400 shadow-sm">
                <ArrowRight className="w-3 h-3" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Expanded 3-Question Deep Dive (for non-experts & recruiters) */}
      {isExpanded && (
        <div className="p-5 border-t border-slate-100 dark:border-[#1F2937] bg-slate-50 dark:bg-[#0B0F17]/90 font-sans text-xs space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Question 1 */}
            <div className="bg-white dark:bg-[#111827] border border-blue-200 dark:border-blue-500/30 rounded-xl p-4 space-y-2 shadow-sm">
              <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <h4>1. What is this system?</h4>
              </div>
              <p className="text-slate-600 dark:text-gray-300 leading-relaxed text-[11px]">
                A production-grade bridge connecting modern microservices, REST APIs, and blockchain rails directly to a high-speed <strong>GnuCOBOL core banking engine</strong> and <strong>VSAM record ledger</strong>.
              </p>
            </div>

            {/* Question 2 */}
            <div className="bg-white dark:bg-[#111827] border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 space-y-2 shadow-sm">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <h4>2. What happens when I click a button?</h4>
              </div>
              <p className="text-slate-600 dark:text-gray-300 leading-relaxed text-[11px]">
                Your transfer is packed in <strong>&lt;2 milliseconds</strong> into exact binary packed decimal (<code className="text-amber-700 dark:text-amber-300 font-semibold">COMP-3</code>), written to the ledger under an exclusive OS kernel lock, and simultaneously verified on Solana with an immutable hash.
              </p>
            </div>

            {/* Question 3 */}
            <div className="bg-white dark:bg-[#111827] border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4 space-y-2 shadow-sm">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <h4>3. Why should I care?</h4>
              </div>
              <p className="text-slate-600 dark:text-gray-300 leading-relaxed text-[11px]">
                Over <strong>70% of Fortune 500 financial transactions</strong> still run on COBOL mainframes ($3 trillion/day). Complete rewrites routinely fail or cost billions. This bridge proves modern cloud & web3 rails can integrate directly without rewriting legacy core logic.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
