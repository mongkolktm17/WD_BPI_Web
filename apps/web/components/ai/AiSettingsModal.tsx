'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Save,
  Check,
  Plus,
  Trash2,
  Building2,
  Shield,
  BookOpen,
  Key,
  Layers,
  Cpu,
  Sliders,
  FileText,
  RotateCcw,
  RefreshCw,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PromptPresetItem {
  id: string;
  title: string;
  tag: string;
  tagColor: string;
  desc: string;
  template: string;
}

const PROMPT_PRESETS: PromptPresetItem[] = [
  {
    id: 'standard',
    title: 'รายงานผู้บริหารมาตรฐาน 4 มิติ (Executive 4-Pillars Overview)',
    tag: 'มาตรฐาน 4 ส่วนหลัก',
    tagColor: 'bg-blue-100 text-blue-700 border-blue-200',
    desc: 'รายงานครบ 4 ส่วนหลัก: 1) รายงานข้อมูล 2) วิเคราะห์สถานการณ์ 3) ประเมินความเสี่ยง 4) แนะนำการปรับปรุง',
    template: `คุณคือผู้อำนวยการฝ่ายความมั่นคงปลอดภัยระดับสูงของศูนย์ SOC Western Digital (BPI & PRB) ปฏิบัติการร่วมกับ PCS Security
ร่างรายงานฉบับสมบูรณ์ประกอบด้วย 4 ส่วนหลัก:
1. รายงานข้อมูล (สรุปตัวเลข KPI ละเอียด)
2. วิเคราะห์สถานการณ์ (เปรียบเทียบแนวโน้ม 7 วัน และความเสถียรของระบบ)
3. ประเมินความเสี่ยง (ระบุช่องโหว่และระดับความเสี่ยงตาม Risk Matrix)
4. แนะนำการปรับปรุง (มาตรการเร่งด่วน 24 ชม. และแผนระยะยาวพร้อมระบุผู้รับผิดชอบ)`,
  },
  {
    id: 'compliance',
    title: 'การปฏิบัติตามกฎและข้อบังคับ (Strict Compliance & SLA Audit)',
    tag: 'SLA 62 วัน & สัญญา PCS',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    desc: 'มุ่งเน้นการตรวจสอบการปฏิบัติตามสัญญาการรักษาความปลอดภัย (PCS) และเกณฑ์ SLA บันทึกภาพ NVR ไม่น้อยกว่า 62 วัน',
    template: `มุ่งเน้นการตรวจสอบความสอดคล้องกับระเบียบปฏิบัติ (Compliance Audit) อย่างเคร่งครัด
- ตรวจสอบความถูกต้องของ NVR 62-Day SLA ย้อนหลังทุกเครื่อง
- สรุปผลการคัดกรองบุคคลและโลหะต้องห้ามตามมาตรฐานโรงงาน Western Digital
- ตรวจสอบการจัดสรรกำลังพล รปภ. ตามกรอบสัญญาการจ้างงาน`,
  },
  {
    id: 'incident_risk',
    title: 'เฝ้าระวังเหตุฉุกเฉินและความเสี่ยงสูง (Critical Incident & Risk Matrix)',
    tag: 'Tier 1 Zones (B2, B4, B9)',
    tagColor: 'bg-rose-100 text-rose-800 border-rose-200',
    desc: 'เน้นการระบุจุดเสี่ยงวิกฤต อาคารความมั่นคงสูง (B2, B4, B9) การประเมินผลกระทบ และแผนเผชิญเหตุฉุกเฉิน',
    template: `มุ่งเน้นการประเมินจุดเสี่ยงวิกฤต (Single Points of Failure) ในพื้นที่อาคารความมั่นคงสูง Tier 1 (B2, B4, B9)
- ระบุกล้อง CCTV ที่ดับในจุดสำคัญ และประเมินผลกระทบต่อความมั่นคงของโรงงาน
- จำลองผลกระทบและกำหนดแผนเผชิญเหตุฉุกเฉินกรณีระบบเฝ้าระวังหรืออุปกรณ์ตรวจค้นขัดข้อง
- กำหนดระดับความเสี่ยง (CRITICAL / HIGH / MEDIUM / LOW) อย่างเคร่งครัด`,
  },
  {
    id: 'efficiency',
    title: 'การบริหารทรัพยากรและกำลังพล (Guard Logistics & Operational Efficiency)',
    tag: 'การจัดสรรกำลังพล & ลานจอดรถ',
    tagColor: 'bg-amber-100 text-amber-800 border-amber-200',
    desc: 'เน้นการบริหารจัดการกำลังพล รปภ. แต่ละกะ การใช้งานวิทยุสื่อสาร และประสิทธิภาพการระบายจราจรในลานจอดรถ',
    template: `วิเคราะห์ประสิทธิภาพการจัดสรรกำลังพล รปภ. ในแต่ละผลัดและจุดตรวจ
- วิเคราะห์ความจุลานจอดรถและการจัดการการจราจรช่วงเวลาเร่งด่วนเข้า-ออกงาน
- การควบคุมครุภัณฑ์วิทยุสื่อสารและการส่งซ่อมบำรุงเพื่อความพร้อมในการปฏิบัติการ 24 ชั่วโมง`,
  },
  {
    id: 'custom',
    title: 'กำหนดชุดคำสั่งเอง (Custom System Directives)',
    tag: 'อิสระ / ปรับแต่งเอง',
    tagColor: 'bg-purple-100 text-purple-800 border-purple-200',
    desc: 'เขียนหรือปรับแต่งคำสั่งสำหรับโมเดล AI เองอย่างอิสระตามความต้องการของหน่วยงาน SOC',
    template: '',
  },
];

