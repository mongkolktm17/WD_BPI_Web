'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  RefreshCw,
  CheckCircle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Printer,
  Edit3,
  Eye,
  Send,
  AlertTriangle,
  ShieldCheck,
  Radio,
  Camera,
  Car,
  HardHat,
  Database,
  Check,
  Sun,
  Calendar,
  BarChart3,
  Settings,
  FileText,
  FileSignature,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { AiReportProgressBar } from './AiReportProgressBar';

interface AiReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  siteCode?: string;
  onOpenSettings?: () => void;
}

function formatSafeDisplayDate(d?: string) {
  if (!d) return 'ประจำวันปัจจุบัน';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return d;
  }
}

function renderInlineFormatted(text: string) {
  const tokens = text.split(
    /(\*\*.*?\*\*|`.*?`|\[(?:CRITICAL|HIGH|MEDIUM|LOW|PASS|FAIL|ATTENTION|ปกติ|ผ่านเกณฑ์|สมบูรณ์|เฝ้าระวัง|เตือน|ชำรุด|สูญหาย)\])/g,
  );

  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[11px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('[') && token.endsWith(']')) {
      const tag = token.slice(1, -1);
      let color = 'bg-slate-100 text-slate-700 border-slate-300';
      if (['CRITICAL', 'FAIL', 'ชำรุด', 'สูญหาย'].includes(tag)) {
        color = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      } else if (['HIGH', 'ATTENTION', 'เตือน', 'เฝ้าระวัง'].includes(tag)) {
        color = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      } else if (['MEDIUM'].includes(tag)) {
        color = 'bg-yellow-100 text-yellow-900 border-yellow-300 font-semibold';
      } else if (['LOW', 'PASS', 'ปกติ', 'ผ่านเกณฑ์', 'สมบูรณ์'].includes(tag)) {
        color = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
      }
      return (
        <span
          key={idx}
          className={`inline-block align-middle px-1.5 py-0.5 rounded text-[10px] font-mono border mx-0.5 leading-tight ${color}`}
        >
          {tag}
        </span>
      );
    }
    return token;
  });
}

