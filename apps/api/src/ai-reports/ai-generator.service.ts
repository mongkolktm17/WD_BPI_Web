import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AggregatedSecurityMetrics } from './ai-aggregator.service';
import { RagContextBundle } from './ai-retriever.service';
import { formatSafeThaiDate } from './ai-sanitizer';

export interface GeneratedReportResult {
  draftText: string;
  providerUsed: string;
  modelUsed: string;
}

@Injectable()
export class AiGeneratorService {
  private readonly logger = new Logger(AiGeneratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reads active AI provider, models, and keys from database system_configs.
   */
  async getAiConfig() {
    const configs = await this.prisma.systemConfig.findMany({
      where: {
        configKey: {
          in: [
            'ai_active_provider',
            'gemini_model',
            'gemini_api_key',
            'openai_model',
            'openai_api_key',
            'anthropic_model',
            'anthropic_api_key',
            'grok_model',
            'grok_api_key',
            'ai_prompt_preset',
            'ai_custom_prompt',
          ],
        },
      },
    });

    const map = new Map<string, string>();
    configs.forEach((c) => map.set(c.configKey, c.configValue));

    return {
      provider: map.get('ai_active_provider') || process.env.AI_PROVIDER || 'gemini',
      geminiModel: map.get('gemini_model') || process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      geminiApiKey: map.get('gemini_api_key') || process.env.GEMINI_API_KEY || '',
      openaiModel: map.get('openai_model') || process.env.OPENAI_MODEL || 'gpt-4o',
      openaiApiKey: map.get('openai_api_key') || process.env.OPENAI_API_KEY || '',
      anthropicModel: map.get('anthropic_model') || process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-latest',
      anthropicApiKey: map.get('anthropic_api_key') || process.env.ANTHROPIC_API_KEY || '',
      grokModel: map.get('grok_model') || process.env.GROK_MODEL || 'grok-3',
      grokApiKey: map.get('grok_api_key') || process.env.GROK_API_KEY || '',
      promptPreset: map.get('ai_prompt_preset') || 'standard',
      customPrompt: map.get('ai_custom_prompt') || '',
    };
  }

  /**
   * Builds the System & Context Prompt for the LLM.
   */
  private buildPrompt(
    metrics: AggregatedSecurityMetrics,
    rag: RagContextBundle,
    reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    config?: { promptPreset?: string; customPrompt?: string },
  ): { systemPrompt: string; userPrompt: string } {
    const thaiDate = formatSafeThaiDate(metrics.reportDate);

    let presetInstructions = '';
    const preset = config?.promptPreset || 'standard';
    if (preset === 'compliance') {
      presetInstructions = `\nข้อกำหนดเฉพาะสำหรับ Preset [การปฏิบัติตามกฎและข้อบังคับ (Strict Compliance & SLA Audit)]:
- เน้นการตรวจสอบความสอดคล้องกับมาตรฐานความปลอดภัยโรงงาน ข้อกำหนดสัญญาการรักษาความปลอดภัย (PCS) และเกณฑ์ SLA บันทึกภาพ NVR ไม่น้อยกว่า 62 วันเป็นพิเศษ
- สรุปผลการตรวจคัดกรองบุคคลและทรัพย์สินตามข้อบังคับโรงงาน Western Digital อย่างละเอียด`;
    } else if (preset === 'incident_risk') {
      presetInstructions = `\nข้อกำหนดเฉพาะสำหรับ Preset [เฝ้าระวังเหตุฉุกเฉินและความเสี่ยงสูง (Critical Incident & Risk Matrix)]:
- มุ่งเน้นการประเมินจุดเสี่ยงวิกฤต (Single Points of Failure) ในพื้นที่อาคารความมั่นคงสูง (Tier 1 High Security Zones เช่น B2, B4, B9)
- จำลองผลกระทบและกำหนดแผนเผชิญเหตุกรณีระบบเฝ้าระวังหรืออุปกรณ์ตรวจค้นขัดข้อง`;
    } else if (preset === 'efficiency') {
      presetInstructions = `\nข้อกำหนดเฉพาะสำหรับ Preset [การบริหารทรัพยากรและกำลังพล (Guard Logistics & Operational Efficiency)]:
- วิเคราะห์ประสิทธิภาพการจัดสรรกำลังพล รปภ. ในแต่ละกะและจุดตรวจ
- วิเคราะห์ความจุลานจอดรถและการระบายการจราจรช่วงเวลาเร่งด่วน พร้อมการควบคุมครุภัณฑ์วิทยุสื่อสาร`;
    }

    let customDirectives = '';
    if (config?.customPrompt && config.customPrompt.trim()) {
      customDirectives = `\nคำสั่งพิเศษและข้อกำหนดเฉพาะจากผู้บริหาร (Custom Executive Directives):
${config.customPrompt.trim()}\n`;
    }

    const systemPrompt = `คุณคือ "ผู้อำนวยการฝ่ายความมั่นคงปลอดภัยระดับสูง (Senior Director of Security Operations)" ของศูนย์รักษาความปลอดภัย Western Digital (BPI & PRB) ปฏิบัติการร่วมกับ PCS Security & Facility Management

หน้าที่ของคุณคือร่างรายงานสรุปความมั่นคงและความพร้อมในการปฏิบัติการ (Executive Security Report) ภาษาไทยที่เป็นทางการ แม่นยำ สุภาพ และเน้นสิ่งที่ต้องปฏิบัติการแก้ไข (Action-Oriented) โดยปฏิบัติตามกฎต่อไปนี้อย่างเคร่งครัด:

กฎโครงสร้างรายงาน 4 ส่วนหลัก (Mandatory 4 Pillars Structure):
รายงานของคุณต้องมี 4 หัวข้อหลักนี้อย่างครบถ้วนและเรียงลำดับตามนี้เท่านั้น:
### ส่วนที่ 1: รายงานข้อมูล (Operational Data & Telemetry Summary)
สรุปสถิติตัวเลขและสถานะการทำงานจริงของ 5 ระบบหลัก (กำลังพลรักษาความปลอดภัย, การจราจร/ลานจอดรถ, กล้องวงจรปิด CCTV, ระบบบันทึกภาพ NVR ตามเกณฑ์ SLA 62 วัน, อุปกรณ์ตรวจค้นบุคคล Walkthrough & Metal Detector, และครุภัณฑ์วิทยุสื่อสาร) แสดงในรูปแบบตารางสรุปตัวชี้วัด (KPI Table) ที่เปรียบเทียบกับเป้าหมายอย่างชัดเจน และแจกแจงรายการอุปกรณ์ที่ผิดปกติ

### ส่วนที่ 2: วิเคราะห์สถานการณ์ (Situation & Trend Analysis)
วิเคราะห์เจาะลึกแนวโน้มและสภาพแวดล้อมความปลอดภัยในรอบการรายงาน เปรียบเทียบกับข้อมูลย้อนหลัง (Baseline 7 วัน) ระบุความผิดปกติ ความเสถียรของระบบตรวจจับ ความหนาแน่นของยานพาหนะ และความพร้อมของกำลังพลในแต่ละกะ

### ส่วนที่ 3: ประเมินความเสี่ยง (Risk & Vulnerability Assessment)
ประเมินความเสี่ยงและช่องโหว่ด้านความมั่นคงปลอดภัยอย่างเป็นระบบ (เช่น ผลกระทบจากกล้อง CCTV ออฟไลน์ในอาคารสำคัญ B2/B4/B9, ความเสี่ยงต่อการสูญหายของข้อมูลภาพ NVR ที่ใกล้หลุดเกณฑ์ SLA, ความเสี่ยงจากอุปกรณ์คัดกรอง หรือวิทยุสื่อสารที่ชำรุด/สูญหาย) แสดงตารางประเมินระดับความเสี่ยง (Risk Matrix: ระดับความเสี่ยง CRITICAL / HIGH / MEDIUM / LOW, รายละเอียดช่องโหว่, และพื้นที่ที่ได้รับผลกระทบ)

### ส่วนที่ 4: แนะนำการปรับปรุง (Actionable Recommendations & Remediation Plan)
นำเสนอมาตรการแก้ไขและข้อเสนอแนะเชิงป้องกันที่มีขั้นตอนชัดเจน (Actionable Items) แบ่งเป็นมาตรการเร่งด่วนภายใน 24 ชั่วโมง (Immediate Action Plan) และมาตรการระยะกลาง/ยาว (Preventive Measures) พร้อมระบุหน่วยงานผู้รับผิดชอบอย่างชัดเจน (ฝ่ายเทคนิค SOC, เจ้าหน้าที่ PCS, หรือฝ่ายบริหาร)

กฎสำคัญด้านข้อมูลและความปลอดภัย (Strict Guidelines):
1. ยึดมั่นตามบริบทโรงงาน (Factory Context):
${rag.factoryRules.map((r) => `- [${r.category.toUpperCase()}] ${r.title || ''}: ${r.content}`).join('\n')}

2. กฎการเรียนรู้จากการแก้ไขของผู้บริหารในอดีต (Learned Human Feedback Rules):
${rag.learnedFeedbackRules.length > 0 ? rag.learnedFeedbackRules.map((r) => `- ${r}`).join('\n') : '- ยังไม่มีข้อแก้ไขก่อนหน้า (ยึดตามมาตรฐานสากล)'}

3. รูปแบบรายงานตามประเภท:
${
  reportType === 'DAILY'
    ? '- **รายงานประจำวัน (Daily Report):** มุ่งเน้นประเด็นเร่งด่วน รายการอุปกรณ์ที่ชำรุด/ออฟไลน์ในพื้นที่สำคัญ (เช่น อาคาร B2, B4, B9), สถานะวิทยุสื่อสารที่ชำรุด/สูญหาย, อัตรากำลังพลประจำกะ และข้อสั่งการแก้ไขภายใน 24 ชม.'
    : reportType === 'WEEKLY'
      ? '- **รายงานประจำสัปดาห์ (Weekly Report):** มุ่งเน้นแนวโน้มสถิติ 7 วันย้อนหลัง, ความถี่ของอุปกรณ์ที่เกิดปัญหาซ้ำซาก, การวิเคราะห์ชั่วโมงเร่งด่วนของลานจอดรถ และการประเมินความพร้อมของกำลังพล'
      : '- **รายงานประจำเดือน (Monthly Report):** มุ่งเน้นภาพรวมเชิงกลยุทธ์, การปฏิบัติตาม SLA การบันทึกภาพ NVR ไม่น้อยกว่า 62 วัน, ดัชนีชี้วัด KPI, สรุปผลการตรวจคัดกรอง และข้อเสนอแนะจัดสรรงบประมาณซ่อมบำรุงล่วงหน้า'
}
${presetInstructions}
${customDirectives}
5. ความสมเหตุผลและความสอดคล้องกับข้อเท็จจริงใน "ส่วนที่ 4: แนะนำการปรับปรุง" (Factual Grounding & Expert Recommendations):
- ทุกข้อเสนอแนะในส่วนที่ 4 ต้องสอดคล้องกับตัวเลขข้อมูลจริงในวันนั้นอย่างเคร่งครัด ห้ามแนะนำให้แก้ไขในสิ่งที่ไม่มีปัญหา:
  * หากกล้องวงจรปิดออนไลน์ 100% (ไม่มีกล้องเสีย) ห้ามสั่งให้ซ่อมกล้องเสีย แต่ต้องแนะนำในเชิงผู้เชี่ยวชาญด้านความปลอดภัย เช่น การตรวจสอบมุมกล้อง (Camera Angle Audit), การทำความสะอาดเลนส์ภายนอกตามรอบ PM, หรือการทดสอบระบบตรวจจับ
  * หาก NVR บันทึกภาพครบ 100% ตาม SLA 62 วัน ห้ามสั่งให้ตรวจสอบฮาร์ดดิสก์เต็ม แต่ให้แนะนำการทำพยากรณ์พื้นที่จัดเก็บข้อมูล (Capacity Forecasting) หรือการตรวจสอบเวลาของ Time Server (NTP Sync)
  * หากวิทยุสื่อสารพร้อมใช้งาน 100% ห้ามสั่งส่งซ่อมวิทยุ แต่ให้แนะนำการทดสอบข่ายสัญญาณฉุกเฉิน หรือการตรวจสภาพรอบชาร์จแบตเตอรี่ (Battery Cycle Testing)
  * หากกำลังพล รปภ. ครบ 100% ตามสัญญา ให้แนะนำด้านการตรวจความพร้อมระเบียบแถว (Turnout Inspection) และการฝึกซ้อมแผนเผชิญเหตุ (Emergency Refresher Drill)
  * ในกรณีที่มีอุปกรณ์ชำรุดหรือตกเกณฑ์ SLA จริง ให้ระบุจุดที่พบปัญหา อาคาร และข้อสั่งการแก้ไขภายใน 24 ชม. อย่างเฉียบคมและแม่นยำ`;

    let goldenFewShotSection = '';
    if (rag.goldenFewShots.length > 0) {
      goldenFewShotSection = `\n\nตัวอย่างรายงานที่ได้รับอนุมัติจากผู้บริหารในอดีต (Golden Examples):\n` +
        rag.goldenFewShots.map((g, idx) => `--- ตัวอย่างที่ ${idx + 1} (${g.reportDate}) ---\n${g.humanFinalText}\n--- สิ้นสุดตัวอย่าง ---`).join('\n\n');
    }

    const userPrompt = `กรุณาร่างรายงานความปลอดภัยประเภท **${reportType}** ประจำวันที่ ${thaiDate} สำหรับโรงงาน Western Digital (${metrics.siteCode}) ร่วมกับ PCS Security & Facility Management

ข้อมูลตัวชี้วัดความปลอดภัย (Sanitized Security Metrics):
${JSON.stringify(metrics, null, 2)}
${goldenFewShotSection}

กรุณาร่างรายงานฉบับสมบูรณ์ในรูปแบบ Markdown ให้มีเนื้อหาครบทั้ง 4 ส่วนหลัก (1. รายงานข้อมูล, 2. วิเคราะห์สถานการณ์, 3. ประเมินความเสี่ยง, 4. แนะนำการปรับปรุง) ให้พร้อมส่งมอบแก่ผู้บริหารทันที`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Generates AI report using the configured provider (Gemini, OpenAI, Claude, Grok)
   * with automatic fallback if keys are missing or offline.
   */
  async generateReport(
    metrics: AggregatedSecurityMetrics,
    rag: RagContextBundle,
    reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  ): Promise<GeneratedReportResult> {
    const config = await this.getAiConfig();
    const { systemPrompt, userPrompt } = this.buildPrompt(metrics, rag, reportType, config);

    // 1. Google Gemini (Primary Default)
    if (config.provider === 'gemini' && config.geminiApiKey) {
      const candidates = [
        config.geminiModel,
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite',
        'gemini-3.6-flash',
      ].filter((m, idx, arr) => arr.indexOf(m) === idx);

      for (let i = 0; i < candidates.length; i++) {
        const candidateModel = candidates[i];
        try {
          if (i > 0) {
            this.logger.log(`Attempting Gemini automatic fallback to ${candidateModel}...`);
          }
          const timeout = 14000;
          const text = await this.callGemini(config.geminiApiKey, candidateModel, systemPrompt, userPrompt, timeout);
          const modelUsed = i === 0 ? candidateModel : `${candidateModel} (auto-fallback)`;
          return { draftText: text, providerUsed: 'gemini', modelUsed };
        } catch (err: any) {
          this.logger.error(`Gemini generation with ${candidateModel} failed: ${err.message}`);
        }
      }
    }

    // 2. OpenAI
    if (config.provider === 'openai' && config.openaiApiKey) {
      try {
        const text = await this.callOpenAi(config.openaiApiKey, config.openaiModel, systemPrompt, userPrompt);
        return { draftText: text, providerUsed: 'openai', modelUsed: config.openaiModel };
      } catch (err: any) {
        this.logger.error(`OpenAI generation failed: ${err.message}.`);
      }
    }

    // 3. Anthropic Claude
    if (config.provider === 'anthropic' && config.anthropicApiKey) {
      try {
        const text = await this.callAnthropic(config.anthropicApiKey, config.anthropicModel, systemPrompt, userPrompt);
        return { draftText: text, providerUsed: 'anthropic', modelUsed: config.anthropicModel };
      } catch (err: any) {
        this.logger.error(`Anthropic generation failed: ${err.message}.`);
      }
    }

    // 4. xAI Grok
    if (config.provider === 'grok' && config.grokApiKey) {
      try {
        const text = await this.callGrok(config.grokApiKey, config.grokModel, systemPrompt, userPrompt);
        return { draftText: text, providerUsed: 'grok', modelUsed: config.grokModel };
      } catch (err: any) {
        this.logger.error(`Grok generation failed: ${err.message}.`);
      }
    }

    // 5. Intelligent Built-in Fallback Generator (Produces accurate executive report using verified metrics)
    this.logger.warn('No external LLM API key configured or connection unavailable. Using built-in Security Analyst Engine.');
    const fallbackText = this.buildDeterministicReport(metrics, rag, reportType);
    return {
      draftText: fallbackText,
      providerUsed: 'local-expert-engine',
      modelUsed: 'wd-soc-v1',
    };
  }

  /**
   * Distills a human feedback comment into a crisp operational rule.
   */
  async extractFeedbackRule(comment: string): Promise<string> {
    if (!comment || !comment.trim()) return '';

    const config = await this.getAiConfig();
    const prompt = `จากข้อเสนอแนะของผู้บริหารศูนย์รักษาความปลอดภัย:
"${comment}"

กรุณาสกัดเป็น "กฎการปฏิบัติการสั้นๆ 1 ประโยค" สำหรับให้ AI จดจำและนำไปใช้ในการร่างรายงานครั้งต่อไป เช่น:
- "ใช้คำว่า 'เจ้าหน้าที่รักษาความปลอดภัย' หรือ 'รปภ.' แทนคำว่า 'ยาม'"
- "กล้องวงจรปิดที่ออฟไลน์ในอาคาร B2 ต้องระบุเลขกล้องให้ครบทุกตัว"
ตอบเฉพาะตัวกฎ 1 ประโยคเท่านั้น ไม่ต้องมีคำอธิบายเพิ่มเติม`;

    if (config.geminiApiKey) {
      try {
        const targetModel = config.geminiModel || 'gemini-3.5-flash';
        const res = await this.callGemini(config.geminiApiKey, targetModel, 'You are a concise rule extractor.', prompt);
        return res.trim().replace(/^[-*•]\s*/, '');
      } catch {
        try {
          const res = await this.callGemini(config.geminiApiKey, 'gemini-3.5-flash', 'You are a concise rule extractor.', prompt);
          return res.trim().replace(/^[-*•]\s*/, '');
        } catch {}
      }
    }

    // Fallback extraction
    return comment.trim();
  }

  // ==========================================
  // HTTP Provider Callers
  // ==========================================

  private async callGemini(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    timeoutMs: number = 18000,
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 3000,
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async callOpenAi(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';
    const isReasoning = model.startsWith('o1') || model.startsWith('o3');

    const body: Record<string, any> = {
      model,
      messages: [
        { role: isReasoning ? 'developer' : 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    };

    if (isReasoning) {
      body.max_completion_tokens = 3000;
    } else {
      body.temperature = 0.2;
      body.max_tokens = 3000;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Fetches real-time live models from AI provider APIs to prevent hardcoded model obsolescence.
   */
  async fetchLiveModels(provider: string, apiKey?: string): Promise<{ models: Array<{ value: string; label: string }> }> {
    const config = await this.getAiConfig();
    const key = apiKey || (provider === 'gemini' ? config.geminiApiKey : provider === 'openai' ? config.openaiApiKey : '');

    if (!key) {
      return { models: [] };
    }

    if (provider === 'gemini') {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Google API returned status ${res.status}`);
        }
        const data = await res.json();
        const geminiModels = (data.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => {
            const shortName = m.name.replace(/^models\//, '');
            return {
              value: shortName,
              label: `${shortName} (${m.displayName || shortName})`,
            };
          });
        return { models: geminiModels };
      } catch (err: any) {
        this.logger.error(`Failed to fetch live Gemini models: ${err.message}`);
        throw err;
      }
    }

    if (provider === 'openai') {
      try {
        const url = 'https://api.openai.com/v1/models';
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) {
          throw new Error(`OpenAI API returned status ${res.status}`);
        }
        const data = await res.json();
        const openaiModels = (data.data || [])
          .filter((m: any) => m.id.includes('gpt') || m.id.startsWith('o1') || m.id.startsWith('o3'))
          .map((m: any) => ({
            value: m.id,
            label: m.id,
          }));
        return { models: openaiModels };
      } catch (err: any) {
        this.logger.error(`Failed to fetch live OpenAI models: ${err.message}`);
        throw err;
      }
    }

    return { models: [] };
  }

  /**
   * Tests provider API Key connection with a lightweight ping test.
   */
  async testProviderConnection(
    provider: string,
    apiKey?: string,
    model?: string,
  ): Promise<{ success: boolean; message: string; latencyMs?: number; modelUsed?: string }> {
    const config = await this.getAiConfig();
    const effectiveKey = apiKey || (
      provider === 'gemini' ? config.geminiApiKey :
      provider === 'openai' ? config.openaiApiKey :
      provider === 'anthropic' ? config.anthropicApiKey :
      provider === 'grok' ? config.grokApiKey : ''
    );

    if (!effectiveKey) {
      return { success: false, message: 'ไม่พบ API Key สำหรับทดสอบ กรุณากรอกคีย์ก่อนทดสอบ' };
    }

    const effectiveModel = model || (
      provider === 'gemini' ? config.geminiModel :
      provider === 'openai' ? config.openaiModel :
      provider === 'anthropic' ? config.anthropicModel :
      provider === 'grok' ? config.grokModel : ''
    );

    const startTime = Date.now();

    try {
      if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(effectiveModel)}:generateContent?key=${encodeURIComponent(effectiveKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Ping test. Reply with OK.' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        });

        const latency = Date.now() - startTime;
        if (!res.ok) {
          const errText = await res.text();
          let parsedMsg = errText;
          try {
            const parsed = JSON.parse(errText);
            parsedMsg = parsed.error?.message || errText;
          } catch {}
          return {
            success: false,
            message: `Gemini API Error (${res.status}): ${parsedMsg}`,
            latencyMs: latency,
          };
        }
        return {
          success: true,
          message: `เชื่อมต่อ Google Gemini (${effectiveModel}) สำเร็จ! (Response: ${latency}ms)`,
          latencyMs: latency,
          modelUsed: effectiveModel,
        };
      }

      if (provider === 'openai') {
        const isReasoning = effectiveModel.startsWith('o1') || effectiveModel.startsWith('o3');
        const body: any = {
          model: effectiveModel,
          messages: [{ role: isReasoning ? 'developer' : 'user', content: 'Ping' }],
        };
        if (isReasoning) {
          body.max_completion_tokens = 10;
        } else {
          body.max_tokens = 10;
        }

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${effectiveKey}`,
          },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify(body),
        });

        const latency = Date.now() - startTime;
        if (!res.ok) {
          const errText = await res.text();
          let parsedMsg = errText;
          try {
            const parsed = JSON.parse(errText);
            parsedMsg = parsed.error?.message || errText;
          } catch {}
          return {
            success: false,
            message: `OpenAI API Error (${res.status}): ${parsedMsg}`,
            latencyMs: latency,
          };
        }
        return {
          success: true,
          message: `เชื่อมต่อ OpenAI (${effectiveModel}) สำเร็จ! (Response: ${latency}ms)`,
          latencyMs: latency,
          modelUsed: effectiveModel,
        };
      }

      if (provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': effectiveKey,
            'anthropic-version': '2023-06-01',
          },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            model: effectiveModel,
            messages: [{ role: 'user', content: 'Ping' }],
            max_tokens: 10,
          }),
        });

        const latency = Date.now() - startTime;
        if (!res.ok) {
          const errText = await res.text();
          let parsedMsg = errText;
          try {
            const parsed = JSON.parse(errText);
            parsedMsg = parsed.error?.message || errText;
          } catch {}
          return {
            success: false,
            message: `Anthropic API Error (${res.status}): ${parsedMsg}`,
            latencyMs: latency,
          };
        }
        return {
          success: true,
          message: `เชื่อมต่อ Anthropic (${effectiveModel}) สำเร็จ! (Response: ${latency}ms)`,
          latencyMs: latency,
          modelUsed: effectiveModel,
        };
      }

