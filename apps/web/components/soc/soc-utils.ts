/** Shared helpers for the SOC dashboard. */

export interface ZoneStat {
  name: string;
  pass: number;
  fail: number;
}

export interface CheckStat {
  pass: number;
  fail: number;
}

export interface RadioProblem {
  assetNumber: string;
  brand: string | null;
  status: 'missing' | 'broken';
  remark: string | null;
}

export interface RadioSummary {
  hasData: boolean;
  checked: number;
  present: number;
  working: number;
  failed: number;
  missing: number;
  broken: number;
  totalReports: number;
  shift: string | null;
  inspectorName: string | null;
  inspectionDate: string | null;
  problems: RadioProblem[];
}

export const EMPTY_RADIO: RadioSummary = {
  hasData: false,
  checked: 0,
  present: 0,
  working: 0,
  failed: 0,
  missing: 0,
  broken: 0,
  totalReports: 0,
  shift: null,
  inspectorName: null,
  inspectionDate: null,
  problems: [],
};

/**
 * Weighted overall system health score (0-100).
 * Components WITHOUT data are excluded and remaining weights renormalized,
 * so an empty system never reports a fake 100%.
 * Returns null when nothing has data yet.
 */
export function calcHealthScore(input: {
  cctvOnline: number;
  cctvTotal: number;
  nvrPassed: number;
  nvrTotal: number;
  handheldPass: number;
  handheldFail: number;
  walkthroughPass: number;
  walkthroughFail: number;
  radioPass: number;
  radioFail: number;
  guardActive: number;
  guardContract: number;
}): number | null {
  const parts: { ratio: number; weight: number; hasData: boolean }[] = [
    { ratio: input.cctvTotal > 0 ? input.cctvOnline / input.cctvTotal : 0, weight: 30, hasData: input.cctvTotal > 0 },
    { ratio: input.nvrTotal > 0 ? input.nvrPassed / input.nvrTotal : 0, weight: 25, hasData: input.nvrTotal > 0 },
    {
      ratio: input.handheldPass + input.handheldFail > 0 ? input.handheldPass / (input.handheldPass + input.handheldFail) : 0,
      weight: 15,
      hasData: input.handheldPass + input.handheldFail > 0,
    },
    {
      ratio: input.walkthroughPass + input.walkthroughFail > 0 ? input.walkthroughPass / (input.walkthroughPass + input.walkthroughFail) : 0,
      weight: 15,
      hasData: input.walkthroughPass + input.walkthroughFail > 0,
    },
    {
      ratio: input.radioPass + input.radioFail > 0 ? input.radioPass / (input.radioPass + input.radioFail) : 0,
      weight: 10,
      hasData: input.radioPass + input.radioFail > 0,
    },
    { ratio: input.guardContract > 0 ? input.guardActive / input.guardContract : 0, weight: 15, hasData: input.guardContract > 0 },
  ];
  const used = parts.filter((p) => p.hasData);
  if (used.length === 0) return null;
  const totalWeight = used.reduce((a, p) => a + p.weight, 0);
  const score = used.reduce((a, p) => a + Math.min(1, p.ratio) * p.weight, 0);
  return Math.round((score / totalWeight) * 100);
}

/** Parse a Thai parking-lot key like "ลานรถยนต์ L1 (97 Slot)" into a short bilingual label + capacity. */
export function parseLotKey(key: string, fallbackPrefix: string): { label: string; capacity: number } {
  const capMatch = key.match(/\((\d+)\s*Slot\)/i);
  const capacity = capMatch ? parseInt(capMatch[1], 10) : 0;
  const short = key
    .replace('ลานรถยนต์', '')
    .replace('ลานจอด', '')
    .replace(/\s*\(\d+\s*Slot\)/i, '')
    .trim();
  // Bare lot numbers ("1", "3/1", "B.9") get an "L" prefix to match the SOC mockup (L1, L2…).
  const label = /^[0-9B]/i.test(short) ? `L${short}` : short;
  return { label: label || `${fallbackPrefix}${key}`, capacity };
}

/** Last-7-days axis labels: [{ day: 'Mon', date: '2/9' }], oldest first. */
export function last7Days(): { day: string; date: string }[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const out: { day: string; date: string }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push({ day: days[d.getDay()], date: `${d.getDate()}/${d.getMonth() + 1}` });
  }
  return out;
}

/** Pad/truncate a history array to exactly 7 numeric points (oldest first). */
export function to7Points(history: (number | null)[], fallback: number): number[] {
  const clean = history.filter((v): v is number => typeof v === 'number' && !isNaN(v));
  const last7 = clean.slice(-7);
  while (last7.length < 7) last7.unshift(fallback);
  return last7;
}

export function formatTimeTH(dateStr: string | null | undefined): string {
  if (!dateStr) return 'ยังไม่มีข้อมูล';
  const str = String(dateStr).trim();
  if (
    str.toUpperCase().includes('INVALID') ||
    str === 'null' ||
    str === 'undefined' ||
    str === 'NaN' ||
    str === '-'
  ) {
    return 'ยังไม่มีข้อมูล';
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'ยังไม่มีข้อมูล';
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - d.getTime()) / 60000);
  const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  if (diffMinutes < 1) return `เมื่อสักครู่ (${timeStr})`;
  if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว (${timeStr})`;
  if (d.toDateString() === now.toDateString()) return `วันนี้ ${timeStr}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `เมื่อวาน ${timeStr}`;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${timeStr}`;
}

