'use client';

import React, { useState } from 'react';
import { History, ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleHistoryProps {
  title?: string;
  count?: number;
  defaultOpen?: boolean;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function CollapsibleHistory({
  title = 'ประวัติการบันทึกย้อนหลัง',
  count,
  defaultOpen = true,
  headerActions,
  children,
  className = '',
}: CollapsibleHistoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* Header bar */}
      <div className="p-4 md:p-5 flex items-center justify-between gap-3 bg-slate-50/70 border-b border-slate-100 select-none">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-200/70 flex items-center justify-center text-slate-700 shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-base md:text-lg font-bold text-slate-800 truncate">{title}</h3>
            {count !== undefined && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {count} รายการ
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {headerActions}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <span>{isOpen ? 'ซ่อนประวัติ' : 'แสดงประวัติ'}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isOpen ? (
        <div className="p-4 md:p-6 space-y-4 animate-in fade-in duration-200">
          {children}
        </div>
      ) : (
        <div
          onClick={() => setIsOpen(true)}
          className="px-4 py-3 bg-slate-50/30 hover:bg-slate-100/50 text-center text-xs text-slate-400 font-medium cursor-pointer transition-colors"
        >
          แตะที่นี่เพื่อแสดงรายการประวัติย้อนหลัง ({count !== undefined ? `${count} รายการ` : 'ดูรายละเอียด'})
        </div>
      )}
    </div>
  );
}