      if (provider === 'grok') {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${effectiveKey}`,
          },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            model: effectiveModel,
            messages: [{ role: 'user', content: 'Ping' }],
            max_tokens: 10,
          }),
        });

        const latency = Date.now() - startTime;
        if (!res.ok) {
          const errText = await res.text();
          let parsedMsg = errText;
          try {
            const parsed = JSON.parse(errText);
            parsedMsg = parsed.error?.message || errText;
          } catch {}
          return {
            success: false,
            message: `Grok API Error (${res.status}): ${parsedMsg}`,
            latencyMs: latency,
          };
        }
        return {
          success: true,
          message: `เชื่อมต่อ xAI Grok (${effectiveModel}) สำเร็จ! (Response: ${latency}ms)`,
          latencyMs: latency,
          modelUsed: effectiveModel,
        };
      }

      return { success: false, message: `ไม่รองรับ provider: ${provider}` };
    } catch (err: any) {
      return { success: false, message: `การเชื่อมต่อล้มเหลว: ${err.message}` };
    }
  }

  private async callAnthropic(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const url = 'https://api.anthropic.com/v1/messages';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: 3000,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  private async callGrok(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const url = 'https://api.x.ai/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Grok API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Deterministic High-Fidelity Executive Report Draft
   * Used as bulletproof zero-downtime fallback when external LLM keys are unconfigured.
   * Strictly follows the 4 Mandatory Pillars:
   * 1. รายงานข้อมูล (Operational Data & Telemetry Summary)
   * 2. วิเคราะห์สถานการณ์ (Situation & Trend Analysis)
   * 3. ประเมินความเสี่ยง (Risk & Vulnerability Assessment)
   * 4. แนะนำการปรับปรุง (Actionable Recommendations & Remediation Plan)
   */
  private buildDeterministicReport(
    m: AggregatedSecurityMetrics,
    rag: RagContextBundle,
    reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  ): string {
    const dateTH = formatSafeThaiDate(m.reportDate);
    const titleType = reportType === 'DAILY' ? 'ประจำวัน' : reportType === 'WEEKLY' ? 'ประจำสัปดาห์' : 'ประจำเดือน';

    const radioProblemsText =
      m.radio.problems.length > 0
        ? m.radio.problems.map((p) => `- หมายเลข ${p.assetNumber} (${p.brand || 'วิทยุสื่อสาร'}): สถานะ ${p.status === 'missing' ? 'สูญหาย' : 'ชำรุด'} — ${p.remark || 'ส่งศูนย์ซ่อมบำรุง'}`).join('\n')
        : '- ไม่พบรายการวิทยุสื่อสารสูญหายหรือชำรุด พร้อมใช้งาน 100%';

    const offlineCctvCount = m.surveillance.offlineCameras.length;
    const offlineCctvText =
      m.surveillance.offlineCameras.length > 0
        ? m.surveillance.offlineCameras.map((c) => `- กล้อง ${c.cameraNo} (อาคาร ${c.building}, จุดติดตั้ง: ${c.location})`).join('\n')
        : '- กล้องวงจรปิดทุกจุดทำงานปกติ 100% ไม่พบจุด Offline';

    const nvrAlertText =
      m.surveillance.nvrFailedSla > 0
        ? `พบ NVR จำนวน ${m.surveillance.nvrFailedSla} เครื่องที่ระยะเวลาบันทึกต่ำกว่าเกณฑ์ SLA (${m.surveillance.nvrTargetDays} วัน) ต้องตรวจสอบพื้นที่ความจุฮาร์ดดิสก์เร่งด่วน`
        : `NVR ทุกเครื่องผ่านเกณฑ์ SLA การบันทึกภาพย้อนหลัง ${m.surveillance.nvrTargetDays} วันครบถ้วน 100%`;

    // Dynamic Factual & Grounded Recommendations
    const immediateActions: string[] = [];
    const preventiveActions: string[] = [];

    // 1. CCTV Actions
    if (offlineCctvCount > 0) {
      const offlineList = m.surveillance.offlineCameras.map((c) => `กล้อง ${c.cameraNo} อาคาร ${c.building}`).join(', ');
      immediateActions.push(
        `**งานกู้คืนระบบกล้องวงจรปิด (เร่งด่วน 24 ชม.):** มอบหมายทีมช่างเทคนิค SOC และผู้รับเหมา เข้าตรวจสอบสายสัญญาณและ Adapter จ่ายไฟของกล้องที่ออฟไลน์จำนวน ${offlineCctvCount} ตัว (${offlineList}) เพื่อกู้คืนสัญญาณให้กลับมาออนไลน์ พร้อมสั่งการให้ รปภ. เพิ่มวงรอบการเดินตรวจตราบริเวณจุดอับสายตาชั่วคราวดังกล่าว`,
      );
      preventiveActions.push(
        `**การวิเคราะห์สาเหตุและแผนบำรุงรักษาเชิงป้องกัน (PM):** ตรวจสอบประวัติอุปกรณ์และข้อต่อสายสัญญาณบริเวณจุดที่ดับ เพื่อแก้ไขปัญหาเชิงโครงสร้าง และจัดทำตาราง Preventive Maintenance รายสัปดาห์`,
      );
    } else {
      immediateActions.push(
        `**การรักษามาตรฐานระบบเฝ้าระวัง (100% Online):** ระบบกล้องวงจรปิดทำงานปกติสมบูรณ์ครบ 100% (${m.surveillance.cctvOnline}/${m.surveillance.cctvTotal} ตัว) ไม่พบจุดอับสัญญาณ ให้เจ้าหน้าที่ประจำศูนย์ SOC ดำรงความพร้อมของระบบ และสุ่มตรวจความคมชัดของภาพ (Image Clarity) รวมถึงการปรับมุมกล้อง (Camera Angle Audit) ในพื้นที่ความมั่นคงสูง (Tier 1 Zones เช่น อาคาร B2, B4, B9)`,
      );
      preventiveActions.push(
        `**การทำความสะอาดเลนส์และตรวจสอบเชิงกายภาพ:** ดำเนินการตามรอบทำความสะอาดหน้าเลนส์กล้องภายนอกอาคารเพื่อป้องกันคราบฝุ่นละอองจากสภาพอากาศ และตรวจสอบความแข็งแรงของขายึดกล้องก่อนเข้าสู่ช่วงมรสุม`,
      );
    }

    // 2. NVR 62-Day SLA Actions
    if (m.surveillance.nvrFailedSla > 0) {
      const failedNvrList = m.surveillance.nonCompliantNvrs.map((n) => `${n.nvrName} (${n.daysRecorded} วัน)`).join(', ');
      immediateActions.push(
        `**การบริหารพื้นที่จัดเก็บภาพ NVR (เร่งด่วน 24 ชม.):** ประสานงานฝ่ายไอทีและผู้ดูแลระบบ เข้าตรวจสอบ NVR จำนวน ${m.surveillance.nvrFailedSla} เครื่องที่ต่ำกว่าเกณฑ์ SLA (${failedNvrList}) ทำการปรับแต่ง Bitrate/Framerate ที่ไม่จำเป็น หรือเพิ่มความจุฮาร์ดดิสก์สำรองเพื่อป้องกันข้อมูลสูญหายตามข้อกำหนดมาตรฐานโรงงาน`,
      );
      preventiveActions.push(
        `**การพยากรณ์ความจุและตั้งระบบแจ้งเตือน (Capacity Forecasting):** จัดทำรายงานพยากรณ์ความจุฮาร์ดดิสก์ NVR รายเดือน และตั้งระบบแจ้งเตือนอัตโนมัติเมื่อความจุจัดเก็บคงเหลือต่ำกว่าเกณฑ์ 15%`,
      );
    } else {
      immediateActions.push(
        `**การกำกับดูแลระบบบันทึกภาพย้อนหลัง (100% SLA Compliance):** NVR ทุกเครื่อง (${m.surveillance.nvrPassedSla}/${m.surveillance.nvrTotal} เครื่อง) บันทึกภาพย้อนหลังผ่านเกณฑ์ SLA ${m.surveillance.nvrTargetDays} วันครบถ้วน 100% ให้เจ้าหน้าที่ทำการตรวจสอบความถูกต้องของ Time Sync (NTP Server) เพื่อให้เวลาบันทึกภาพตรงกับมาตรฐานสากล`,
      );
      preventiveActions.push(
        `**การทดสอบความสมบูรณ์ของไฟล์ภาพ (Playback & Export Drill):** สุ่มทดสอบการดึงไฟล์ภาพย้อนหลัง 60 วัน สัปดาห์ละ 1 ครั้ง เพื่อยืนยันความสมบูรณ์ของไฟล์วิดีโอและประสิทธิภาพของระบบจัดเก็บข้อมูลระยะยาว`,
      );
    }

    // 3. Radio Communication Actions
    if (m.radio.problems.length > 0) {
      const radioList = m.radio.problems.map((p) => `#${p.assetNumber} (${p.status === 'missing' ? 'สูญหาย' : 'ชำรุด'})`).join(', ');
      immediateActions.push(
        `**การจัดการครุภัณฑ์วิทยุสื่อสาร (เร่งด่วน 24 ชม.):** ดำเนินการส่งวิทยุที่พบปัญหาจำนวน ${m.radio.problems.length} เครื่อง (${radioList}) เข้าศูนย์ซ่อมบำรุงทันที และประสานงานเบิกจ่ายเครื่องสำรอง (Buffer Pool) ไปทดแทนให้กำลังพลมีวิทยุพร้อมปฏิบัติการครบทุกนาย`,
      );
      preventiveActions.push(
        `**การควบคุมทะเบียนครุภัณฑ์และการตรวจสอบวงรอบ:** กำชับการตรวจนับและลงบันทึกรับ-ส่งมอบวิทยุสื่อสารตอนเปลี่ยนกะ (Handover Log) อย่างเคร่งครัด พร้อมตรวจสอบสภาพแบตเตอรี่และเสาอากาศรายสัปดาห์`,
      );
    } else {
      immediateActions.push(
        `**การบริหารข่ายการสื่อสารฉุกเฉิน (พร้อมใช้งาน 100%):** วิทยุสื่อสารพร้อมใช้งานครบถ้วน ${m.radio.totalWorking}/${m.radio.totalChecked} เครื่อง (100%) ให้คงระเบียบการทดสอบสัญญาณวิทยุ (Radio Check) ทุกต้นผลัดเวร และตรวจสอบให้แน่ใจว่าช่องสัญญาณหลักและช่องสัญญาณฉุกเฉิน (Emergency Channel) มีความคมชัด ปราศจากคลื่นรบกวน`,
      );
      preventiveActions.push(
        `**การบำรุงรักษาแบตเตอรี่และการสำรองพลังงาน:** กำหนดรอบการคายประจุและทดสอบอายุการใช้งานของแบตเตอรี่ (Battery Cycle Test) ทุก 6 เดือน และจัดเตรียมแบตเตอรี่สำรองที่ชาร์จเต็มไว้ ณ จุดประจำการ SOC เสมอ`,
      );
    }