function renderMarkdownDocument(markdown: string) {
  if (!markdown || !markdown.trim()) {
    return (
      <div className="text-center py-12 text-slate-400">
        <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
        <p className="text-xs">ยังไม่มีข้อมูลรายงาน กรุณากด "ร่างใหม่" เพื่อสร้างรายงาน</p>
      </div>
    );
  }

  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const headerLine = tableBuffer[0];
    const dataLines = tableBuffer.slice(2);

    const parseRow = (rowStr: string) =>
      rowStr
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());

    const headers = parseRow(headerLine);
    const colCount = headers.length;

    const isFivePillars = colCount === 5 || headers.some((h) => h.includes('เสาหลัก') || h.includes('เป้าหมาย'));
    const isRiskTable = !isFivePillars && (colCount === 4 || headers.some((h) => h.includes('ความเสี่ยง') || h.includes('ช่องโหว่')));

    const getColAlign = (cIdx: number) => {
      if (isFivePillars) {
        if (cIdx === 0 || cIdx === 1) return 'text-left';
        if (cIdx === 2 || cIdx === 3 || cIdx === 4) return 'text-center';
      }
      if (isRiskTable) {
        if (cIdx === 0 || cIdx === 2 || cIdx === 3) return 'text-left';
        if (cIdx === 1) return 'text-center';
      }
      return 'text-left';
    };

    const getColWidth = (cIdx: number) => {
      if (isFivePillars) {
        if (cIdx === 0) return '24%';
        if (cIdx === 1) return '30%';
        if (cIdx === 2) return '13%';
        if (cIdx === 3) return '16%';
        if (cIdx === 4) return '17%';
      }
      if (isRiskTable) {
        if (cIdx === 0) return '22%';
        if (cIdx === 1) return '14%';
        if (cIdx === 2) return '42%';
        if (cIdx === 3) return '22%';
      }
      return `${Math.round(100 / colCount)}%`;
    };

    const formatTableCell = (cellText: string, cIdx: number) => {
      const clean = cellText.replace(/^\*\*|\*\*$/g, '').trim();

      // 5 Pillars status column (cIdx === 4)
      if (isFivePillars && cIdx === 4) {
        const tagMatch = clean.match(/^\[(.*?)\]\s*(.*)$/);
        if (tagMatch) {
          const tag = tagMatch[1].trim();
          const note = tagMatch[2].trim();
          let badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
          if (['CRITICAL', 'FAIL', 'ชำรุด', 'สูญหาย', 'วิกฤต', 'ตกเกณฑ์'].includes(tag)) {
            badgeColor = 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
          } else if (['HIGH', 'ATTENTION', 'เตือน', 'เฝ้าระวัง', 'เสี่ยง'].includes(tag)) {
            badgeColor = 'bg-amber-50 text-amber-900 border-amber-300 font-bold';
          } else if (['LOW', 'PASS', 'ปกติ', 'ผ่านเกณฑ์', 'สมบูรณ์', 'พร้อม'].includes(tag)) {
            badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
          }
          return (
            <div className="flex flex-col items-center justify-center gap-0.5 text-center">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-mono border ${badgeColor}`}>
                {tag}
              </span>
              {note && (
                <span className="text-[10px] text-slate-500 font-medium leading-tight text-center">
                  {note}
                </span>
              )}
            </div>
          );
        }
      }

      // Target column (cIdx === 2 in 5 Pillars)
      if (isFivePillars && cIdx === 2) {
        return (
          <div className="flex justify-center text-center">
            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono font-bold text-[11px]">
              {clean}
            </span>
          </div>
        );
      }

      // Actual Performance column (cIdx === 3 in 5 Pillars)
      if (isFivePillars && cIdx === 3) {
        return (
          <div className="flex justify-center text-center">
            <span className="font-mono font-bold text-slate-900 text-xs">
              {clean}
            </span>
          </div>
        );
      }

      // Pillar Name column (cIdx === 0 in 5 Pillars)
      if (isFivePillars && cIdx === 0) {
        const match = clean.match(/^(\d+[\.\)]\s*)(.*?)(?:\s*\((.*?)\))?$/);
        if (match) {
          const num = match[1];
          const thai = match[2];
          const en = match[3];
          return (
            <div className="flex items-start gap-1.5 text-left">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-[#0052CC] font-bold text-[10px] inline-flex items-center justify-center shrink-0 mt-0.5">
                {num.replace(/\D/g, '')}
              </span>
              <div className="leading-tight">
                <span className="font-bold text-slate-900 text-xs">{thai}</span>
                {en && <span className="block text-[10px] text-slate-500 font-normal">({en})</span>}
              </div>
            </div>
          );
        }
        return <span className="font-bold text-slate-900 text-xs">{clean}</span>;
      }

      // Key Metrics column (cIdx === 1 in 5 Pillars)
      if (isFivePillars && cIdx === 1) {
        const parts = clean.split('•').map((p) => p.trim());
        if (parts.length > 1) {
          return (
            <div className="space-y-0.5 text-left">
              {parts.map((p, pIdx) => (
                <div key={pIdx} className="flex items-center gap-1.5 text-[11px] text-slate-700 leading-tight">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          );
        }
        return <span className="text-[11px] text-slate-700 text-left">{clean}</span>;
      }

      // Risk area column (cIdx === 0 in Risk Table)
      if (isRiskTable && cIdx === 0) {
        return <span className="font-bold text-slate-900 text-xs">{clean}</span>;
      }

      // Risk Level column (cIdx === 1 in Risk Table)
      if (isRiskTable && cIdx === 1) {
        const level = clean.replace(/[\[\]]/g, '').trim().toUpperCase();
        let color = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
        if (['HIGH', 'CRITICAL', 'สูง', 'วิกฤต'].includes(level)) {
          color = 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
        } else if (['MEDIUM', 'MED', 'ปานกลาง'].includes(level)) {
          color = 'bg-amber-50 text-amber-900 border-amber-300 font-bold';
        } else if (['LOW', 'ต่ำ'].includes(level)) {
          color = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
        }
        return (
          <div className="flex justify-center text-center">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-mono border ${color}`}>
              {level}
            </span>
          </div>
        );
      }

      // Risk Details (cIdx === 2 in Risk Table)
      if (isRiskTable && cIdx === 2) {
        return <span className="text-slate-700 text-[11px] leading-relaxed">{renderInlineFormatted(cellText)}</span>;
      }

      // Affected Area (cIdx === 3 in Risk Table)
      if (isRiskTable && cIdx === 3) {
        return <span className="text-slate-800 font-medium text-[11px] leading-relaxed">{renderInlineFormatted(cellText)}</span>;
      }

      return renderInlineFormatted(cellText);
    };

    elements.push(
      <div
        key={`table-${elements.length}`}
        className="my-3 rounded-xl border border-slate-300/90 shadow-2xs bg-white overflow-hidden avoid-break"
      >
        <table className="w-full border-collapse text-xs table-fixed">
          <colgroup>
            {headers.map((_, idx) => (
              <col key={idx} style={{ width: getColWidth(idx) }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-slate-100/90 border-b-2 border-slate-300 text-slate-800">
              {headers.map((h, idx) => (
                <th
                  key={idx}
                  className={`p-2.5 font-bold text-[11px] sm:text-xs text-slate-800 ${getColAlign(idx)}`}
                >
                  {renderInlineFormatted(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 bg-white">
            {dataLines.map((rowStr, rIdx) => {
              const cells = parseRow(rowStr);
              return (
                <tr
                  key={rIdx}
                  className={
                    rIdx % 2 === 0 ? 'bg-white hover:bg-slate-50/60' : 'bg-slate-50/50 hover:bg-slate-50'
                  }
                >
                  {cells.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`p-2.5 text-slate-700 leading-normal ${getColAlign(cIdx)}`}
                    >
                      {formatTableCell(cell, cIdx)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>,
    );
    tableBuffer = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Skip redundant top markdown title since Executive Header shows it
    if (
      (line.startsWith('# รายงาน') ||
        line.startsWith('**ศูนย์ปฏิบัติการ') ||
        line.startsWith('**หน่วยงาน') ||
        line.startsWith('**ประจำวันที่:')) &&
      i < 6
    ) {
      continue;
    }

    // Skip redundant markdown disclaimer since Official Legal Footer shows it at document bottom
    if (
      line.includes('พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล') ||
      (line.includes('PDPA') && (line.startsWith('*') || line.startsWith('_')))
    ) {
      continue;
    }

    if (line.startsWith('|')) {
      inTable = true;
      tableBuffer.push(line);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!line) {
      continue;
    }

    if (line === '---') {
      const remainingLines = lines.slice(i + 1).map((l) => l.trim()).filter(Boolean);
      const hasMoreContent = remainingLines.some(
        (l) => !l.includes('PDPA') && !l.includes('คุ้มครองข้อมูลส่วนบุคคล') && l !== '---'
      );
      if (hasMoreContent) {
        elements.push(<hr key={`hr-${i}`} className="my-6 border-slate-200" />);
      }
      continue;
    }

    // 4 Mandatory Section Headers
    if (line.startsWith('### ส่วนที่ 1:') || line.startsWith('### 1.') || line.includes('รายงานข้อมูล')) {
      elements.push(
        <div key={`sec1-${i}`} className="mt-8 mb-4 pb-2 border-b-2 border-blue-600 flex items-center gap-2.5 avoid-break">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0052CC]">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
            {line.replace(/^###\s*/, '')}
          </h3>
        </div>,
      );
      continue;
    }

    if (line.startsWith('### ส่วนที่ 2:') || line.startsWith('### 2.') || line.includes('วิเคราะห์สถานการณ์')) {
      elements.push(
        <div key={`sec2-${i}`} className="report-page-break mt-8 mb-4 pb-2 border-b-2 border-indigo-600 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
            {line.replace(/^###\s*/, '')}
          </h3>
        </div>,
      );
      continue;
    }

    if (line.startsWith('### ส่วนที่ 3:') || line.startsWith('### 3.') || line.includes('ประเมินความเสี่ยง')) {
      elements.push(
        <div key={`sec3-${i}`} className="mt-8 mb-4 pb-2 border-b-2 border-amber-600 flex items-center gap-2.5 avoid-break">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
            {line.replace(/^###\s*/, '')}
          </h3>
        </div>,
      );
      continue;
    }

    if (line.startsWith('### ส่วนที่ 4:') || line.startsWith('### 4.') || line.includes('แนะนำการปรับปรุง')) {
      elements.push(
        <div key={`sec4-${i}`} className="report-page-break mt-8 mb-4 pb-2 border-b-2 border-emerald-600 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
            {line.replace(/^###\s*/, '')}
          </h3>
        </div>,
      );
      continue;
    }

    // Other H3 Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-xs font-bold text-slate-900 mt-5 mb-2 flex items-center gap-2 avoid-break">
          <span className="w-1.5 h-3.5 bg-blue-600 rounded-xs"></span>
          <span>{line.replace(/^###\s*/, '')}</span>
        </h3>,
      );
      continue;
    }

    // H4 Sub-headers
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-xs font-bold text-slate-800 mt-4 mb-2 flex items-center gap-1.5 avoid-break">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          <span>{line.replace(/^####\s*/, '')}</span>
        </h4>,
      );
      continue;
    }

    // Bullet list item
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2);
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2.5 text-xs text-slate-700 my-1.5 pl-2 leading-relaxed avoid-break">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
          <div className="flex-1">{renderInlineFormatted(content)}</div>
        </div>,
      );
      continue;
    }

    // Numbered list item
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const num = numMatch[1];
      const content = numMatch[2];
      elements.push(
        <div key={`num-${i}`} className="action-item-card flex items-start gap-2.5 text-xs text-slate-700 my-2 p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 leading-relaxed avoid-break">
          <span className="w-5 h-5 rounded-md bg-blue-100/80 border border-blue-200 font-bold text-[#0052CC] text-[10.5px] flex items-center justify-center shrink-0 mt-0.5">
            {num}
          </span>
          <div className="flex-1">{renderInlineFormatted(content)}</div>
        </div>,
      );
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs text-slate-700 my-2 leading-relaxed">
        {renderInlineFormatted(line)}
      </p>,
    );
  }

  if (inTable) {
    flushTable();
  }

  return elements;
}

export function AiReportDrawer({
  isOpen,
  onClose,
  siteCode = 'BPI',
  onOpenSettings,
}: AiReportDrawerProps) {
  const [reportType, setReportType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [loading, setLoading] = useState(false);
  const [reportId, setReportId] = useState<number | null>(null);
  const [reportDate, setReportDate] = useState<string>('');
  const [status, setStatus] = useState<string>('DRAFT');
  const [markdownText, setMarkdownText] = useState<string>('');
  const [metrics, setMetrics] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [providerUsed, setProviderUsed] = useState<string>('');
  const [modelUsed, setModelUsed] = useState<string>('');
  const [estimatedDuration, setEstimatedDuration] = useState(14);
  const [copied, setCopied] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvedMessage, setApprovedMessage] = useState<string | null>(null);

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState<'UP' | 'DOWN' | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Fetch or generate report when drawer opens or reportType changes
  useEffect(() => {
    if (!isOpen) return;
    loadReport(reportType);
  }, [isOpen, reportType]);

  const loadReport = async (type: 'DAILY' | 'WEEKLY' | 'MONTHLY') => {
    setLoading(true);
    setApprovedMessage(null);
    setFeedbackRating(null);
    setFeedbackComment('');
    setFeedbackSubmitted(false);
    setFeedbackMessage(null);

    try {
      const res = await apiFetch<any>(`/api/ai-reports/latest?type=${type}`);
      const data = res?.data ?? res;
      if (data?.reportId) {
        setReportId(data.reportId);
        setReportDate(data.reportDate);
        setStatus(data.status || 'DRAFT');
        setMarkdownText(data.humanFinalText || data.aiDraftText || '');
        setMetrics(data.metrics);
        setProviderUsed(data.providerUsed || 'gemini');
        setModelUsed(data.modelUsed || 'gemini-3.8-flash');
        if (data?.timings?.totalMs) {
          const sec = Math.round(data.timings.totalMs / 1000);
          if (sec >= 5 && sec <= 60) {
            setEstimatedDuration(sec);
          }
        }
      } else {
        await handleGenerate(type);
      }
    } catch {
      await handleGenerate(type);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (type: 'DAILY' | 'WEEKLY' | 'MONTHLY') => {
    setLoading(true);
    setApprovedMessage(null);
    try {
      const res = await apiFetch<any>('/api/ai-reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: type, siteId: 1 }),
      });
      const data = res?.data ?? res;
      if (data?.reportId) {
        setReportId(data.reportId);
        setReportDate(data.reportDate);
        setStatus(data.status || 'DRAFT');
        setMarkdownText(data.aiDraftText || '');
        setMetrics(data.metrics);
        setProviderUsed(data.providerUsed || 'gemini');
        setModelUsed(data.modelUsed || 'gemini-3.8-flash');
        if (data?.timings?.totalMs) {
          const sec = Math.round(data.timings.totalMs / 1000);
          if (sec >= 5 && sec <= 60) {
            setEstimatedDuration(sec);
          }
        }
      }
    } catch (e: any) {
      console.error('Failed to generate report:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!reportId) return;
    setApproving(true);
    try {
      const res = await apiFetch<any>(`/api/ai-reports/${reportId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ humanFinalText: markdownText }),
      });
      const data = res?.data ?? res;
      if (data?.success) {
        setStatus('APPROVED');
        setIsEditing(false);
        setApprovedMessage('อนุมัติและบันทึกรายงานเป็นต้นแบบ Golden Example สำหรับระบบ AI แล้ว');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApproving(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!reportId || !feedbackRating) return;
    try {
      const res = await apiFetch<any>(`/api/ai-reports/${reportId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: feedbackRating, comment: feedbackComment }),
      });
      const data = res?.data ?? res;
      setFeedbackSubmitted(true);
      setFeedbackMessage(data?.message || 'บันทึกความคิดเห็นแล้ว');
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = () => {
    if (!markdownText) return;
    navigator.clipboard.writeText(markdownText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Intercept Ctrl+P / Cmd+P while drawer is open to use the isolated print iframe
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handlePrint = () => {
    const reportElem = document.getElementById('printable-executive-report');
    if (!reportElem) {
      window.print();
      return;
    }

    // Clean up any old print iframe
    const oldIframe = document.getElementById('executive-print-frame');
    if (oldIframe) {
      oldIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'executive-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '100vw';
    iframe.style.height = '100vh';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Clone ONLY external stylesheet links (Tailwind CSS, fonts)
    // NEVER copy inline styled-jsx or existing print stylesheets that contain body > *:not(...) hide rules
    const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const stylesHtml = linkElements.map((el) => el.outerHTML).join('\n');

    const clonedContent = reportElem.cloneNode(true) as HTMLElement;

    // Build standalone HTML with dedicated print typography, parent styles, and zero flex clipping
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="utf-8" />
        <title>รายงานสถานการณ์ความมั่นคงปลอดภัย - Western Digital & PCS</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&family=Sarabun:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        ${stylesHtml}
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: 'Prompt', 'Sarabun', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif !important;
            font-size: 9pt !important;
            line-height: 1.55 !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            visibility: visible !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }
          body * {
            visibility: visible !important;
          }
          #print-root {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            visibility: visible !important;
          }
          #printable-executive-report {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: #ffffff !important;
            display: block !important;
            visibility: visible !important;
          }
          /* Page break controls */
          .report-page-break {
            break-before: page !important;
            page-break-before: always !important;
            margin-top: 0 !important;
            padding-top: 6px !important;
          }
          .avoid-break, .kpi-grid, table, .sign-off-block, .sign-off-box, .action-item-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Prompt', 'Sarabun', sans-serif !important;
            color: #0f172a !important;
            line-height: 1.35 !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          h1 { font-size: 13.5pt !important; font-weight: 700 !important; margin: 0 0 3px 0 !important; }
          h2 { font-size: 11.5pt !important; font-weight: 700 !important; margin: 10px 0 3px 0 !important; }
          h3 { font-size: 10pt !important; font-weight: 700 !important; margin: 8px 0 3px 0 !important; }
          h4 { font-size: 9pt !important; font-weight: 600 !important; margin: 6px 0 3px 0 !important; }
          p, div, li, td, th {
            line-height: 1.55 !important;
          }
          p {
            margin: 0.25em 0 !important;
          }
          hr {
            display: none !important;
          }
          /* All scroll containers unrolled */
          div, section, article {
            overflow: visible !important;
            max-height: none !important;
          }
          /* Header Logos */
          .header-logos {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding-bottom: 8px !important;
            border-bottom: 2px solid #cbd5e1 !important;
          }
          /* Metadata Strip */
          .metadata-strip {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 5px 10px !important;
            border-radius: 6px !important;
            background-color: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            font-size: 8pt !important;
            margin: 6px 0 10px 0 !important;
          }
          /* 6 KPI Cards */
          .kpi-grid {
            display: grid !important;
            grid-template-columns: repeat(6, 1fr) !important;
            gap: 6px !important;
            margin: 4px 0 10px 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .kpi-card {
            padding: 6px 4px !important;
            border-radius: 6px !important;
            border: 1px solid #cbd5e1 !important;
            background-color: #f8fafc !important;
            text-align: center !important;
          }
          .kpi-card .text-base {
            font-size: 11pt !important;
            font-weight: 800 !important;
            line-height: 1.2 !important;
          }
          .kpi-card p {
            margin: 1px 0 !important;
          }
          /* Table Layout & Alignment */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            margin: 8px 0 !important;
            font-size: 8pt !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 5px 6px !important;
            vertical-align: middle !important;
            line-height: 1.4 !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 700 !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc !important;
          }
          th.text-center, td.text-center, .text-center {
            text-align: center !important;
          }
          th.text-left, td.text-left, .text-left {
            text-align: left !important;
          }
          th.text-right, td.text-right, .text-right {
            text-align: right !important;
          }
          /* Fix Lucide SVGs */
          svg {
            display: inline-block !important;
            vertical-align: middle !important;
            flex-shrink: 0 !important;
          }
          svg.w-3\\.5 { width: 14px !important; height: 14px !important; }
          svg.w-4 { width: 16px !important; height: 16px !important; }
          svg.w-5 { width: 20px !important; height: 20px !important; }
          span[class*="inline-block"], span[class*="inline-flex"] {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            vertical-align: middle !important;
            line-height: 1.2 !important;
          }
          /* Action Cards */
          .action-item-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 4px 0 !important;
            padding: 6px 8px !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            background-color: #f8fafc !important;
            font-size: 8.5pt !important;
            line-height: 1.45 !important;
          }
          /* Logos */
          img {
            max-height: 40px !important;
            width: auto !important;
            object-fit: contain !important;
          }
          /* Sign-Off Block */
          .sign-off-block {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 14px !important;
            margin-top: 16px !important;
            padding-top: 12px !important;
            border-top: 2px solid #cbd5e1 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .sign-off-box {
            padding: 10px 12px !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            background-color: #f8fafc !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .legal-footer {
            margin-top: 10px !important;
            padding-top: 6px !important;
            border-top: 1px solid #e2e8f0 !important;
            text-align: center !important;
            font-size: 7.5pt !important;
            color: #64748b !important;
          }
        </style>
      </head>
      <body>
        <div id="print-root">
          ${clonedContent.outerHTML}
        </div>
      </body>
      </html>
    `);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print execution error:', err);
      }
    };

    if (iframe.contentWindow?.document.fonts) {
      iframe.contentWindow.document.fonts.ready
        .then(() => setTimeout(triggerPrint, 350))
        .catch(() => setTimeout(triggerPrint, 500));
    } else {
      setTimeout(triggerPrint, 500);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Global Print Stylesheet for Direct Browser Ctrl+P Fallback */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          html, body {
            background: #fff !important;
            color: #0f172a !important;
            font-family: 'Prompt', 'Sarabun', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif !important;
            font-size: 9pt !important;
            line-height: 1.55 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          nav, header, aside, button, .no-print {
            display: none !important;
          }
          #ai-report-drawer-overlay {
            position: static !important;
            inset: auto !important;
            background: transparent !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            backdrop-filter: none !important;
          }
          #ai-report-drawer-overlay > div {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            height: auto !important;
            background: #fff !important;
          }
          #ai-report-drawer-overlay .overflow-y-auto {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
            background: transparent !important;
          }
          #printable-executive-report {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          /* Page break controls */
          .report-page-break {
            break-before: page !important;
            page-break-before: always !important;
            margin-top: 0 !important;
            padding-top: 6px !important;
          }
          .avoid-break, .kpi-grid, table, .sign-off-block, .sign-off-box, .action-item-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Prompt', 'Sarabun', sans-serif !important;
            color: #0f172a !important;
            line-height: 1.35 !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          h1 { font-size: 13.5pt !important; font-weight: 700 !important; margin: 0 0 3px 0 !important; }
          h2 { font-size: 11.5pt !important; font-weight: 700 !important; margin: 10px 0 3px 0 !important; }
          h3 { font-size: 10pt !important; font-weight: 700 !important; margin: 8px 0 3px 0 !important; }
          h4 { font-size: 9pt !important; font-weight: 600 !important; margin: 6px 0 3px 0 !important; }
          p, div, li, td, th {
            line-height: 1.55 !important;
          }
          p {
            margin: 0.25em 0 !important;
          }
          hr {
            display: none !important;
          }
          /* Header Logos */
          .header-logos {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding-bottom: 8px !important;
            border-bottom: 2px solid #cbd5e1 !important;
          }
          /* Metadata Strip */
          .metadata-strip {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 5px 10px !important;
            border-radius: 6px !important;
            background-color: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            font-size: 8pt !important;
            margin: 6px 0 10px 0 !important;
          }
          /* 6 KPI Cards */
          .kpi-grid {
            display: grid !important;
            grid-template-columns: repeat(6, 1fr) !important;
            gap: 6px !important;
            margin: 4px 0 10px 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .kpi-card {
            padding: 6px 4px !important;
            border-radius: 6px !important;
            border: 1px solid #cbd5e1 !important;
            background-color: #f8fafc !important;
            text-align: center !important;
          }
          .kpi-card .text-base {
            font-size: 11pt !important;
            font-weight: 800 !important;
            line-height: 1.2 !important;
          }
          .kpi-card p {
            margin: 1px 0 !important;
          }
          /* Table Layout & Alignment */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            margin: 8px 0 !important;
            font-size: 8pt !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 5px 6px !important;
            vertical-align: middle !important;
            line-height: 1.4 !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 700 !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc !important;
          }
          th.text-center, td.text-center, .text-center {
            text-align: center !important;
          }
          th.text-left, td.text-left, .text-left {
            text-align: left !important;
          }
          th.text-right, td.text-right, .text-right {
            text-align: right !important;
          }
          /* Fix Lucide SVGs */
          svg {
            display: inline-block !important;
            vertical-align: middle !important;
            flex-shrink: 0 !important;
          }
          svg.w-3\\.5 { width: 14px !important; height: 14px !important; }
          svg.w-4 { width: 16px !important; height: 16px !important; }
          svg.w-5 { width: 20px !important; height: 20px !important; }
          span[class*="inline-block"], span[class*="inline-flex"] {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            vertical-align: middle !important;
            line-height: 1.2 !important;
          }
          /* Action Cards */
          .action-item-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 4px 0 !important;
            padding: 6px 8px !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            background-color: #f8fafc !important;
            font-size: 8.5pt !important;
            line-height: 1.45 !important;
          }
          /* Logos */
          img {
            max-height: 40px !important;
            width: auto !important;
            object-fit: contain !important;
          }
          /* Sign-Off Block */
          .sign-off-block {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 14px !important;
            margin-top: 16px !important;
            padding-top: 12px !important;
            border-top: 2px solid #cbd5e1 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .sign-off-box {
            padding: 10px 12px !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            background-color: #f8fafc !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .legal-footer {
            margin-top: 10px !important;
            padding-top: 6px !important;
            border-top: 1px solid #e2e8f0 !important;
            text-align: center !important;
            font-size: 7.5pt !important;
            color: #64748b !important;
          }
        }
      `}</style>

      <div
        id="ai-report-drawer-overlay"
        className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
      >
        <div
          className="w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Top Header (UI Shell) */}
          <div className="no-print px-6 py-4 border-b border-slate-200 bg-linear-to-r from-blue-900 via-blue-800 to-indigo-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-wide">
                    AI Smart Executive Security Report
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-300/40 text-blue-100 font-semibold">
                    WD {siteCode}
                  </span>
                  {modelUsed && (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-300/40 text-indigo-100 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>{modelUsed}</span>
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold ${
                      status === 'APPROVED'
                        ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50'
                        : 'bg-amber-500/30 text-amber-200 border border-amber-400/50'
                    }`}
                  >
                    {status === 'APPROVED' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                        <span>APPROVED (ต้นแบบ)</span>
                      </>
                    ) : (
                      <span>DRAFT (ฉบับร่าง)</span>
                    )}
                  </span>
                </div>
                <p className="text-xs text-blue-200">
                  ระบบรายงานอัจฉริยะ 4 เสาหลัก • Western Digital SOC ร่วมกับ PCS Security
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors border border-white/15"
                >
                  <Settings className="w-3.5 h-3.5 text-white/90" />
                  <span>ตั้งค่า AI & Presets</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab Selection & Control Bar */}
          <div className="no-print px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {/* Daily / Weekly / Monthly Tabs */}
            <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
              {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((tab) => {
                const TabIcon = tab === 'DAILY' ? Sun : tab === 'WEEKLY' ? Calendar : BarChart3;
                const label = tab === 'DAILY' ? 'ประจำวัน' : tab === 'WEEKLY' ? 'ประจำสัปดาห์' : 'ประจำเดือน';
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setReportType(tab)}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      reportType === tab
                        ? 'bg-white text-[#0052CC] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleGenerate(reportType)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                <span>ร่างใหม่</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  isEditing
                    ? 'bg-blue-50 border-blue-300 text-[#0052CC]'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                <span>{isEditing ? 'ดูเอกสารผู้บริหาร' : 'แก้ไขข้อความ (Editor)'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์รายงาน (Print)</span>
              </button>
            </div>
          </div>

          {/* Telemetry Quick Bar */}
          {metrics && (
            <div className="no-print px-6 py-2 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs text-slate-700 overflow-x-auto gap-4">
              <div className="flex items-center gap-1.5 font-medium shrink-0">
                <HardHat className="w-4 h-4 text-blue-600" />
                <span>
                  กำลังพล: <strong>{metrics.guards?.totalActive}/{metrics.guards?.totalContract} นาย ({metrics.guards?.slaPercentage}%)</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-medium shrink-0">
                <Car className="w-4 h-4 text-indigo-600" />
                <span>ที่จอดรถ: <strong>{metrics.parking?.occupancyRate}%</strong></span>
              </div>
              <div className="flex items-center gap-1.5 font-medium shrink-0">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>CCTV ออนไลน์: <strong>{metrics.surveillance?.cctvOnlineRate}%</strong></span>
              </div>
              <div className="flex items-center gap-1.5 font-medium shrink-0">
                <Database className="w-4 h-4 text-purple-600" />
                <span>NVR SLA 62 วัน: <strong>{metrics.surveillance?.nvrComplianceRate}%</strong></span>
              </div>
              <div className="flex items-center gap-1.5 font-medium shrink-0">
                <Radio className="w-4 h-4 text-amber-600" />
                <span>วิทยุสื่อสาร: <strong>{metrics.radio?.workingRate}%</strong></span>
              </div>
            </div>
          )}

          {/* Notification Alert */}
          {approvedMessage && (
            <div className="no-print mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{approvedMessage}</span>
            </div>
          )}

          {/* Main Content Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60">
            {loading ? (
              <AiReportProgressBar
                reportType={reportType}
                modelUsed={modelUsed || 'gemini-3.8-flash'}
                providerUsed={providerUsed || 'gemini'}
                estimatedDurationSeconds={estimatedDuration}
              />
            ) : isEditing ? (
              /* Edit Markdown Mode */
              <div className="h-full flex flex-col space-y-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>แก้ไขเนื้อหารายงาน (Markdown Editor):</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    แก้ไขข้อความทั้ง 4 ส่วนตามที่ต้องการก่อนกด "อนุมัติและบันทึกเป็นต้นแบบ"
                  </span>
                </label>
                <textarea
                  value={markdownText}
                  onChange={(e) => setMarkdownText(e.target.value)}
                  rows={24}
                  className="w-full flex-1 p-4 rounded-xl border border-slate-300 font-mono text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none leading-relaxed resize-none shadow-inner"
                />
              </div>
            ) : (
              /* Executive Document View */
              <div
                id="printable-executive-report"
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-6 max-w-4xl mx-auto"
              >
                {/* 1. Official Header with Dual Logos */}
                <div className="header-logos flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b-2 border-slate-200">
                  {/* Left: Western Digital Logo */}
                  <div className="flex items-center gap-3">
                    <img
                      src="/report_assets/Images/images_logo.png"
                      alt="Western Digital"
                      className="h-10 sm:h-12 w-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/report_assets/Images/WD_logo.png';
                      }}
                    />
                    <div className="hidden sm:block border-l border-slate-200 pl-3">
                      <p className="text-[11px] font-bold tracking-wider text-slate-900 uppercase">
                        Western Digital
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Storage Technologies (Thailand)
                      </p>
                    </div>
                  </div>

                  {/* Center: Title & Subtitle */}
                  <div className="text-center">
                    <span className="inline-block px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#0052CC] font-mono text-[10px] font-bold uppercase tracking-wider mb-1">
                      Security Operations Center (SOC)
                    </span>
                    <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                      รายงานสถานการณ์ความมั่นคงปลอดภัย{reportType === 'DAILY' ? 'ประจำวัน' : reportType === 'WEEKLY' ? 'ประจำสัปดาห์' : 'ประจำเดือน'}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      Executive Security Briefing • Western Digital ({siteCode})
                    </p>
                  </div>

                  {/* Right: PCS Security Logo */}
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block text-right border-r border-slate-200 pr-3">
                      <p className="text-[11px] font-bold tracking-wider text-slate-900 uppercase">
                        PCS Security
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">Facility Services</p>
                    </div>
                    <img
                      src="/report_assets/Images/PCS_logo.png"
                      alt="PCS Security"
                      className="h-10 sm:h-12 w-auto object-contain"
                    />
                  </div>
                </div>

                {/* 2. Document Metadata Strip */}
                <div className="metadata-strip flex flex-wrap items-center justify-between gap-3 py-3 px-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">วันที่รายงาน:</span>
                    <span className="font-bold text-slate-900">{formatSafeDisplayDate(reportDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">ขอบเขตพื้นที่:</span>
                    <span className="font-mono text-slate-900 font-bold">Western Digital ({siteCode})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">ระดับความลับ:</span>
                    <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-mono text-[10px] font-bold">
                      CONFIDENTIAL / SOC INTERNAL
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">สถานะเอกสาร:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] font-mono border ${
                        status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}
                    >
                      {status === 'APPROVED' ? 'APPROVED (ต้นแบบเรียนรู้ AI)' : 'DRAFT (รอการอนุมัติ)'}
                    </span>
                  </div>
                </div>

                {/* 3. Executive Telemetry Summary Cards */}
                {metrics && (
                  <div className="kpi-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 avoid-break">
                    <div className="kpi-card p-3 rounded-xl bg-blue-50/60 border border-blue-200/70">
                      <div className="flex items-center justify-between text-blue-700 mb-1">
                        <span className="text-[10px] font-bold">กำลังพล รปภ.</span>
                        <HardHat className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-base font-extrabold text-slate-900">
                        {metrics.guards?.slaPercentage}%
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {metrics.guards?.totalActive}/{metrics.guards?.totalContract} นาย
                      </p>
                    </div>

                    <div className="kpi-card p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/70">
                      <div className="flex items-center justify-between text-indigo-700 mb-1">
                        <span className="text-[10px] font-bold">ลานจอดรถ</span>
                        <Car className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-base font-extrabold text-slate-900">
                        {metrics.parking?.occupancyRate}%
                      </p>
                      <p className="text-[10px] text-slate-500">อัตราการครองพื้นที่</p>
                    </div>

                    <div className="kpi-card p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
                      <div className="flex items-center justify-between text-emerald-700 mb-1">
                        <span className="text-[10px] font-bold">CCTV ออนไลน์</span>
                        <Camera className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-base font-extrabold text-slate-900">
                        {metrics.surveillance?.cctvOnlineRate}%
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {metrics.surveillance?.cctvOnline}/{metrics.surveillance?.cctvTotal} ตัว
                      </p>
                    </div>

                    <div className="kpi-card p-3 rounded-xl bg-purple-50/60 border border-purple-200/70">
                      <div className="flex items-center justify-between text-purple-700 mb-1">
                        <span className="text-[10px] font-bold">NVR 62-Day SLA</span>
                        <Database className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-base font-extrabold text-slate-900">
                        {metrics.surveillance?.nvrComplianceRate}%
                      </p>
                      <p className="text-[10px] text-slate-500">
                        ผ่าน {metrics.surveillance?.nvrPassedSla}/{metrics.surveillance?.nvrTotal}
                      </p>
                    </div>

                    <div className="kpi-card p-3 rounded-xl bg-teal-50/60 border border-teal-200/70">
                      <div className="flex items-center justify-between text-teal-700 mb-1">
                        <span className="text-[10px] font-bold">ตรวจค้นโลหะ</span>
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-base font-extrabold text-slate-900">100%</p>
                      <p className="text-[10px] text-slate-500">Walkthrough & Handheld</p>
                    </div>

                    <div className="kpi-card p-3 rounded-xl bg-amber-50/60 border border-amber-200/70">
                      <div className="flex items-center justify-between text-amber-700 mb-1">
                        <span className="text-[10px] font-bold">วิทยุสื่อสาร</span>
                        <Radio className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-base font-extrabold text-slate-900">
                        {metrics.radio?.workingRate}%
                      </p>
                      <p className="text-[10px] text-slate-500">
                        พร้อม {metrics.radio?.totalWorking}/{metrics.radio?.totalChecked}
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. Rendered Structured Document Content (4 Pillars) */}
                <div className="pt-2 text-slate-800 leading-relaxed font-sans">
                  {renderMarkdownDocument(markdownText)}
                </div>

                {/* 5. Dual Official Sign-Off Block */}
                <div className="sign-off-block mt-12 pt-8 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 avoid-break">
                  {/* Signature 1: PCS */}
                  <div className="sign-off-box p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        ผู้ตรวจทานและรับรองรายงาน (Prepared & Verified By)
                      </span>
                      <div className="h-14 border-b border-dashed border-slate-300 flex items-end justify-center pb-1">
                        <span className="text-xs font-mono text-slate-400 italic">
                          {status === 'APPROVED' ? '[ E-Verified: PCS SOC Operations Lead ]' : '(ลงนามผู้ตรวจทาน)'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-700 space-y-0.5">
                      <p className="font-bold">ผู้จัดการฝ่ายปฏิบัติการรักษาความปลอดภัย</p>
                      <p className="text-slate-500 text-[11px]">PCS Security and Facility Services</p>
                      <p className="text-slate-400 text-[10px]">
                        วันที่: {reportDate || '............................'}
                      </p>
                    </div>
                  </div>

                  {/* Signature 2: Western Digital */}
                  <div className="sign-off-box p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        ผู้อนุมัติรายงาน (Approved By)
                      </span>
                      <div className="h-14 border-b border-dashed border-slate-300 flex items-end justify-center pb-1">
                        <span className="text-xs font-mono text-slate-400 italic">
                          {status === 'APPROVED' ? '[ E-Approved: Site Security Director WD ]' : '(ลงนามผู้อนุมัติ)'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-700 space-y-0.5">
                      <p className="font-bold">ผู้อำนวยการฝ่ายความมั่นคงปลอดภัยโรงงาน</p>
                      <p className="text-slate-500 text-[11px]">
                        Western Digital Storage Technologies (Thailand)
                      </p>
                      <p className="text-slate-400 text-[10px]">
                        วันที่: {reportDate || '............................'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 6. Legal & PDPA Compliance Disclaimer */}
                <div className="legal-footer mt-6 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
                  เอกสารนี้เป็นความลับเฉพาะศูนย์ Security Operations Center (SOC) โรงงาน Western Digital ({siteCode}) 
                  ร่วมกับ PCS Security ข้อมูลพนักงานและข้อมูลส่วนบุคคลได้รับการคุ้มครองตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
                </div>
              </div>
            )}
          </div>

          {/* Human-in-the-Loop Feedback & Approval Footer */}
          <div className="no-print px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Feedback Rating & Comment */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-700">ประเมินคุณภาพ AI:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackRating('UP');
                    setFeedbackSubmitted(false);
                  }}
                  className={`p-2 rounded-lg border transition-all ${
                    feedbackRating === 'UP'
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-800 shadow-xs'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="รายงานถูกต้อง ครบถ้วน 4 เสาหลัก"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackRating('DOWN');
                    setFeedbackSubmitted(false);
                  }}
                  className={`p-2 rounded-lg border transition-all ${
                    feedbackRating === 'DOWN'
                      ? 'bg-rose-100 border-rose-400 text-rose-800 shadow-xs'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="ต้องปรับปรุงเนื้อหาหรือภาษา"
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>

              {feedbackRating && !feedbackSubmitted && (
                <div className="flex items-center gap-1.5 flex-1 sm:w-72 animate-in fade-in">
                  <input
                    type="text"
                    placeholder={
                      feedbackRating === 'DOWN'
                        ? 'ระบุสิ่งที่ควรปรับปรุง (AI จะสกัดเป็นกฎเรียนรู้)...'
                        : 'ระบุคำแนะนำเพิ่มเติม...'
                    }
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendFeedback}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0052CC] hover:bg-[#00388A] text-white text-xs font-medium flex items-center gap-1 shrink-0"
                  >
                    <Send className="w-3 h-3" />
                    <span>ส่ง</span>
                  </button>
                </div>
              )}

              {feedbackSubmitted && feedbackMessage && (
                <span className="text-xs font-medium text-emerald-700 animate-in fade-in">
                  {feedbackMessage}
                </span>
              )}
            </div>

            {/* Primary Action Button: Approve & Learn */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                disabled={approving || status === 'APPROVED'}
                onClick={handleApprove}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {status === 'APPROVED'
                    ? 'อนุมัติแล้ว (เป็นต้นแบบ AI)'
                    : 'อนุมัติและบันทึกเป็นต้นแบบ (Approve & Learn)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}