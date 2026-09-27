'use client';

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

export interface JargonDef {
  term: string;
  short: string;
  details: string;
  whyItMatters: string;
}

export const JARGON_DICTIONARY: Record<string, JargonDef> = {
  'COMP-3': {
    term: 'COMP-3 (Packed Decimal)',
    short: '2 decimal digits packed per byte + sign nibble.',
    details: 'Traditional programming languages like JavaScript and Python use IEEE-754 binary floating-point numbers, which cause subtle rounding bugs (e.g. 0.1 + 0.2 = 0.30000000000000004). COBOL stores money in COMP-3 binary-coded decimal, where each byte holds two exact base-10 digits.',
    whyItMatters: 'Guarantees absolute decimal precision with zero roundoff error in banking and accounting calculations.'
  },
  'fcntl lock': {
    term: 'POSIX fcntl Record Locking',
    short: 'Exclusive OS-level byte-range lock on the ledger file.',
    details: 'Before reading or modifying an account record, the COBOL engine requests an exclusive byte-range write lock from the operating system kernel. If another process tries to debit the same account simultaneously, the kernel puts it to sleep in an orderly FIFO queue until the first write commits.',
    whyItMatters: 'Guarantees two users cannot spend the same dollar simultaneously, preventing race conditions and double-spending.'
  },
  'COMMAREA': {
    term: 'CICS COMMAREA',
    short: 'Fixed-width binary memory block passed to COBOL programs.',
    details: 'In IBM mainframe CICS environments, programs communicate not by passing JSON or strings, but by sharing a contiguous slice of binary memory called the Communication Area (COMMAREA). Every field has an exact byte offset (e.g. 10 bytes for Account ID, 6 bytes for COMP-3 Balance).',
    whyItMatters: 'Allows modern REST APIs to interact directly with high-performance mainframe routines at raw memory speed.'
  },
  'idempotency key': {
    term: 'Idempotency Key (2PC)',
    short: 'Unique token preventing duplicate transactions during retries.',
    details: 'When a transfer is initiated, a unique UUID or hash is locked in Redis. If network jitter or client timeouts cause the request to be retried, the system recognizes the duplicate key and immediately returns the original successful receipt without executing a second debit.',
    whyItMatters: 'Eliminates accidental duplicate charges even when network connections drop midway through processing.'
  },
  'VSAM KSDS': {
    term: 'VSAM KSDS (Key-Sequenced Data Set)',
    short: 'High-speed indexed B-tree record storage on mainframes.',
    details: 'VSAM KSDS is the mainframe equivalent of an indexed relational table or key-value database. Each record is indexed by a unique primary key (like Account ID), enabling sub-millisecond lookups and updates directly from disk or memory buffers.',
    whyItMatters: 'Powers the core storage layer for over 70% of global financial systems and ATM transactions.'
  },
  'two-phase commit': {
    term: 'Two-Phase Commit (2PC)',
    short: 'Atomic coordination between the COBOL ledger and modern settlement.',
    details: 'A distributed protocol where the transaction first prepares the COBOL record update and the Solana settlement proof. Only when both rails validate the cryptographic preconditions does the commit phase execute simultaneously.',
    whyItMatters: 'Guarantees that the legacy ledger and the modern blockchain rail never diverge or get out of sync.'
  },
  'Solana Settlement': {
    term: 'Solana Devnet Settlement Rail',
    short: 'Sub-second cryptographic settlement replacing 48-hour batch windows.',
    details: 'Legacy banking systems typically batch transfers overnight in ACH or Fedwire batches that take 1 to 3 business days to clear. This bridge posts an immutable transaction hash or Ed25519 proof to the Solana rail within 400 milliseconds of the COBOL ledger commit.',
    whyItMatters: 'Proves instant real-time settlement while maintaining the stability and safety of the core legacy ledger.'
  }
};

interface JargonTooltipProps {
  term: keyof typeof JARGON_DICTIONARY | string;
  children?: React.ReactNode;
  iconOnly?: boolean;
}

export const JargonTooltip: React.FC<JargonTooltipProps> = ({ term, children, iconOnly = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  const def = JARGON_DICTIONARY[term] || {
    term,
    short: 'Enterprise banking architecture concept.',
    details: 'Used in mainframe and high-reliability financial computing environments to ensure data integrity.',
    whyItMatters: 'Essential for deterministic, high-throughput core banking.'
  };

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <span ref={containerRef} className="relative inline-flex items-center align-middle mx-1">
      {children && (
        <span
          className="border-b border-dotted border-slate-400 dark:border-gray-400 cursor-help hover:text-blue-600 dark:hover:text-blue-300 transition"
          onClick={() => setIsOpen(!isOpen)}
        >
          {children}
        </span>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label={`Explain ${def.term}`}
        className={`inline-flex items-center justify-center p-0.5 rounded-full text-slate-400 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition ${
          children ? 'ml-1' : ''
        }`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-72 sm:w-80 p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-blue-500/40 text-left shadow-xl dark:shadow-2xl dark:shadow-black/80 font-sans text-xs animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-gray-800 pb-2 mb-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-blue-600 dark:text-blue-400 font-bold">
                Jargon Explained
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{def.term}</h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white p-1 rounded hover:bg-slate-100 dark:hover:bg-gray-800 transition"
              aria-label="Close explanation"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick summary */}
          <p className="text-amber-800 dark:text-amber-300 font-semibold mb-2 leading-relaxed">
            {def.short}
          </p>

          {/* Detailed explanation */}
          <p className="text-slate-600 dark:text-gray-300 leading-relaxed mb-3 text-[11px]">
            {def.details}
          </p>

          {/* Why it matters badge */}
          <div className="bg-slate-50 dark:bg-[#0B0F17] rounded-lg p-2.5 border border-slate-200 dark:border-gray-800">
            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
              Why it matters for demos & banking:
            </span>
            <span className="text-[11px] text-slate-600 dark:text-gray-400 leading-tight block">
              {def.whyItMatters}
            </span>
          </div>
        </div>
      )}
    </span>
  );
};