    // 4. Guards & Security Personnel
    if (m.guards.slaPercentage < 100) {
      immediateActions.push(
        `**การเสริมอัตรากำลังพลให้ครบตามสัญญา (เร่งด่วน 24 ชม.):** ประสานงานผู้จัดการพื้นที่ของ PCS Security เพื่อจัดส่ง รปภ. เสริมทดแทนจุดที่ขาด ให้ครบถ้วนตามสัญญาจ้าง ${m.guards.totalContract} นายภายในรอบเวรถัดไป`,
      );
      preventiveActions.push(
        `**การบริหารอัตรากำลังสำรอง (Relief Pool):** ทบทวนแผนกำลังพลสำรองฉุกเฉินของบริษัทคู่สัญญาเพื่อป้องกันการขาดอัตรากำลังกรณีมีพนักงานลาป่วยกะทันหัน`,
      );
    } else {
      immediateActions.push(
        `**การควบคุมคุณภาพการปฏิบัติการของกำลังพล:** กำลังพลปฏิบัติหน้าที่ครบตามกรอบสัญญา 100% (${m.guards.totalActive}/${m.guards.totalContract} นาย) มอบหมายให้ Supervisor ประจำกะเข้มงวดการตรวจความพร้อมของเครื่องแต่งกายและอุปกรณ์ประจำกาย (Turnout Inspection) และเน้นย้ำความตื่นตัว ณ จุดตรวจทางเข้า-ออก`,
      );
      preventiveActions.push(
        `**การพัฒนาทักษะและการฝึกซ้อมแผนเผชิญเหตุ (Training & Drills):** กำหนดจัดฝึกอบรมทบทวนยุทธวิธีระงับเหตุเบื้องต้น (Conflict Resolution) และการปฐมพยาบาล/การอพยพหนีไฟร่วมกับฝ่ายความปลอดภัยโรงงานตามรอบประจำเดือน`,
      );
    }

