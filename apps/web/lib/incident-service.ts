'use client';

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'reported' | 'dispatched' | 'in_progress' | 'resolved';

export interface SopStep {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
}

export interface IncidentReport {
  id: string;
  siteCode: string; // 'BPI' | 'PRB'
  siteName: string;
  location: string;
  incidentType: string;
  severity: IncidentSeverity;
  description: string;
  imageUrl?: string;
  reportedBy: string;
  employeeId?: string;
  reportedAt: string; // ISO
  status: IncidentStatus;

  // Step 2: Dispatch details
  assignedTo?: string;
  dispatchedBy?: string;
  dispatchedAt?: string;
  dispatchNote?: string;

  // Step 3: SOP details
  sopTitle?: string;
  sopSteps: SopStep[];
  acknowledgedAt?: string;

  // Step 4: Resolution details
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

export interface IncidentNotification {
  id: string;
  title: string;
  message: string;
  type: 'urgent_dispatch' | 'incident_reported' | 'sop_updated' | 'case_resolved' | 'alert_reminder';
  incidentId: string;
  timestamp: string;
  read: boolean;
  targetRole?: 'guard' | 'supervisor' | 'soc' | 'all';
}

export type IncidentEventType =
  | 'incident_created'
  | 'incident_dispatched'
  | 'incident_acknowledged'
  | 'sop_step_toggled'
  | 'incident_resolved'
  | 'notification_received';

export interface IncidentEvent {
  type: IncidentEventType;
  incident?: IncidentReport;
  notification?: IncidentNotification;
  timestamp: string;
}

const STORAGE_KEY_INCIDENTS = 'wd_soc_incidents_v2';
const STORAGE_KEY_NOTIFICATIONS = 'wd_soc_notifications_v2';
const BROADCAST_CHANNEL_NAME = 'wd_soc_command_bus';

export const DEFAULT_SOP_TEMPLATES: Record<string, { title: string; steps: string[] }> = {
  fire: {
    title: 'SOP ระงับเหตุอัคคีภัย / กลุ่มควัน',
    steps: [
      'ตรวจสอบพื้นที่เกิดเหตุทันทีและประเมินระดับเพลิงไหม้',
      'กั้นพื้นที่ความปลอดภัยรัศมี 50 เมตร และอพยพผู้ไม่มีส่วนเกี่ยวข้อง',
      'ใช้อุปกรณ์ดับเพลิงเบื้องต้น (ถังดับเพลิง / Fire Hose) หรือประสานทีมฉุกเฉิน ERT',
      'ยืนยันพื้นที่ปลอดภัยและรายงานภาพถ่ายปิดเคสกลับศูนย์ SOC',
    ],
  },
  cctv_nvr: {
    title: 'SOP ตรวจสอบระบบ Surveillance & NVR ขัดข้อง',
    steps: [
      'ตรวจสอบตู้ Rack / สวิตช์เครือข่าย POE และสาย LAN ที่ห้องบันทึกภาพ',
      'ตรวจสอบสถานะฮาร์ดดิสก์และไฟ LED Error บนเครื่อง NVR',
      'บันทึกหมายเลขเครื่อง NVR ที่พบปัญหา และรีบูตตามขั้นตอนช่างเทคนิค',
      'ยืนยันภาพกล้องกลับมาบันทึกปกติ (>= 62 วัน) และรายงานผลกลับศูนย์ SOC',
    ],
  },
  parking: {
    title: 'SOP บริหารจัดการลานจอดรถเต็ม 100%',
    steps: [
      'วางกรวยจราจรและป้าย "ที่จอดรถเต็ม" ปิดช่องทางเข้าลานจอด',
      'ประจำจุดทางแยกเพื่อโบกระบายรถไปยังลานจอดสำรอง',
      'ตรวจสอบการจอดกีดขวางหรือกีดขวางช่องทางฉุกเฉิน',
      'รายงานความคลี่คลายของจำนวนรถกลับมายังศูนย์ SOC',
    ],
  },
  radio: {
    title: 'SOP ตรวจสอบวิทยุสื่อสารประจำผลัด',
    steps: [
      'ตรวจนับจำนวนเครื่องวิทยุสื่อสารประจำป้อมและตู้ชาร์จ',
      'ทดสอบระดับเสียงและสัญญาณส่งทุกช่องความถี่ (Ch 1 - 4)',
      'บันทึกผลลงในฟอร์ม "ตรวจวิทยุสื่อสาร" บนระบบ PWA',
      'ยืนยันการส่งข้อมูลและปิดงานแจ้งเตือนกลับศูนย์ SOC',
    ],
  },
  general: {
    title: 'SOP ระงับเหตุการณ์ความปลอดภัยทั่วไป',
    steps: [
      'เข้าตรวจสอบจุดเกิดเหตุภายใน 5 นาที',
      'ควบคุมสถานการณ์และรักษาความปลอดภัยสถานที่เกิดเหตุ',
      'บันทึกข้อมูลและพยานหลักฐานเบื้องต้น',
      'ดำเนินการแก้ไขหรือส่งต่อหน่วยงานที่เกี่ยวข้องพร้อมสรุปรายงาน',
    ],
  },
};

function getInitialIncidents(): IncidentReport[] {
  const now = new Date();
  const tMinus10 = new Date(now.getTime() - 10 * 60000).toISOString();
  const tMinus45 = new Date(now.getTime() - 45 * 60000).toISOString();
  const tMinus120 = new Date(now.getTime() - 120 * 60000).toISOString();

  return [
    {
      id: 'INC-20261020-001',
      siteCode: 'BPI',
      siteName: 'สาขาบางปะอิน',
      location: 'อาคาร B4 ชั้น 2 ทางเชื่อม Linkway',
      incidentType: 'อัคคีภัย / กลุ่มควัน',
      severity: 'critical',
      description: 'พบกลุ่มควันหนาแน่นบริเวณตู้ควบคุมไฟย่อยชั้น 2 มีกลิ่นไหม้ ได้ใช้ถังดับเพลิงเบื้องต้นแล้ว',
      reportedBy: 'รปภ. สมชาย วงศ์สวัสดิ์',
      employeeId: 'WD-SEC-042',
      reportedAt: tMinus10,
      status: 'reported',
      sopTitle: DEFAULT_SOP_TEMPLATES.fire.title,
      sopSteps: DEFAULT_SOP_TEMPLATES.fire.steps.map((label, idx) => ({
        id: `step-${idx + 1}`,
        label,
        completed: false,
      })),
    },
    {
      id: 'INC-20261020-002',
      siteCode: 'BPI',
      siteName: 'สาขาบางปะอิน',
      location: 'ห้องควบคุมบันทึกภาพ NVR อาคาร B4/B6',
      incidentType: 'CCTV / NVR ขัดข้อง',
      severity: 'high',
      description: 'ตรวจพบ NVR จำนวน 468 เครื่อง มีระยะเวลาบันทึกต่ำกว่าเกณฑ์ 62 วัน (FAIL: 468)',
      reportedBy: 'ศูนย์ SOC Commander',
      reportedAt: tMinus45,
      status: 'in_progress',
      assignedTo: 'รปภ. ประจำห้อง CCTV / ช่างเทคนิค',
      dispatchedBy: 'SOC Supervisor',
      dispatchedAt: new Date(now.getTime() - 40 * 60000).toISOString(),
      dispatchNote: 'เข้าตรวจสอบตู้ Rack NVR และสถานะ HDD ด่วน',
      acknowledgedAt: new Date(now.getTime() - 35 * 60000).toISOString(),
      sopTitle: DEFAULT_SOP_TEMPLATES.cctv_nvr.title,
      sopSteps: DEFAULT_SOP_TEMPLATES.cctv_nvr.steps.map((label, idx) => ({
        id: `step-${idx + 1}`,
        label,
        completed: idx < 2,
        completedAt: idx < 2 ? new Date(now.getTime() - (20 - idx * 5) * 60000).toISOString() : undefined,
      })),
    },
    {
      id: 'INC-20261020-003',
      siteCode: 'BPI',
      siteName: 'สาขาบางปะอิน',
      location: 'ลานจอดรถ L2',
      incidentType: 'ทรัพย์สินตกหล่น / ส่งคืน',
      severity: 'low',
      description: 'พบกระเป๋าสตางค์บริเวณช่องจอดรถ L2-14 ได้นำส่งฝ่ายบุคคลเรียบร้อยแล้ว',
      reportedBy: 'รปภ. ประจำจุด ลานจอดรถ',
      employeeId: 'WD-SEC-019',
      reportedAt: tMinus120,
      status: 'resolved',
      assignedTo: 'หัวหน้าชุดตรวจตรา',
      dispatchedBy: 'SOC Supervisor',
      dispatchedAt: new Date(now.getTime() - 110 * 60000).toISOString(),
      acknowledgedAt: new Date(now.getTime() - 105 * 60000).toISOString(),
      sopTitle: DEFAULT_SOP_TEMPLATES.general.title,
      sopSteps: DEFAULT_SOP_TEMPLATES.general.steps.map((label, idx) => ({
        id: `step-${idx + 1}`,
        label,
        completed: true,
      })),
      resolvedAt: new Date(now.getTime() - 60 * 60000).toISOString(),
      resolvedBy: 'หัวหน้าชุดตรวจตรา',
      resolutionNote: 'ส่งมอบทรัพย์สินให้เจ้าหน้าที่ฝ่ายบุคคล ตรวจสอบบันทึกประจำวันเรียบร้อย',
    },
  ];
}

function getInitialNotifications(): IncidentNotification[] {
  const now = new Date();
  return [
    {
      id: 'notif-1',
      title: 'คำสั่งด่วนจาก SOC: ตรวจสอบ NVR B4/B6',
      message: 'มีคำสั่งให้เข้าตรวจสอบเครื่อง NVR Storage ที่ไม่ผ่านเกณฑ์ ≥ 62 วัน',
      type: 'urgent_dispatch',
      incidentId: 'INC-20261020-002',
      timestamp: new Date(now.getTime() - 40 * 60000).toISOString(),
      read: false,
      targetRole: 'guard',
    },
  ];
}

class IncidentServiceImpl {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(event: IncidentEvent) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          this.emitLocal(event.data);
        };
      }

      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY_INCIDENTS || e.key === STORAGE_KEY_NOTIFICATIONS) {
          this.emitLocal({
            type: 'incident_created',
            timestamp: new Date().toISOString(),
          });
        }
      });
    }
  }

  private broadcast(event: IncidentEvent) {
    this.emitLocal(event);
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch (e) {
        console.warn('Broadcast failed:', e);
      }
    }
  }

  private emitLocal(event: IncidentEvent) {
    this.listeners.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.error('Incident listener error:', err);
      }
    });
  }

  subscribe(listener: (event: IncidentEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getIncidents(): IncidentReport[] {
    if (typeof window === 'undefined') return getInitialIncidents();
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INCIDENTS);
      if (!stored) {
        const initial = getInitialIncidents();
        localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(stored);
    } catch {
      return getInitialIncidents();
    }
  }

  saveIncidents(items: IncidentReport[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save incidents to localStorage:', e);
    }
  }

  getIncidentById(id: string): IncidentReport | undefined {
    return this.getIncidents().find((i) => i.id === id);
  }

  createIncident(input: {
    siteCode: string;
    siteName?: string;
    location: string;
    incidentType: string;
    severity: IncidentSeverity;
    description: string;
    imageUrl?: string;
    reportedBy: string;
    employeeId?: string;
  }): IncidentReport {
    const incidents = this.getIncidents();
    const d = new Date();
    const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
    const num = String(incidents.length + 1).padStart(3, '0');
    const id = `INC-${ymd}-${num}`;

    let templateKey = 'general';
    const lowerType = input.incidentType.toLowerCase();
    if (lowerType.includes('ไฟ') || lowerType.includes('ควัน') || lowerType.includes('fire')) templateKey = 'fire';
    else if (lowerType.includes('cctv') || lowerType.includes('nvr') || lowerType.includes('กล้อง')) templateKey = 'cctv_nvr';
    else if (lowerType.includes('จอด') || lowerType.includes('parking') || lowerType.includes('รถ')) templateKey = 'parking';
    else if (lowerType.includes('วิทยุ') || lowerType.includes('radio')) templateKey = 'radio';

    const tpl = DEFAULT_SOP_TEMPLATES[templateKey] || DEFAULT_SOP_TEMPLATES.general;

    const newIncident: IncidentReport = {
      id,
      siteCode: input.siteCode || 'BPI',
      siteName: input.siteName || (input.siteCode === 'PRB' ? 'สาขาปราจีนบุรี' : 'สาขาบางปะอิน'),
      location: input.location,
      incidentType: input.incidentType,
      severity: input.severity,
      description: input.description,
      imageUrl: input.imageUrl,
      reportedBy: input.reportedBy,
      employeeId: input.employeeId,
      reportedAt: d.toISOString(),
      status: 'reported',
      sopTitle: tpl.title,
      sopSteps: tpl.steps.map((label, idx) => ({
        id: `step-${idx + 1}`,
        label,
        completed: false,
      })),
    };

    const updated = [newIncident, ...incidents];
    this.saveIncidents(updated);

    // Create notification for SOC
    this.sendNotification({
      title: `แจ้งเหตุฉุกเฉินใหม่: ${newIncident.incidentType}`,
      message: `จุดเกิดเหตุ: ${newIncident.location} (${newIncident.siteCode}) - ระดับความรุนแรง: ${newIncident.severity.toUpperCase()}`,
      type: 'incident_reported',
      incidentId: newIncident.id,
      targetRole: 'soc',
    });

    this.broadcast({
      type: 'incident_created',
      incident: newIncident,
      timestamp: d.toISOString(),
    });

    return newIncident;
  }

  dispatchIncident(
    incidentId: string,
    dispatchData: {
      assignedTo: string;
      note?: string;
      dispatchedBy?: string;
      sopTitle?: string;
      sopSteps?: string[];
    }
  ): IncidentReport | null {
    const incidents = this.getIncidents();
    const idx = incidents.findIndex((i) => i.id === incidentId);
    if (idx === -1) return null;

    const now = new Date().toISOString();
    const inc = incidents[idx];

    let steps = inc.sopSteps;
    if (dispatchData.sopSteps && dispatchData.sopSteps.length > 0) {
      steps = dispatchData.sopSteps.map((s, i) => ({
        id: `step-${i + 1}`,
        label: s,
        completed: false,
      }));
    }

    const updatedIncident: IncidentReport = {
      ...inc,
      status: 'dispatched',
      assignedTo: dispatchData.assignedTo,
      dispatchedBy: dispatchData.dispatchedBy || 'SOC Command Center',
      dispatchedAt: now,
      dispatchNote: dispatchData.note,
      sopTitle: dispatchData.sopTitle || inc.sopTitle,
      sopSteps: steps,
    };

    incidents[idx] = updatedIncident;
    this.saveIncidents(incidents);

    // Send urgent notification to PWA Guards
    this.sendNotification({
      title: `คำสั่งด่วนจาก SOC: ${updatedIncident.incidentType}`,
      message: `มอบหมาย: ${updatedIncident.assignedTo} | จุด: ${updatedIncident.location} - ${dispatchData.note || 'กรุณาเข้าดำเนินการตาม SOP ทันที'}`,
      type: 'urgent_dispatch',
      incidentId: updatedIncident.id,
      targetRole: 'guard',
    });

    this.broadcast({
      type: 'incident_dispatched',
      incident: updatedIncident,
      timestamp: now,
    });

    return updatedIncident;
  }

  acknowledgeIncident(incidentId: string, officerName?: string): IncidentReport | null {
    const incidents = this.getIncidents();
    const idx = incidents.findIndex((i) => i.id === incidentId);
    if (idx === -1) return null;

    const now = new Date().toISOString();
    const inc = incidents[idx];

    const updatedIncident: IncidentReport = {
      ...inc,
      status: 'in_progress',
      acknowledgedAt: now,
      assignedTo: officerName || inc.assignedTo,
    };

    incidents[idx] = updatedIncident;
    this.saveIncidents(incidents);

    this.sendNotification({
      title: `เจ้าหน้ารับทราบคำสั่ง: ${updatedIncident.incidentType}`,
      message: `${updatedIncident.assignedTo} รับทราบคำสั่งและเริ่มปฏิบัติการ SOP แล้ว`,
      type: 'sop_updated',
      incidentId: updatedIncident.id,
      targetRole: 'soc',
    });

    this.broadcast({
      type: 'incident_acknowledged',
      incident: updatedIncident,
      timestamp: now,
    });

    return updatedIncident;
  }

  toggleSopStep(incidentId: string, stepId: string): IncidentReport | null {
    const incidents = this.getIncidents();
    const idx = incidents.findIndex((i) => i.id === incidentId);
    if (idx === -1) return null;

    const now = new Date().toISOString();
    const inc = incidents[idx];

    const updatedSteps = inc.sopSteps.map((st) => {
      if (st.id === stepId) {
        return {
          ...st,
          completed: !st.completed,
          completedAt: !st.completed ? now : undefined,
        };
      }
      return st;
    });

    const updatedIncident: IncidentReport = {
      ...inc,
      status: 'in_progress',
      sopSteps: updatedSteps,
    };

    incidents[idx] = updatedIncident;
    this.saveIncidents(incidents);

    this.broadcast({
      type: 'sop_step_toggled',
      incident: updatedIncident,
      timestamp: now,
    });

    return updatedIncident;
  }

  resolveIncident(
    incidentId: string,
    resolutionData: { note?: string; resolvedBy?: string }
  ): IncidentReport | null {
    const incidents = this.getIncidents();
    const idx = incidents.findIndex((i) => i.id === incidentId);
    if (idx === -1) return null;

    const now = new Date().toISOString();
    const inc = incidents[idx];

    // Mark all remaining steps completed on resolve
    const finalSteps = inc.sopSteps.map((s) => ({
      ...s,
      completed: true,
      completedAt: s.completedAt || now,
    }));

    const updatedIncident: IncidentReport = {
      ...inc,
      status: 'resolved',
      sopSteps: finalSteps,
      resolvedAt: now,
      resolvedBy: resolutionData.resolvedBy || inc.assignedTo || 'เจ้าหน้าที่ผู้ระงับเหตุ',
      resolutionNote: resolutionData.note || 'เสร็จสิ้นการระงับเหตุตามขั้นตอน SOP',
    };

    incidents[idx] = updatedIncident;
    this.saveIncidents(incidents);

    this.sendNotification({
      title: `ปิดเคสเรียบร้อย: ${updatedIncident.incidentType}`,
      message: `โดย ${updatedIncident.resolvedBy} ณ จุดเกิดเหตุ ${updatedIncident.location}`,
      type: 'case_resolved',
      incidentId: updatedIncident.id,
      targetRole: 'all',
    });

    this.broadcast({
      type: 'incident_resolved',
      incident: updatedIncident,
      timestamp: now,
    });

    return updatedIncident;
  }

  getNotifications(): IncidentNotification[] {
    if (typeof window === 'undefined') return getInitialNotifications();
    try {
      const stored = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      if (!stored) {
        const initial = getInitialNotifications();
        localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(stored);
    } catch {
      return getInitialNotifications();
    }
  }

  saveNotifications(notifs: IncidentNotification[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifs));
    } catch (e) {
      console.warn('Failed to save notifications:', e);
    }
  }

  sendNotification(input: {
    title: string;
    message: string;
    type: IncidentNotification['type'];
    incidentId: string;
    targetRole?: IncidentNotification['targetRole'];
  }): IncidentNotification {
    const notifs = this.getNotifications();
    const newNotif: IncidentNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: input.title,
      message: input.message,
      type: input.type,
      incidentId: input.incidentId,
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: input.targetRole || 'all',
    };

    const updated = [newNotif, ...notifs].slice(0, 50);
    this.saveNotifications(updated);

    this.broadcast({
      type: 'notification_received',
      notification: newNotif,
      timestamp: newNotif.timestamp,
    });

    return newNotif;
  }

  markNotificationAsRead(id: string) {
    const notifs = this.getNotifications();
    const updated = notifs.map((n) => (n.id === id ? { ...n, read: true } : n));
    this.saveNotifications(updated);
  }

  markAllNotificationsAsRead() {
    const notifs = this.getNotifications();
    const updated = notifs.map((n) => ({ ...n, read: true }));
    this.saveNotifications(updated);
  }
}

export const IncidentService = new IncidentServiceImpl();