const GEMINI_MODELS = [
  { value: 'gemini-3.8-flash', label: 'gemini-3.8-flash (แนะนำ / เรือธง 2026 ล่าสุด เร็วและฉลาดสูงสุด)' },
  { value: 'gemini-3.7-flash', label: 'gemini-3.7-flash (โมเดลอัจฉริยะรุ่นปรับปรุง 2026)' },
  { value: 'gemini-3.5-flash', label: 'gemini-3.5-flash (โมเดลความเร็วสูง)' },
  { value: 'gemini-3.1-pro-preview', label: 'gemini-3.1-pro-preview (การคิดเชิงเหตุผลขั้นสูง Reasoning)' },
  { value: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite (ประหยัดทรัพยากร รวดเร็ว)' },
  { value: 'gemini-flash-latest', label: 'gemini-flash-latest (เวอร์ชัน Flash อัปเดตล่าสุดเสมอ)' },
  { value: 'gemini-pro-latest', label: 'gemini-pro-latest (เวอร์ชัน Pro อัปเดตล่าสุดเสมอ)' },
  { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (รุ่นมาตรฐานเดิม)' },
  { value: 'custom', label: 'ระบุชื่อโมเดลเอง (Custom Model Name)...' },
];

const OPENAI_MODELS = [
  { value: 'o3-mini', label: 'o3-mini (แนะนำ / Reasoning ล่าสุด 2026 รวดเร็วและฉลาดสูง)' },
  { value: 'gpt-4.5', label: 'gpt-4.5 (โมเดลเรือธง Frontier)' },
  { value: 'gpt-4o', label: 'gpt-4o (โมเดลมาตรฐานระดับองค์กร Omni)' },
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini (ประหยัด รวดเร็ว)' },
  { value: 'o3', label: 'o3 (การอนุมานขั้นสูง Frontier Reasoning)' },
  { value: 'o1', label: 'o1 (โมเดลการคิดเชิงลึก)' },
  { value: 'custom', label: 'ระบุชื่อโมเดลเอง (Custom Model Name)...' },
];

const ANTHROPIC_MODELS = [
  { value: 'claude-3-7-sonnet-latest', label: 'claude-3-7-sonnet (แนะนำ / ล่าสุด 2025/2026 Hybrid Reasoning เรือธง)' },
  { value: 'claude-3-5-sonnet-latest', label: 'claude-3-5-sonnet (มาตรฐานการเขียนเชิงวิเคราะห์)' },
  { value: 'claude-3-5-haiku-latest', label: 'claude-3-5-haiku (รวดเร็ว คล่องตัวสูง)' },
  { value: 'claude-3-opus-latest', label: 'claude-3-opus (การประมวลผลเชิงลึก)' },
  { value: 'custom', label: 'ระบุชื่อโมเดลเอง (Custom Model Name)...' },
];

const GROK_MODELS = [
  { value: 'grok-3', label: 'grok-3 (แนะนำ / โมเดลเรือธงล่าสุด 2025/2026 จาก xAI)' },
  { value: 'grok-3-mini', label: 'grok-3-mini (โมเดลขนาดเล็ก ประสิทธิภาพการคิดสูง)' },
  { value: 'grok-2-latest', label: 'grok-2-latest (โมเดลมาตรฐาน xAI เสถียร)' },
  { value: 'grok-2-vision-1212', label: 'grok-2-vision (รองรับภาพและวิเคราะห์มัลติโมดอล)' },
  { value: 'custom', label: 'ระบุชื่อโมเดลเอง (Custom Model Name)...' },
];

export function AiSettingsModal({ isOpen, onClose }: AiSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'provider' | 'prompt' | 'context'>('provider');

  // Provider Settings State
  const [provider, setProvider] = useState('gemini');

  const [geminiModelList, setGeminiModelList] = useState(GEMINI_MODELS);
  const [geminiSelect, setGeminiSelect] = useState('gemini-3.8-flash');
  const [geminiCustom, setGeminiCustom] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [hasGeminiKey, setHasGeminiKey] = useState(false);

  const [openaiModelList, setOpenaiModelList] = useState(OPENAI_MODELS);
  const [openaiSelect, setOpenaiSelect] = useState('o3-mini');
  const [openaiCustom, setOpenaiCustom] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);

  const [anthropicSelect, setAnthropicSelect] = useState('claude-3-7-sonnet-latest');
  const [anthropicCustom, setAnthropicCustom] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);

  const [grokSelect, setGrokSelect] = useState('grok-3');
  const [grokCustom, setGrokCustom] = useState('');
  const [grokApiKey, setGrokApiKey] = useState('');
  const [hasGrokKey, setHasGrokKey] = useState(false);

  // Live Model Discovery & Connection Testing State
  const [fetchingModels, setFetchingModels] = useState<Record<string, boolean>>({});
  const [testingConnection, setTestingConnection] = useState<Record<string, boolean>>({});
  const [connectionResult, setConnectionResult] = useState<
    Record<string, { success: boolean; message: string; latencyMs?: number } | null>
  >({});

  // Prompt Preset & Custom Prompt State
  const [promptPreset, setPromptPreset] = useState('standard');
  const [customPrompt, setCustomPrompt] = useState('');

  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Context Rules State
  const [contextList, setContextList] = useState<any[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [newCategory, setNewCategory] = useState<'building_info' | 'strict_rule' | 'glossary'>('building_info');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [addingRule, setAddingRule] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadSettings();
    loadContext();
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const res = await apiFetch<any>('/api/ai-reports/settings');
      const data = res?.data ?? res;
      if (data) {
        setProvider(data.provider || 'gemini');

        // Gemini model mapping
        const gModel = data.geminiModel || 'gemini-3.8-flash';
        if (geminiModelList.some((m) => m.value === gModel && m.value !== 'custom')) {
          setGeminiSelect(gModel);
          setGeminiCustom('');
        } else {
          setGeminiSelect('custom');
          setGeminiCustom(gModel);
        }
        setHasGeminiKey(Boolean(data.hasGeminiKey));

        // OpenAI model mapping
        const oModel = data.openaiModel || 'o3-mini';
        if (openaiModelList.some((m) => m.value === oModel && m.value !== 'custom')) {
          setOpenaiSelect(oModel);
          setOpenaiCustom('');
        } else {
          setOpenaiSelect('custom');
          setOpenaiCustom(oModel);
        }
        setHasOpenaiKey(Boolean(data.hasOpenaiKey));

        // Anthropic Claude model mapping
        const aModel = data.anthropicModel || 'claude-3-7-sonnet-latest';
        if (ANTHROPIC_MODELS.some((m) => m.value === aModel && m.value !== 'custom')) {
          setAnthropicSelect(aModel);
          setAnthropicCustom('');
        } else {
          setAnthropicSelect('custom');
          setAnthropicCustom(aModel);
        }
        setHasAnthropicKey(Boolean(data.hasAnthropicKey));

        // Grok model mapping
        const grModel = data.grokModel || 'grok-3';
        if (GROK_MODELS.some((m) => m.value === grModel && m.value !== 'custom')) {
          setGrokSelect(grModel);
          setGrokCustom('');
        } else {
          setGrokSelect('custom');
          setGrokCustom(grModel);
        }
        setHasGrokKey(Boolean(data.hasGrokKey));
        setPromptPreset(data.promptPreset || 'standard');
        setCustomPrompt(data.customPrompt || '');
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const handleFetchLiveModels = async (prov: string) => {
    setFetchingModels((prev) => ({ ...prev, [prov]: true }));
    try {
      const currentKey = prov === 'gemini' ? geminiApiKey : prov === 'openai' ? openaiApiKey : '';
      const queryParam = currentKey ? `&apiKey=${encodeURIComponent(currentKey)}` : '';
      const res = await apiFetch<any>(`/api/ai-reports/live-models?provider=${prov}${queryParam}`);
      const data = res?.data ?? res;
      if (data?.models && data.models.length > 0) {
        if (prov === 'gemini') {
          const merged = [...data.models, { value: 'custom', label: 'ระบุชื่อโมเดลเอง (Custom Model Name)...' }];
          setGeminiModelList(merged);
          setSaveSuccessMessage(`ดึงโมเดลสดจาก Google Gemini สำเร็จ (${data.models.length} โมเดล)`);
        } else if (prov === 'openai') {
          const merged = [...data.models, { value: 'custom', label: 'ระบุชื่อโมเดลเอง (Custom Model Name)...' }];
          setOpenaiModelList(merged);
          setSaveSuccessMessage(`ดึงโมเดลสดจาก OpenAI สำเร็จ (${data.models.length} โมเดล)`);
        }
        setTimeout(() => setSaveSuccessMessage(null), 3500);
      } else {
        alert('ไม่พบโมเดล หรือ API Key ในระบบยังไม่มีสิทธิ์เข้าถึงโมเดล');
      }
    } catch (err: any) {
      alert(`ไม่สามารถดึงโมเดลได้: ${err.message || 'โปรดตรวจสอบสิทธิ์ API Key'}`);
    } finally {
      setFetchingModels((prev) => ({ ...prev, [prov]: false }));
    }
  };

  const handleTestConnection = async (prov: string) => {
    setTestingConnection((prev) => ({ ...prev, [prov]: true }));
    setConnectionResult((prev) => ({ ...prev, [prov]: null }));
    try {
      const effKey =
        prov === 'gemini' ? geminiApiKey :
        prov === 'openai' ? openaiApiKey :
        prov === 'anthropic' ? anthropicApiKey :
        grokApiKey;

      const effModel =
        prov === 'gemini' ? (geminiSelect === 'custom' ? geminiCustom : geminiSelect) :
        prov === 'openai' ? (openaiSelect === 'custom' ? openaiCustom : openaiSelect) :
        prov === 'anthropic' ? (anthropicSelect === 'custom' ? anthropicCustom : anthropicSelect) :
        (grokSelect === 'custom' ? grokCustom : grokSelect);

      const res = await apiFetch<any>('/api/ai-reports/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: prov, apiKey: effKey.trim() || undefined, model: effModel.trim() || undefined }),
      });
      const data = res?.data ?? res;
      setConnectionResult((prev) => ({
        ...prev,
        [prov]: {
          success: Boolean(data?.success),
          message: data?.message || (data?.success ? 'เชื่อมต่อสำเร็จ' : 'การเชื่อมต่อล้มเหลว'),
          latencyMs: data?.latencyMs,
        },
      }));
    } catch (err: any) {
      setConnectionResult((prev) => ({
        ...prev,
        [prov]: {
          success: false,
          message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        },
      }));
    } finally {
      setTestingConnection((prev) => ({ ...prev, [prov]: false }));
    }
  };

  const loadContext = async () => {
    setContextLoading(true);
    try {
      const res = await apiFetch<any>('/api/ai-reports/context');
      const data = res?.data ?? res;
      if (Array.isArray(data)) {
        setContextList(data);
      }
    } catch (e) {
      console.error('Failed to load context:', e);
    } finally {
      setContextLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSaveSuccessMessage(null);
    try {
      const effectiveGemini = geminiSelect === 'custom' ? (geminiCustom.trim() || 'gemini-2.5-flash') : geminiSelect;
      const effectiveOpenai = openaiSelect === 'custom' ? (openaiCustom.trim() || 'gpt-4o') : openaiSelect;
      const effectiveAnthropic = anthropicSelect === 'custom' ? (anthropicCustom.trim() || 'claude-3-7-sonnet-latest') : anthropicSelect;
      const effectiveGrok = grokSelect === 'custom' ? (grokCustom.trim() || 'grok-3') : grokSelect;

      const payload: Record<string, any> = {
        provider,
        geminiModel: effectiveGemini,
        openaiModel: effectiveOpenai,
        anthropicModel: effectiveAnthropic,
        grokModel: effectiveGrok,
        promptPreset,
        customPrompt,
      };
      if (geminiApiKey.trim()) payload.geminiApiKey = geminiApiKey.trim();
      if (openaiApiKey.trim()) payload.openaiApiKey = openaiApiKey.trim();
      if (anthropicApiKey.trim()) payload.anthropicApiKey = anthropicApiKey.trim();
      if (grokApiKey.trim()) payload.grokApiKey = grokApiKey.trim();

      const res = await apiFetch<any>('/api/ai-reports/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = res?.data ?? res;
      setSaveSuccessMessage(data?.message || 'บันทึกการตั้งค่าสำเร็จ');
      await loadSettings();
      setGeminiApiKey('');
      setOpenaiApiKey('');
      setAnthropicApiKey('');
      setGrokApiKey('');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (e: any) {
      console.error('Save error:', e);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddContext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setAddingRule(true);
    try {
      await apiFetch<any>('/api/ai-reports/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategory,
          title: newTitle.trim() || undefined,
          content: newContent.trim(),
        }),
      });
      setNewTitle('');
      setNewContent('');
      await loadContext();
    } catch (e) {
      console.error(e);
    } finally {
      setAddingRule(false);
    }
  };

  const handleDeleteContext = async (id: number) => {
    if (!confirm('ต้องการลบข้อมูลบริบทนี้ใช่หรือไม่?')) return;
    try {
      await apiFetch<any>(`/api/ai-reports/context/${id}`, { method: 'DELETE' });
      await loadContext();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">ตั้งค่า AI & คลังความรู้ (Knowledge Base)</h2>
              <p className="text-xs text-slate-300">
                กำหนดโมเดล AI รุ่นล่าสุด (Gemini, OpenAI, Claude, Grok) และกฎเกณฑ์ความปลอดภัยของโรงงาน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('provider')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'provider'
                ? 'border-[#0052CC] text-[#0052CC]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>AI Provider & API Keys</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'prompt'
                ? 'border-[#0052CC] text-[#0052CC]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Prompt Presets & กำหนดคำสั่ง</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('context')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'context'
                ? 'border-[#0052CC] text-[#0052CC]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Factory Context & กฎความปลอดภัย ({contextList.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {saveSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {activeTab === 'provider' ? (
            /* TAB 1: AI Provider & Model Config */
            <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }} className="space-y-6">
              {/* Active Provider Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  เลือก AI Provider หลักในการประมวลผลรายงาน:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'gemini', name: 'Google Gemini', desc: 'แนะนำ (Primary)', badge: 'Default' },
                    { id: 'openai', name: 'OpenAI', desc: 'GPT-4.5 & o-Series' },
                    { id: 'anthropic', name: 'Claude', desc: 'Claude 3.7 Series' },
                    { id: 'grok', name: 'xAI Grok', desc: 'Grok 3 Series' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProvider(p.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        provider === p.id
                          ? 'border-[#0052CC] bg-blue-50/70 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{p.name}</span>
                        {p.badge && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-bold">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider 1: Google Gemini */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  provider === 'gemini' ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-blue-600" />
                      <span>1. Google Gemini Settings</span>
                    </span>
                    {hasGeminiKey && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>มี Key ในระบบแล้ว</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={fetchingModels['gemini']}
                      onClick={() => handleFetchLiveModels('gemini')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      title="ดึงรายการโมเดลล่าสุดทั้งหมดที่ API Key มีสิทธิ์ใช้งาน"
                    >
                      <RefreshCw className={`w-3 h-3 text-blue-600 ${fetchingModels['gemini'] ? 'animate-spin' : ''}`} />
                      <span>ดึงโมเดลสด (Live)</span>
                    </button>
                    <button
                      type="button"
                      disabled={testingConnection['gemini']}
                      onClick={() => handleTestConnection('gemini')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[11px] font-bold text-[#0052CC] hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      <Zap className={`w-3 h-3 ${testingConnection['gemini'] ? 'animate-pulse' : ''}`} />
                      <span>{testingConnection['gemini'] ? 'กำลังทดสอบ...' : 'ทดสอบ Key'}</span>
                    </button>
                  </div>
                </div>

                {connectionResult['gemini'] && (
                  <div
                    className={`mb-3 p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                      connectionResult['gemini'].success
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}
                  >
                    {connectionResult['gemini'].success ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="flex-1 font-mono text-[11.5px]">{connectionResult['gemini'].message}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">เลือกโมเดล Gemini:</label>
                    <select
                      value={geminiSelect}
                      onChange={(e) => setGeminiSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      {geminiModelList.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>

                    {geminiSelect === 'custom' && (
                      <div className="mt-2 animate-in fade-in">
                        <label className="block text-[11px] text-blue-700 font-semibold mb-1">
                          ระบุชื่อโมเดล Gemini เอง (Custom Model Name):
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น gemini-3.8-flash, gemini-3.7-flash"
                          value={geminiCustom}
                          onChange={(e) => setGeminiCustom(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-blue-300 bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Gemini API Key:</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder={hasGeminiKey ? '•••••••••••••••• (เว้นว่างไว้เพื่อใช้เดิม)' : 'AIzaSy...'}
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Provider 2: OpenAI */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  provider === 'openai' ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-emerald-600" />
                      <span>2. OpenAI Settings</span>
                    </span>
                    {hasOpenaiKey && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>มี Key ในระบบแล้ว</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={fetchingModels['openai']}
                      onClick={() => handleFetchLiveModels('openai')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      title="ดึงรายการโมเดลล่าสุดทั้งหมดที่ OpenAI Key มีสิทธิ์ใช้งาน"
                    >
                      <RefreshCw className={`w-3 h-3 text-emerald-600 ${fetchingModels['openai'] ? 'animate-spin' : ''}`} />
                      <span>ดึงโมเดลสด (Live)</span>
                    </button>
                    <button
                      type="button"
                      disabled={testingConnection['openai']}
                      onClick={() => handleTestConnection('openai')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      <Zap className={`w-3 h-3 ${testingConnection['openai'] ? 'animate-pulse' : ''}`} />
                      <span>{testingConnection['openai'] ? 'กำลังทดสอบ...' : 'ทดสอบ Key'}</span>
                    </button>
                  </div>
                </div>

                {connectionResult['openai'] && (
                  <div
                    className={`mb-3 p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                      connectionResult['openai'].success
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}
                  >
                    {connectionResult['openai'].success ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="flex-1 font-mono text-[11.5px]">{connectionResult['openai'].message}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">เลือกโมเดล OpenAI:</label>
                    <select
                      value={openaiSelect}
                      onChange={(e) => setOpenaiSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      {openaiModelList.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>

                    {openaiSelect === 'custom' && (
                      <div className="mt-2 animate-in fade-in">
                        <label className="block text-[11px] text-emerald-700 font-semibold mb-1">
                          ระบุชื่อโมเดล OpenAI เอง (Custom Model Name):
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น o3-mini, gpt-4.5"
                          value={openaiCustom}
                          onChange={(e) => setOpenaiCustom(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 bg-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">OpenAI API Key:</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder={hasOpenaiKey ? '•••••••••••••••• (เว้นว่างไว้เพื่อใช้เดิม)' : 'sk-...'}
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Provider 3: Anthropic Claude */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  provider === 'anthropic' ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-orange-600" />
                      <span>3. Anthropic Claude Settings</span>
                    </span>
                    {hasAnthropicKey && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>มี Key ในระบบแล้ว</span>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={testingConnection['anthropic']}
                    onClick={() => handleTestConnection('anthropic')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-[11px] font-bold text-orange-800 hover:bg-orange-100 transition-colors disabled:opacity-50"
                  >
                    <Zap className={`w-3 h-3 ${testingConnection['anthropic'] ? 'animate-pulse' : ''}`} />
                    <span>{testingConnection['anthropic'] ? 'กำลังทดสอบ...' : 'ทดสอบ Key'}</span>
                  </button>
                </div>

                {connectionResult['anthropic'] && (
                  <div
                    className={`mb-3 p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                      connectionResult['anthropic'].success
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}
                  >
                    {connectionResult['anthropic'].success ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="flex-1 font-mono text-[11.5px]">{connectionResult['anthropic'].message}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">เลือกโมเดล Claude:</label>
                    <select
                      value={anthropicSelect}
                      onChange={(e) => setAnthropicSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      {ANTHROPIC_MODELS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>

                    {anthropicSelect === 'custom' && (
                      <div className="mt-2 animate-in fade-in">
                        <label className="block text-[11px] text-orange-700 font-semibold mb-1">
                          ระบุชื่อโมเดล Claude เอง (Custom Model Name):
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น claude-3-7-sonnet-latest, claude-3-5-haiku-latest"
                          value={anthropicCustom}
                          onChange={(e) => setAnthropicCustom(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-orange-300 bg-white font-mono text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Anthropic API Key:</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder={hasAnthropicKey ? '•••••••••••••••• (เว้นว่างไว้เพื่อใช้เดิม)' : 'sk-ant-...'}
                      value={anthropicApiKey}
                      onChange={(e) => setAnthropicApiKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Provider 4: xAI Grok */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  provider === 'grok' ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-purple-600" />
                      <span>4. xAI Grok Settings</span>
                    </span>
                    {hasGrokKey && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>มี Key ในระบบแล้ว</span>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={testingConnection['grok']}
                    onClick={() => handleTestConnection('grok')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-[11px] font-bold text-purple-800 hover:bg-purple-100 transition-colors disabled:opacity-50"
                  >
                    <Zap className={`w-3 h-3 ${testingConnection['grok'] ? 'animate-pulse' : ''}`} />
                    <span>{testingConnection['grok'] ? 'กำลังทดสอบ...' : 'ทดสอบ Key'}</span>
                  </button>
                </div>

                {connectionResult['grok'] && (
                  <div
                    className={`mb-3 p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                      connectionResult['grok'].success
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}
                  >
                    {connectionResult['grok'].success ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="flex-1 font-mono text-[11.5px]">{connectionResult['grok'].message}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">เลือกโมเดล Grok:</label>
                    <select
                      value={grokSelect}
                      onChange={(e) => setGrokSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      {GROK_MODELS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>

                    {grokSelect === 'custom' && (
                      <div className="mt-2 animate-in fade-in">
                        <label className="block text-[11px] text-purple-700 font-semibold mb-1">
                          ระบุชื่อโมเดล Grok เอง (Custom Model Name):
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น grok-3, grok-3-mini"
                          value={grokCustom}
                          onChange={(e) => setGrokCustom(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-purple-300 bg-white font-mono text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">xAI API Key:</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder={hasGrokKey ? '•••••••••••••••• (เว้นว่างไว้เพื่อใช้เดิม)' : 'xai-...'}
                      value={grokApiKey}
                      onChange={(e) => setGrokApiKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </form>
          ) : activeTab === 'prompt' ? (
            /* TAB 2: Prompt Presets & Custom Directives */
            <div className="space-y-6">
              {/* Presets Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-[#0052CC]" />
                    <span>เลือกชุดคำสั่งตั้งต้น (Prompt Presets):</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    เลือกรูปแบบการรายงานที่ตรงกับวัตถุประสงค์ของผู้บริหาร
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROMPT_PRESETS.map((p) => {
                    const isSelected = promptPreset === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setPromptPreset(p.id)}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#0052CC] bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-bold text-slate-900 leading-tight">
                              {p.title}
                            </span>
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold shrink-0 ${p.tagColor}`}
                            >
                              {p.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{p.desc}</p>
                        </div>

                        {p.template && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-mono">
                              มีเทมเพลตมาตรฐาน
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPromptPreset(p.id);
                                setCustomPrompt(p.template);
                              }}
                              className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              <span>คัดลอกลงช่องคำสั่งกำหนดเอง</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Prompt Editor */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#0052CC]" />
                      <span>กำหนดคำสั่งเฉพาะเพิ่มเติม (Custom Prompt Directives):</span>
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      คำสั่งในช่องนี้จะถูกส่งผนวกเข้ากับ System Prompt เสมอ เพื่อกำหนดพฤติกรรม ภาษา หรือเน้นจุดเฝ้าระวังพิเศษ
                    </p>
                  </div>
                  {customPrompt && (
                    <button
                      type="button"
                      onClick={() => setCustomPrompt('')}
                      className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>ล้างคำสั่ง</span>
                    </button>
                  )}
                </div>

                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="ระบุข้อกำหนดเฉพาะเพิ่มเติมสำหรับผู้บริหาร เช่น:
- กำชับให้ใช้คำว่า 'เจ้าหน้าที่รักษาความปลอดภัย' หรือ 'รปภ.' แทนคำว่า 'ยาม'
- กล้องวงจรปิดที่ออฟไลน์ในอาคาร B2 และ B4 ให้เน้นการระบุหมายเลขกล้องและเวลาที่ตรวจพบ
- ตรวจสอบเกณฑ์ SLA การบันทึกภาพ NVR ไม่น้อยกว่า 62 วันอย่างเข้มงวด"
                  rows={6}
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 bg-white font-sans text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none leading-relaxed resize-y"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>ความยาว: {customPrompt.length} ตัวอักษร</span>
                  <span className="italic">
                    * ผนวกกับระบบ RAG และกฎความปลอดภัยอัตโนมัติ (Zero Breaking Changes)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 3: Factory Context & Strict Rules */
            <div className="space-y-6">
              {/* Add New Rule Form */}
              <form onSubmit={handleAddContext} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#0052CC]" />
                  <span>เพิ่มบริบทโรงงานหรือกฎความปลอดภัยใหม่ (Add Knowledge Rule):</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="building_info">ข้อมูลอาคารสำคัญ (building_info)</option>
                    <option value="strict_rule">กฎเกณฑ์เข้มงวด (strict_rule)</option>
                    <option value="glossary">คำศัพท์เฉพาะ (glossary)</option>
                  </select>

                  <input
                    type="text"
                    placeholder="หัวข้อ (เช่น อาคาร B2 High Security)..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <textarea
                  placeholder="รายละเอียดบริบทหรือกฎเกณฑ์สำหรับให้ AI จดจำและปฏิบัติตาม..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  required
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingRule}
                    className="px-4 py-2 rounded-lg bg-[#0052CC] hover:bg-[#00388A] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{addingRule ? 'กำลังบันทึก...' : 'เพิ่มกฎเข้าสู่ระบบ'}</span>
                  </button>
                </div>
              </form>

              {/* Context List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">รายการบริบทและกฎที่ใช้งานอยู่ใน RAG:</span>
                {contextLoading ? (
                  <p className="text-xs text-slate-400">กำลังโหลดข้อมูลบริบท...</p>
                ) : contextList.length === 0 ? (
                  <p className="text-xs text-slate-400">ยังไม่มีข้อมูลบริบท</p>
                ) : (
                  contextList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              item.category === 'strict_rule'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : item.category === 'building_info'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {item.category === 'strict_rule' && <Shield className="w-3 h-3 text-rose-600" />}
                            {item.category === 'building_info' && <Building2 className="w-3 h-3 text-blue-600" />}
                            {item.category === 'glossary' && <BookOpen className="w-3 h-3 text-purple-600" />}
                            <span>{item.category}</span>
                          </span>
                          {item.title && <strong className="text-slate-800">{item.title}</strong>}
                        </div>
                        <p className="text-slate-600 leading-relaxed">{item.content}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteContext(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="ลบกฎนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Commercial Multi-Tenant Enabled (Tenant: wdbpi)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              ปิด
            </button>

            {(activeTab === 'provider' || activeTab === 'prompt') && (
              <button
                type="button"
                disabled={savingSettings}
                onClick={handleSaveSettings}
                className="px-5 py-2 rounded-xl bg-[#0052CC] hover:bg-[#00388A] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า AI'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