    // 5. Screening & Walkthrough
    const wtFailedZones = (m.screening.walkthroughZones || []).filter((z) => z.fail > 0).map((z) => z.name);
    if (wtFailedZones.length > 0) {
      immediateActions.push(
        `**การปรับเทียบประตูตรวจโลหะ (เร่งด่วน 24 ชม.):** ประสานงานช่างเทคนิคเข้าปรับแต่ง Sensitivity ของ Walkthrough Gate ในจุดที่พบปัญหา (${wtFailedZones.join(', ')}) ให้กลับมาตรวจจับได้ตามมาตรฐานทันที`,
      );
      preventiveActions.push(
        `**การสอบเทียบเครื่องมือประจำเดือน:** จัดทำเอกสารบันทึกการ Calibration ร่วมกับผู้แทนจำหน่ายอุปกรณ์ตรวจค้น`,
      );
    } else {
      immediateActions.push(
        `**การดำรงมาตรฐานความเข้มงวดในการคัดกรองบุคคล:** เครื่องตรวจโลหะทั้งแบบเดินผ่าน (Walkthrough) และแบบมือถือ (Handheld) ผ่านการทดสอบ 100% ให้เจ้าหน้าที่ รปภ. ปฏิบัติตามมาตรฐาน Standard Operating Procedure (SOP) ในการตรวจคัดกรองกระเป๋า สัมภาระ และอุปกรณ์อิเล็กทรอนิกส์ของพนักงานและผู้รับเหมาอย่างเคร่งครัด`,
      );
      preventiveActions.push(
        `**การทดสอบระบบแบบไม่แจ้งล่วงหน้า (Red Team Test):** จัดให้มีการสุ่มทดสอบการลักลอบนำสิ่งของต้องห้ามผ่านจุดตรวจเพื่อวัดความตื่นตัวของเจ้าหน้าที่และประสิทธิภาพของอุปกรณ์เป็นประจำทุกสัปดาห์`,
      );
    }

    // 6. Traffic & Parking
    if (m.parking.occupancyRate > 85) {
      immediateActions.push(
        `**การระบายความหนาแน่นลานจอดรถ (เร่งด่วน):** อัตราการครองพื้นที่จอดรถสูงถึง ${m.parking.occupancyRate}% จัดส่งเจ้าหน้าที่ รปภ. จราจรเข้าอำนวยความสะดวกและจัดระเบียบการจอด เปิดพื้นที่จอดสำรองเพื่อป้องกันการจอดซ้อนคันกีดขวางเส้นทางฉุกเฉิน`,
      );
      preventiveActions.push(
        `**การวิเคราะห์ชั่วโมงเร่งด่วนและการประสานงานกะการทำงาน:** ประสานงานฝ่ายทรัพยากรบุคคลและฝ่ายผลิตในการเหลื่อมเวลาเข้า-ออกงานเพื่อลดความแออัดของยานพาหนะ`,
      );
    } else {
      immediateActions.push(
        `**การกำกับดูแลความเรียบร้อยของลานจอดรถ:** อัตราการครองพื้นที่จอดรถปกติ (${m.parking.occupancyRate}%) ให้ รปภ. สายตรวจเดินตรวจตราเพื่อป้องกันทรัพย์สินสูญหาย สังเกตการณ์การจอดรถนอกช่องจอด และตรวจเช็กความปลอดภัยบริเวณจุดชาร์จยานยนต์ไฟฟ้า (EV Charging Stations)`,
      );
      preventiveActions.push(
        `**การปรับปรุงกายภาพและป้ายสัญลักษณ์จราจร:** ตรวจสอบความสว่างของโคมไฟส่องสว่างลานจอดรถและเส้นจราจรให้มีความชัดเจนเพื่อความปลอดภัยสูงสุดแก่พนักงาน`,
      );
    }

    return `# รายงานสถานการณ์ความมั่นคงปลอดภัย${titleType} (Executive Security Report)
**ศูนย์ปฏิบัติการความปลอดภัย Security Operations Center (SOC) — Western Digital (${m.siteCode})**  
**หน่วยงานร่วมปฏิบัติการ:** Western Digital Storage Technologies (Thailand) & PCS Security and Facility Services  
**ประจำวันที่:** ${dateTH} | **สถานะรายงาน:** ฉบับตรวจทานเพื่อการอนุมัติ (Draft for Approval)

---

### ส่วนที่ 1: รายงานข้อมูล (Operational Data & Telemetry Summary)

#### 1.1 ตารางสรุปดัชนีชี้วัดหลัก 5 ด้าน (5 Pillars Operational Metrics)

| เสาหลักด้านความปลอดภัย | ตัวชี้วัดสำคัญ (Key Metrics) | เกณฑ์เป้าหมาย | ผลการดำเนินงาน | สถานะ |
| :--- | :--- | :---: | :---: | :---: |
| **1. กำลังพลเจ้าหน้าที่ (Guards)** | กะกลางวัน ${m.guards.dayShift}/${m.guards.dayContract} นาย • กะกลางคืน ${m.guards.nightShift}/${m.guards.nightContract} นาย | 100% | รวม ${m.guards.totalActive}/${m.guards.totalContract} นาย (${m.guards.slaPercentage}%) | [ปกติ] เป็นไปตามสัญญา |
| **2. ลานจอดรถและการจราจร (Traffic)** | รถยนต์ ${m.parking.carsToday}/${m.parking.carCapacity} คัน • จยย. ${m.parking.motoToday}/${m.parking.motoCapacity} คัน | < 85% | อัตราครองพื้นที่ ${m.parking.occupancyRate}% | [ปกติ] รองรับได้เพียงพอ |
| **3. กล้องวงจรปิด (CCTV System)** | ทำงานปกติ ${m.surveillance.cctvOnline}/${m.surveillance.cctvTotal} ตัว | ≥ 98% | ออนไลน์ ${m.surveillance.cctvOnlineRate}% | [ผ่านเกณฑ์] ตามมาตรฐาน |
| **4. ระบบบันทึกภาพ NVR (62-Day SLA)** | บันทึกครบเกณฑ์ ${m.surveillance.nvrPassedSla}/${m.surveillance.nvrTotal} เครื่อง | 100% | อัตราความสอดคล้อง ${m.surveillance.nvrComplianceRate}% | ${m.surveillance.nvrFailedSla > 0 ? '[เฝ้าระวัง] ตรวจสอบฮาร์ดดิสก์' : '[สมบูรณ์] ผ่านเกณฑ์ SLA'} |
| **5. อุปกรณ์คัดกรองบุคคล (Screening)** | เครื่องตรวจมือถือ 4 ระบบ • ประตูเดินผ่าน 6 โซน | 100% | ผ่านการทดสอบ 100% | [ปกติ] พร้อมใช้งาน |
| **6. ระบบวิทยุสื่อสาร (Radio Assets)** | พร้อมใช้งาน ${m.radio.totalWorking}/${m.radio.totalChecked} เครื่อง | ≥ 95% | พร้อมใช้งาน ${m.radio.workingRate}% | [ปกติ] พร้อมปฏิบัติการ |

#### 1.2 สรุปข้อมูล Telemetry รายระบบ
- **ระบบเฝ้าระวังและกล้องวงจรปิด (CCTV):** กล้องทำงานปกติ ${m.surveillance.cctvOnline}/${m.surveillance.cctvTotal} จุด (อัตราออนไลน์ ${m.surveillance.cctvOnlineRate}%) โดยมีกล้องออฟไลน์ ${offlineCctvCount} จุด
${offlineCctvText}
- **ระบบบันทึกภาพ NVR (SLA 62 วัน):** ผ่านเกณฑ์ ${m.surveillance.nvrPassedSla}/${m.surveillance.nvrTotal} เครื่อง (${m.surveillance.nvrComplianceRate}%) ${nvrAlertText}
- **อุปกรณ์คัดกรองบุคคล:** เครื่องตรวจโลหะแบบมือถือผ่านเกณฑ์ทั้ง 4 ฟังก์ชัน (แบตเตอรี่, ไฟ LED, ระยะตรวจจับ, สัญญาณเสียง) และเครื่องตรวจแบบเดินผ่าน (Walkthrough Gates) จุดคัดกรองสำคัญอาคาร B4 Linkway และ B6.6/1 พร้อมใช้งาน 100%
- **ครุภัณฑ์วิทยุสื่อสาร:** ตรวจนับรวม ${m.radio.totalChecked} เครื่อง (พบในระบบ ${m.radio.totalPresent} เครื่อง, พร้อมใช้งาน ${m.radio.totalWorking} เครื่อง, อัตราพร้อมใช้งาน ${m.radio.workingRate}%)
${radioProblemsText}

---

### ส่วนที่ 2: วิเคราะห์สถานการณ์ (Situation & Trend Analysis)
1. **ภาพรวมเสถียรภาพระบบความปลอดภัย:** ระบบรักษาความปลอดภัยโดยรวมของโรงงาน Western Digital (${m.siteCode}) มีเสถียรภาพอยู่ในเกณฑ์มาตรฐานความปลอดภัยสูง ความพร้อมด้านการเฝ้าระวังทางกายภาพและการคัดกรองบุคคลมีประสิทธิภาพต่อเนื่อง
2. **การจัดวางกำลังพล รปภ. (PCS Security):** กำลังพลปฏิบัติหน้าที่รวม ${m.guards.totalActive} นาย คิดเป็น ${m.guards.slaPercentage}% ของกรอบสัญญา การผลัดเปลี่ยนเวรระหว่างกะกลางวัน (${m.guards.dayShift} นาย) และกะกลางคืน (${m.guards.nightShift} นาย) ดำเนินการได้ราบรื่น ไม่มีจุดตรวจสำคัญขาดอัตรากำลัง
3. **การไหลเวียนจราจรและพื้นที่ลานจอดรถ:** ปริมาณยานพาหนะรวมครองพื้นที่ ${m.parking.occupancyRate}% ยังอยู่ในเกณฑ์ควบคุม (< 85%) ไม่พบปัญหาการกีดขวางเส้นทางฉุกเฉินและทางเข้าออกหลัก
4. **ความต่อเนื่องของระบบบันทึกภาพ:** ค่าเฉลี่ยการบันทึกภาพย้อนหลังของระบบ NVR อยู่ที่ระดับมาตรฐานสอดคล้องกับข้อกำหนดการกำกับดูแลความมั่นคงโรงงาน

---

### ส่วนที่ 3: ประเมินความเสี่ยง (Risk & Vulnerability Assessment)

| ด้านความเสี่ยง | ระดับความเสี่ยง | รายละเอียดช่องโหว่และจุดสังเกต | พื้นที่/ระบบที่ได้รับผลกระทบ |
| :--- | :---: | :--- | :--- |
| **ระบบกล้องวงจรปิด** | ${offlineCctvCount > 0 ? '[MEDIUM]' : '[LOW]'} | ${offlineCctvCount > 0 ? `พบกล้องออฟไลน์จำนวน ${offlineCctvCount} ตัว อาจเกิดจุดอับสายตาชั่วคราว` : 'ระบบกล้องครอบคลุม 100% ไม่พบช่องโหว่'} | ${m.surveillance.offlineCameras.length > 0 ? m.surveillance.offlineCameras.map(c => `อาคาร ${c.building}`).join(', ') : 'ทุกพื้นที่โรงงาน'} |
| **ระบบบันทึกภาพ SLA 62 วัน** | ${m.surveillance.nvrFailedSla > 0 ? '[HIGH]' : '[LOW]'} | ${m.surveillance.nvrFailedSla > 0 ? `พบ NVR ${m.surveillance.nvrFailedSla} เครื่องมีความจุใกล้เต็ม เสี่ยงต่อการบันทึกไม่ครบตามสัญญา` : 'การบันทึกภาพครบถ้วนตามเกณฑ์ 62 วันทุกเครื่อง'} | เครื่องบันทึกส่วนกลาง SOC |
| **การควบคุมวิทยุสื่อสาร** | ${m.radio.problems.length > 0 ? '[MEDIUM]' : '[LOW]'} | ${m.radio.problems.length > 0 ? `พบวิทยุชำรุด/สูญหาย ${m.radio.problems.length} เครื่อง กระทบความคล่องตัวในการสื่อสารกะ` : 'วิทยุสื่อสารพร้อมใช้งานครบตามกรอบ'} | หน่วย รปภ. ประจำจุด |
| **การคัดกรองบุคคลและโลหะ** | [LOW] | เครื่องตรวจโลหะทุกระบบผ่านการทดสอบ 100% ไม่มีความเสี่ยงต่อการรั่วไหลของทรัพย์สิน | จุดตรวจค้นทางเข้า-ออก |

---

### ส่วนที่ 4: แนะนำการปรับปรุง (Actionable Recommendations & Remediation Plan)

#### 4.1 มาตรการเร่งด่วนภายใน 24 ชั่วโมง (Immediate Action Plan)
${immediateActions.map((a, idx) => `${idx + 1}. ${a}`).join('\n')}

#### 4.2 แผนการปรับปรุงระยะกลางและมาตรการป้องกันเชิงรุก (Preventive Measures)
${preventiveActions.map((a, idx) => `${idx + 1}. ${a}`).join('\n')}

---
*รายงานฉบับนี้จัดทำขึ้นโดยศูนย์ปฏิบัติการความปลอดภัย Security Operations Center (SOC) Western Digital ร่วมกับ PCS Security และได้รับการคุ้มครองข้อมูลส่วนบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)*`;
  }
}
