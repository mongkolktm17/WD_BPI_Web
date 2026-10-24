'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/Pagination';
import {
  Camera, Car, Radio, ShieldCheck, UserCheck, Building2,
  FileText, ClipboardList, RefreshCw, Eye, Pencil, Trash2,
  Download, Search, X, BarChart3, ScanLine, HardHat,
  LayoutGrid, List, ChevronRight, Shield, Bell, CheckCircle2,
  Clock, MapPin, Smartphone, ArrowRight, UserCircle, LogOut,
  SlidersHorizontal, Sparkles, Filter, ChevronDown, Wifi, WifiOff,
  Calendar, Layers, Check, ExternalLink, Settings, LayoutDashboard,
  Wrench, AlertTriangle
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useSite } from '@/lib/SiteContext';
import ReportDetailModal from '@/components/ReportDetailModal';
import { IncidentService, type IncidentNotification, type IncidentReport } from '@/lib/incident-service';
import ReportIncidentModal from '@/components/incidents/ReportIncidentModal';
import SopTaskModal from '@/components/incidents/SopTaskModal';
import NotificationBanner from '@/components/incidents/NotificationBanner';
import NotificationDrawer from '@/components/incidents/NotificationDrawer';

// เมนูรายงานเหตุการณ์และการตรวจตราทั้งหมด 17 เมนู
interface MenuLink {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  color: string;
  bgColor: string;
  shadow: string;
  badge: string;
  permission: string;
  category: 'patrol' | 'checkpoint' | 'cctv' | 'stats' | 'system';
  isSupervisor?: boolean;
  hasAmberDot?: boolean;
}

const REPORT_MENUS: MenuLink[] = [
  {
    id: 'building',
    name: 'รายงานอาคาร',
    nameEn: 'Building Inspection',
    desc: 'ตรวจความเรียบร้อยรอบอาคาร 2, 3, 4, 6, 9',
    href: '/select-building',
    icon: Building2,
    color: 'from-blue-600 to-indigo-700',
    bgColor: 'bg-blue-50 text-blue-700',
    shadow: 'shadow-blue-500/25',
    badge: 'ตรวจประจำวัน',
    permission: 'report_page',
    category: 'patrol',
  },
  {
    id: 'car-parking',
    name: 'ตรวจลานจอดรถ',
    nameEn: 'Car Parking Inspection',
    desc: 'ตรวจรถยนต์ จักรยานยนต์ และพื้นที่จอดรถ',
    href: '/car-parking',
    icon: Car,
    color: 'from-sky-500 to-cyan-600',
    bgColor: 'bg-sky-50 text-sky-700',
    shadow: 'shadow-sky-500/25',
    badge: 'ทุกรอบผลัด',
    permission: 'car_parking',
    category: 'patrol',
  },
  {
    id: 'patrol-checklist',
    name: 'Checklist Patrol',
    nameEn: 'Patrol Checklist',
    desc: 'บันทึกการเดินตรวจตราตามจุดตรวจรักษาความปลอดภัย',
    href: '/patrol-checklist',
    icon: ClipboardList,
    color: 'from-emerald-500 to-teal-700',
    bgColor: 'bg-emerald-50 text-emerald-700',
    shadow: 'shadow-emerald-500/25',
    badge: 'เดินตรวจทุก 2 ชม.',
    permission: 'patrol_checklist',
    category: 'patrol',
  },
  {
    id: 'guard-duty-log',
    name: 'Guard Duty Log',
    nameEn: 'Guard Duty & Personnel',
    desc: 'บันทึกการเข้าเวร-ออกเวร และนับจำนวน รปภ.',
    href: '/guard-duty-log',
    icon: UserCheck,
    color: 'from-amber-500 to-yellow-600',
    bgColor: 'bg-amber-50 text-amber-700',
    shadow: 'shadow-amber-500/25',
    badge: 'ลงเวลารายผลัด',
    permission: 'guard_duty_log',
    category: 'patrol',
  },
  {
    id: 'handheld-detector',
    name: 'ตรวจ Hand Held',
    nameEn: 'Handheld Metal Detector',
    desc: 'ตรวจความพร้อมเครื่องตรวจจับโลหะแบบมือถือ',
    href: '/handheld-detector',
    icon: ScanLine,
    color: 'from-amber-600 to-orange-600',
    bgColor: 'bg-orange-50 text-orange-700',
    shadow: 'shadow-amber-500/25',
    badge: 'ตรวจแบตเตอรี่ & หัวตรวจ',
    permission: 'metal_detector',
    category: 'checkpoint',
  },
  {
    id: 'walkthrough-detector',
    name: 'Metal Detector',
    nameEn: 'Walk-Through Gate',
    desc: 'ตรวจสอบซุ้มประตูตรวจจับโลหะทางเข้า-ออก',
    href: '/walkthrough-detector',
    icon: HardHat,
    color: 'from-teal-500 to-cyan-700',
    bgColor: 'bg-teal-50 text-teal-700',
    shadow: 'shadow-teal-500/25',
    badge: 'ก่อนเริ่มผลัด',
    permission: 'walkthrough_detector',
    category: 'checkpoint',
  },
  {
    id: 'radio-inspection',
    name: 'ตรวจวิทยุสื่อสาร',
    nameEn: 'Radio Inspection',
    desc: 'ตรวจสภาพวิทยุสื่อสารและระดับแบตเตอรี่',
    href: '/radio-inspection',
    icon: Radio,
    color: 'from-orange-500 to-red-600',
    bgColor: 'bg-red-50 text-red-700',
    shadow: 'shadow-orange-500/25',
    badge: 'ตรวจช่องสัญญาณ',
    permission: 'radio_inspection',
    category: 'checkpoint',
  },
  {
    id: 'cctv-inspection',
    name: 'ตรวจห้อง CCTV',
    nameEn: 'CCTV Control Room',
    desc: 'ตรวจอุปกรณ์และความพร้อมห้องควบคุม CCTV',
    href: '/cctv-inspection',
    icon: Camera,
    color: 'from-indigo-500 to-blue-700',
    bgColor: 'bg-indigo-50 text-indigo-700',
    shadow: 'shadow-indigo-500/25',
    badge: 'ประจำวัน',
    permission: 'cctv_inspection',
    category: 'cctv',
  },
  {
    id: 'cctv-angle-check',
    name: 'CCTV Angle',
    nameEn: 'Camera Angle Audit',
    desc: 'ตรวจสอบมุมมองและความคมชัดกล้องวงจรปิด',
    href: '/cctv-angle-check',
    icon: Camera,
    color: 'from-rose-500 to-pink-600',
    bgColor: 'bg-rose-50 text-rose-700',
    shadow: 'shadow-rose-500/25',
    badge: 'ตรวจสอบมุมกล้อง',
    permission: 'cctv_angle_check',
    category: 'cctv',
    isSupervisor: true,
  },
  {
    id: 'nvr-recording',
    name: 'NVR Days',
    nameEn: 'NVR Storage Audit',
    desc: 'ตรวจสอบจำนวนวันบันทึกข้อมูลย้อนหลังของ NVR',
    href: '/nvr-recording',
    icon: FileText,
    color: 'from-violet-600 to-purple-700',
    bgColor: 'bg-violet-50 text-violet-700',
    shadow: 'shadow-violet-500/25',
    badge: 'เช็กฮาร์ดดิสก์',
    permission: 'nvr_recording',
    category: 'cctv',
    isSupervisor: true,
  },
  {
    id: 'cctv-report',
    name: 'รายงาน CCTV',
    nameEn: 'CCTV System Report',
    desc: 'สรุปรายงานข้อบกพร่องและสถานะกล้องวงจรปิด',
    href: '/cctv-report',
    icon: BarChart3,
    color: 'from-indigo-600 to-purple-800',
    bgColor: 'bg-indigo-50 text-indigo-800',
    shadow: 'shadow-indigo-500/25',
    badge: 'รายงานภาพรวม',
    permission: 'cctv_report',
    category: 'cctv',
    isSupervisor: true,
  },
  {
    id: 'visual-report',
    name: 'สถิติรายสัปดาห์',
    nameEn: 'Executive Visual Report',
    desc: 'แดชบอร์ดกราฟสรุปเหตุการณ์และความปลอดภัย',
    href: '/visual-report',
    icon: BarChart3,
    color: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-50 text-pink-700',
    shadow: 'shadow-pink-500/25',
    badge: 'สถิติวิเคราะห์',
    permission: 'report_visual',
    category: 'stats',
    isSupervisor: true,
  },
  {
    id: 'ai-smart-report',
    name: 'AI Smart Report',
    nameEn: 'Executive AI Briefing',
    desc: 'ระบบร่างรายงานสรุปผู้บริหารอัจฉริยะ 4 เสาหลัก พร้อม RAG และคลังความรู้โรงงาน',
    href: '/?openAiReport=true',
    icon: Sparkles,
    color: 'from-blue-600 via-indigo-600 to-purple-700',
    bgColor: 'bg-blue-50 text-blue-700',
    shadow: 'shadow-blue-500/25',
    badge: 'AI อัจฉริยะ',
    permission: 'report_page',
    category: 'stats',
    isSupervisor: true,
  },
  {
    id: 'soc-dashboard',
    name: 'SOC Dashboard',
    nameEn: 'Operations Dashboard',
    desc: 'ศูนย์บัญชาการความปลอดภัยหลัก แดชบอร์ดผู้บริหาร และสถานะภาพรวม 5 เสาหลัก',
    href: '/',
    icon: LayoutDashboard,
    color: 'from-blue-700 via-indigo-700 to-slate-900',
    bgColor: 'bg-blue-50 text-blue-900',
    shadow: 'shadow-blue-600/30',
    badge: 'ผู้บริหาร / Admin',
    permission: 'dashboard',
    category: 'system',
    isSupervisor: true,
  },
  {
    id: 'system-settings',
    name: 'ตั้งค่าระบบ',
    nameEn: 'System Settings',
    desc: 'นำเข้าฐานข้อมูล ตรวจสอบความพร้อมระบบ และจัดการข้อมูลหลัก',
    href: '/admin/settings',
    icon: Settings,
    color: 'from-slate-700 to-blue-900',
    bgColor: 'bg-slate-100 text-slate-800',
    shadow: 'shadow-slate-500/25',
    badge: 'ผู้ดูแลระบบ',
    permission: 'admin',
    category: 'system',
    isSupervisor: true,
  },
  {
    id: 'emergency-incident',
    name: 'แจ้งเหตุฉุกเฉิน',
    nameEn: 'Report Incident',
    desc: 'รายงานเหตุด่วน / อุบัติเหตุ และภัยคุกคามเข้าสู่ศูนย์ SOC',
    href: '#report-incident',
    icon: AlertTriangle,
    color: 'from-rose-600 to-red-700',
    bgColor: 'bg-rose-50 text-rose-700',
    shadow: 'shadow-rose-500/25',
    badge: 'รายงานเหตุด่วน',
    permission: 'report_page',
    category: 'patrol',
    hasAmberDot: false,
  },
  {
    id: 'sop-dispatch',
    name: 'งานสั่งการ / SOP',
    nameEn: 'SOC Dispatch & SOP',
    desc: 'รับคำสั่ง & เช็กลิสต์ระงับเหตุตามขั้นตอนมาตรฐาน',
    href: '#sop-dispatch',
    icon: ClipboardList,
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50 text-amber-700',
    shadow: 'shadow-amber-500/25',
    badge: 'รับคำสั่ง SOC',
    permission: 'report_page',
    category: 'patrol',
    hasAmberDot: true,
  },
];

const REPORT_TYPE_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด (All Reports)' },
  { value: 'emergency_incident', label: 'แจ้งเหตุฉุกเฉิน / ระงับเหตุ' },
  { value: 'general', label: 'รายงานทั่วไป' },
  { value: 'car_parking', label: 'ตรวจลานจอดรถ' },
  { value: 'cctv_inspection', label: 'ตรวจห้อง CCTV' },
  { value: 'hand_held', label: 'ตรวจ Hand Held' },
  { value: 'patrol', label: 'Checklist Patrol' },
  { value: 'guard_count', label: 'บันทึกจำนวน รปภ.' },
  { value: 'cctv_report', label: 'NVR Recording' },
  { value: 'cctv_angle', label: 'CCTV Angle Check' },
  { value: 'metal_detector', label: 'ตรวจ Metal Detector' },
  { value: 'radio_inspection', label: 'ตรวจวิทยุสื่อสาร' },
];

const TYPE_COLOR_MAP: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  emergency_incident: { bg: 'bg-rose-100', text: 'text-rose-700', icon: AlertTriangle },
  general: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Building2 },
  car_parking: { bg: 'bg-sky-100', text: 'text-sky-700', icon: Car },
  cctv_inspection: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Camera },
  hand_held: { bg: 'bg-amber-100', text: 'text-amber-700', icon: ScanLine },
  patrol: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: ShieldCheck },
  guard_count: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: UserCheck },
  cctv_report: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: BarChart3 },
  cctv_angle: { bg: 'bg-rose-100', text: 'text-rose-700', icon: Camera },
  metal_detector: { bg: 'bg-teal-100', text: 'text-teal-700', icon: HardHat },
  radio_inspection: { bg: 'bg-orange-100', text: 'text-orange-700', icon: Radio },
};

interface ReportItem {
  id: string;
  type: string;
  label: string;
  details: string;
  submitted_by: string;
  employeeId?: string | null;
  time: string;
  deleteType: string;
  deleteId: number | string;
  updatedBy?: string;
  apiPath?: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function formatDateTime(d: string | Date): string {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  const h = String(dt.getHours()).padStart(2, '0');
  const min = String(dt.getMinutes()).padStart(2, '0');
  const s = String(dt.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

export default function ReportPage() {
  const router = useRouter();
  const { currentSite, sites, switchSite, isExecutive } = useSite();

  // Tab & View Mode state
  const [activeTab, setActiveTab] = useState<'menus' | 'incidents' | 'stats' | 'profile'>('menus');
  const [viewMode, setViewMode] = useState<'icon' | 'list'>('icon');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'patrol' | 'checkpoint' | 'cctv' | 'stats' | 'system'>('all');
  
  // PWA install state
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // User Profile & Roles state
  const [userName, setUserName] = useState('');
  const [userEmployeeId, setUserEmployeeId] = useState('');
  const [userRoleName, setUserRoleName] = useState('');
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [userRoleBadge, setUserRoleBadge] = useState('เจ้าหน้าที่ รปภ.');
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // Incidents Filter state
  const [filterType, setFilterType] = useState('all');
  const [filterSubmitter, setFilterSubmitter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Incident & Real-time Command Center state
  const [isReportIncidentOpen, setIsReportIncidentOpen] = useState(false);
  const [isSopTaskOpen, setIsSopTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState<IncidentNotification | null>(null);
  const [notifications, setNotifications] = useState<IncidentNotification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [activeDispatchCount, setActiveDispatchCount] = useState(0);

  // Subscribe to real-time notifications and incidents
  useEffect(() => {
    const reload = () => {
      const allNotifs = IncidentService.getNotifications();
      setNotifications(allNotifs);
      setUnreadNotifCount(allNotifs.filter((n) => !n.read).length);

      const allIncidents = IncidentService.getIncidents();
      const pendingDispatches = allIncidents.filter(
        (i) => i.status === 'dispatched' || i.status === 'in_progress'
      ).length;
      setActiveDispatchCount(pendingDispatches);
    };

    reload();
    const unsub = IncidentService.subscribe((event) => {
      reload();
      if (
        event.type === 'notification_received' &&
        event.notification &&
        (event.notification.type === 'urgent_dispatch' || event.notification.type === 'alert_reminder')
      ) {
        setActiveNotification(event.notification);
      }
    });

    return unsub;
  }, []);

  // Deep-link check for openIncident / openSop
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('openIncident') === 'true' || window.location.hash === '#report-incident') {
        setIsReportIncidentOpen(true);
      }
      if (params.get('openSop') === 'true' || window.location.hash === '#sop-dispatch') {
        setIsSopTaskOpen(true);
      }
    }
  }, []);

  // Check PWA standalone mode and localStorage viewMode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('wd_soc_view_mode');
      if (savedMode === 'icon' || savedMode === 'list') {
        setViewMode(savedMode);
      }
      const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(checkStandalone);
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  const handleToggleViewMode = (mode: 'icon' | 'list') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wd_soc_view_mode', mode);
    }
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Fetch current user details
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedStr = localStorage.getItem('user');
        if (cachedStr) {
          const u = JSON.parse(cachedStr);
          if (u.fullName) setUserName(u.fullName);
          else if (u.username) setUserName(u.username);
          if (u.employeeId) setUserEmployeeId(String(u.employeeId));
          else if (u.username) setUserEmployeeId(String(u.username));
          const rName = String(u.role?.name || u.roleName || '');
          const rId = Number(u.role?.id ?? u.roleId ?? 0);
          setUserRoleName(rName);
          setUserRoleId(rId);
          const isAdm = rId === 1 || u.username === 'admin' || u.username === 'itadmin' || rName.toLowerCase().includes('admin') || rName.includes('ผู้ดูแลระบบ');
          const isExec = u.isExecutive === true || rId === 6 || rName.includes('ผู้บริหาร') || rName.toLowerCase().includes('executive');
          const isSuper = isAdm || isExec || rId === 2 || rName.includes('หัวหน้า') || rName.toLowerCase().includes('supervisor');
          setIsSupervisor(isSuper);
          if (isAdm) setUserRoleBadge('ผู้ดูแลระบบ (Admin)');
          else if (isExec) setUserRoleBadge('ผู้บริหาร (Executive)');
          else if (isSuper) setUserRoleBadge('หัวหน้า รปภ.');
          else setUserRoleBadge('เจ้าหน้าที่ รปภ.');
          const perms: string[] = [];
          if (u.role?.permissions) {
            for (const p of u.role.permissions) perms.push(p.moduleName || p.name || p);
          }
          if (perms.length === 0 && u.permissions) {
            for (const p of u.permissions) perms.push(typeof p === 'string' ? p : p.moduleName || p.name || '');
          }
          if (isAdm || isExec) {
            if (!perms.includes('all')) perms.push('all');
            if (!perms.includes('admin')) perms.push('admin');
            if (!perms.includes('dashboard')) perms.push('dashboard');
          }
          setUserPermissions(perms);
        }
      } catch {}
    }

    apiFetch<any>('/api/auth/me')
      .then((data) => {
        const d = data?.data ?? data;
        const u = d?.user ?? d;
        if (u.fullName) setUserName(u.fullName);
        else if (u.username) setUserName(u.username);
        if (u.username) setUserEmployeeId(String(u.username));
        else if (u.employeeId) setUserEmployeeId(String(u.employeeId));

        const roleName = String(u.role?.name || u.role?.roleName || u.roleName || '');
        const roleId = Number(u.role?.id ?? u.roleId ?? 0);
        setUserRoleName(roleName);
        setUserRoleId(roleId);

        const isAdm =
          roleId === 1 ||
          u.username === 'admin' ||
          u.username === 'itadmin' ||
          roleName.toLowerCase().includes('admin') ||
          roleName.includes('ผู้ดูแลระบบ');

        const isExec =
          u.isExecutive === true ||
          roleId === 6 ||
          roleName.includes('ผู้บริหาร') ||
          roleName.toLowerCase().includes('executive');

        const isSuper =
          isAdm ||
          isExec ||
          roleId === 2 ||
          roleName.includes('หัวหน้า') ||
          roleName.toLowerCase().includes('supervisor');
        setIsSupervisor(isSuper);

        if (isAdm) {
          setUserRoleBadge('ผู้ดูแลระบบ (Admin)');
        } else if (isExec) {
          setUserRoleBadge('ผู้บริหาร (Executive)');
        } else if (isSuper) {
          setUserRoleBadge('หัวหน้า รปภ.');
        } else {
          setUserRoleBadge('เจ้าหน้าที่ รปภ.');
        }

        const perms: string[] = [];
        if (u.role?.permissions) {
          for (const p of u.role.permissions) {
            perms.push(p.moduleName || p.name || p);
          }
        }
        if (perms.length === 0 && u.permissions) {
          for (const p of u.permissions) {
            perms.push(typeof p === 'string' ? p : p.moduleName || p.name || '');
          }
        }
        if (isAdm || isExec) {
          if (!perms.includes('all')) perms.push('all');
          if (!perms.includes('admin')) perms.push('admin');
          if (!perms.includes('dashboard')) perms.push('dashboard');
        }
        setUserPermissions(perms);
      })
      .catch(() => {});
  }, []);

  // Fetch incident reports
  const fetchAllReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.set('type', filterType);
      if (filterSubmitter) params.set('submitter', filterSubmitter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      const res = await apiFetch<any>(`/api/reports/all-reports?${params.toString()}`);
      const items = res?.data?.data || res?.data || [];
      const total = res?.data?.total || res?.total || 0;

      const allReports: ReportItem[] = items.map((item: any) => ({
        id: `${item.typeKey}-${item.id}`,
        type: item.typeKey,
        label: item.reportType,
        details: item.details || '-',
        submitted_by: item.submittedBy || '-',
        employeeId: item.employeeId ?? null,
        time: item.submissionTime,
        updatedBy: item.updatedBy,
        apiPath: item.apiPath,
        deleteType: item.apiPath,
        deleteId: item.id,
      }));

      const localIncidents = IncidentService.getIncidents();
      const localItems: ReportItem[] = localIncidents.map((inc) => ({
        id: inc.id,
        type: 'emergency_incident',
        label: `แจ้งเหตุฉุกเฉิน (${inc.incidentType})`,
        details: `[${inc.severity.toUpperCase()}] ${inc.location} - ${inc.description}`,
        submitted_by: inc.reportedBy,
        employeeId: inc.employeeId || null,
        time: inc.reportedAt,
        deleteType: 'local_incident',
        deleteId: inc.id,
      }));

      let combined = [...localItems, ...allReports];
      if (filterType !== 'all') {
        combined = combined.filter((r) => r.type === filterType);
      }

      setReports(combined);
      setTotalRecords(total + localItems.length);
    } catch (err: any) {
      // Fallback gracefully to local incidents when API is offline
      const localIncidents = IncidentService.getIncidents();
      const localItems: ReportItem[] = localIncidents.map((inc) => ({
        id: inc.id,
        type: 'emergency_incident',
        label: `แจ้งเหตุฉุกเฉิน (${inc.incidentType})`,
        details: `[${inc.severity.toUpperCase()}] ${inc.location} - ${inc.description}`,
        submitted_by: inc.reportedBy,
        employeeId: inc.employeeId || null,
        time: inc.reportedAt,
        deleteType: 'local_incident',
        deleteId: inc.id,
      }));
      setReports(localItems);
      setTotalRecords(localItems.length);
      setError('');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterSubmitter, dateFrom, dateTo, page, pageSize]);

  useEffect(() => {
    fetchAllReports();
  }, [fetchAllReports]);

  const isAdmin =
    userPermissions.includes('all') ||
    userPermissions.includes('admin') ||
    userRoleId === 1 ||
    userRoleName.toLowerCase().includes('admin') ||
    userRoleName.includes('ผู้ดูแลระบบ');

  const canAccessDashboard =
    isAdmin ||
    isExecutive ||
    userRoleId === 6 ||
    userRoleName.includes('ผู้บริหาร') ||
    userRoleName.toLowerCase().includes('executive') ||
    userPermissions.includes('dashboard');

  const hasScopedPermissions = userPermissions.length > 0 && !isAdmin && !canAccessDashboard;

  // Filter visible quick links by permissions
  const authorizedMenus = REPORT_MENUS.filter((link) => {
    if (link.permission === 'dashboard' && !canAccessDashboard) return false;
    if (link.permission === 'admin' && !isAdmin) return false;
    if (hasScopedPermissions) return userPermissions.includes(link.permission);
    return true;
  });

  // Filter menus by search query and category
  const filteredMenus = authorizedMenus.filter((menu) => {
    const matchesCategory = selectedCategory === 'all' || menu.category === selectedCategory;
    const q = menuSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      menu.name.toLowerCase().includes(q) ||
      menu.nameEn.toLowerCase().includes(q) ||
      menu.desc.toLowerCase().includes(q) ||
      menu.badge.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const handleDelete = async (deleteType: string, deleteId: number | string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายงานนี้?')) return;
    try {
      await apiFetch(`/api/${deleteType}/${deleteId}`, { method: 'DELETE' });
      fetchAllReports();
    } catch (err: any) {
      alert(err.message || 'ลบไม่สำเร็จ');
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.set('type', filterType);
      if (filterSubmitter) params.set('submitter', filterSubmitter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await apiFetch<any>(`/api/reports/all-reports/export?${params.toString()}`);
      const items = res?.data?.data ?? res?.data ?? [];
      const rows = (Array.isArray(items) ? items : []).map((r: any) => [
        formatDateTime(r.submissionTime ?? r.time ?? ''),
        r.reportType ?? r.label ?? '',
        r.details ?? '',
        r.submittedBy ?? r.submitted_by ?? '',
      ]);
      const headers = ['เวลาส่ง', 'ประเภทรายงาน', 'รายละเอียด', 'ผู้รายงาน'];
      const csvContent = '\uFEFF' + [headers, ...rows].map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.setAttribute('download', `soc_incident_reports_${stamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || 'ส่งออกไม่สำเร็จ');
    } finally {
      setExporting(false);
    }
  };

  const handleSubmitterChange = (value: string) => {
    setFilterSubmitter(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      apiFetch<any>(`/api/reports/all-reports?submitter=${encodeURIComponent(value)}&limit=5`)
        .then((res) => {
          const raw = res?.data?.data ?? res?.data ?? res ?? [];
          const items = Array.isArray(raw) ? raw : [];
          setSuggestions(items.map((n: any) => n.submittedBy ?? n.submitted_by).filter(Boolean));
        })
        .catch(() => setSuggestions([]));
    }, 300);
  };

  const handleClearFilters = () => {
    setFilterType('all');
    setFilterSubmitter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setSuggestions([]);
  };

  const handleViewReport = async (report: ReportItem) => {
    try {
      const data = await apiFetch<any>(`/api/${report.apiPath}/${report.deleteId}`);
      setSelectedReport({ ...(data?.data ?? data), type: report.type, label: report.label, details: report.details, submitted_by: report.submitted_by, time: report.time });
      setModalMode('view');
      setModalOpen(true);
    } catch {
      setSelectedReport({ type: report.type, label: report.label, details: report.details, submitted_by: report.submitted_by, time: report.time });
      setModalMode('view');
      setModalOpen(true);
    }
  };

  const handleEditReport = async (report: ReportItem) => {
    try {
      const data = await apiFetch<any>(`/api/${report.apiPath}/${report.deleteId}`);
      setSelectedReport({ ...(data?.data ?? data), type: report.type, label: report.label, details: report.details, submitted_by: report.submitted_by, time: report.time });
      setModalMode('edit');
      setModalOpen(true);
    } catch {
      setSelectedReport({ type: report.type, label: report.label, details: report.details, submitted_by: report.submitted_by, time: report.time });
      setModalMode('edit');
      setModalOpen(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Quick stats calculations
  const todayCount = reports.filter((r) => {
    const today = new Date().toISOString().slice(0, 10);
    return r.time && r.time.startsWith(today);
  }).length;

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800 font-sans selection:bg-blue-600 selection:text-white pb-24 sm:pb-12">
      
      {/* ── 1. Compact PWA Native App Bar with Graphic WD Logo (Height ~52px) ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-2.5 sm:px-4 py-2 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
          
          {/* Left: Graphic WD Logo + Plant Badge (Locked for Guards/Supervisors) + Online Dot */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            {/* Graphic WD Logo */}
            {canAccessDashboard ? (
              <Link
                href="/"
                className="flex items-center flex-shrink-0 hover:opacity-85 transition-opacity"
                title="ออกไปสู่แดชบอร์ดหลัก (SOC Command Center Dashboard)"
              >
                <img
                  src="/report_assets/Images/images_logo.png"
                  alt="Western Digital Logo"
                  className="h-6 sm:h-7 w-auto object-contain flex-shrink-0 cursor-pointer"
                />
              </Link>
            ) : (
              <img
                src="/report_assets/Images/images_logo.png"
                alt="Western Digital Logo"
                className="h-6 sm:h-7 w-auto object-contain flex-shrink-0"
              />
            )}

            {/* Static Assigned Plant Status (No switching for Security Staff) */}
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-[10.5px] sm:text-[11px] font-mono font-bold shadow-2xs flex-shrink-0"
              title={`ประจำพื้นที่ปฏิบัติการ: ${currentSite?.name} (${currentSite?.code})`}
            >
              <MapPin className="w-3 h-3 text-sky-600 flex-shrink-0" />
              <span>{currentSite?.code || 'BPI'}</span>
            </div>

            {/* Online Status Dot */}
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-red-500 ring-2 ring-red-500/20'}`}
              title={isOnline ? 'เชื่อมต่อออนไลน์' : 'ออฟไลน์'}
            />
          </div>

          {/* Right: Dashboard Exit, Quick Search, View Mode Toggle, Supervisor Shortcut & User/Logout */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">

            {/* Exit to Main SOC Dashboard (Shown on sm+ to prevent mobile header congestion) */}
            {canAccessDashboard && (
              <Link
                href="/"
                className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[11px] font-bold px-2.5 sm:px-3 py-1.5 rounded-xl transition-all shadow-xs hover:shadow-sm active:scale-95 border border-blue-400/30"
                title="ออกไปสู่แดชบอร์ดหลัก (SOC Command Center Dashboard)"
              >
                <LayoutDashboard className="w-3.5 h-3.5 flex-shrink-0" />
                <span>แดชบอร์ดหลัก</span>
              </Link>
            )}

            {/* Real-time Notification Bell */}
            <button
              onClick={() => setIsNotificationDrawerOpen(true)}
              className={`p-1.5 rounded-xl border transition-all active:scale-95 shadow-2xs relative ${
                unreadNotifCount > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="การแจ้งเตือนคำสั่งจากศูนย์ SOC (Real-time Notifications)"
            >
              <Bell className="w-4 h-4" strokeWidth={1.75} />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-rose-600 text-white font-mono text-[9px] font-bold rounded-full px-1 flex items-center justify-center border border-white shadow-xs animate-pulse">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </button>

            {/* Quick Search Toggle */}
            <button
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) setMenuSearchQuery('');
              }}
              className={`p-1.5 rounded-xl border transition-all active:scale-95 shadow-2xs ${
                showSearch || menuSearchQuery
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="ค้นหาเมนูรายงาน"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* View Mode Toggle (Grid ⊞ / List ≡) */}
            <button
              onClick={() => handleToggleViewMode(viewMode === 'icon' ? 'list' : 'icon')}
              className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-blue-600 active:scale-95 transition-all shadow-2xs"
              title={viewMode === 'icon' ? 'เปลี่ยนเป็นมุมมองรายการ (List View)' : 'เปลี่ยนเป็นมุมมองไอคอน (Icon Grid)'}
            >
              {viewMode === 'icon' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>

            {/* Supervisor shortcut button (if supervisor) */}
            {isSupervisor && (
              <Link
                href="/manage-officers"
                className="hidden md:flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold px-2 py-1 rounded-xl transition-all shadow-2xs"
                title="จัดการ รปภ."
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>จัดการ รปภ.</span>
              </Link>
            )}

            {/* Admin shortcut button: ตั้งค่าระบบ */}
            {isAdmin && (
              <Link
                href="/admin/settings"
                className="hidden md:flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-[11px] font-bold px-2 py-1 rounded-xl transition-all shadow-2xs"
                title="ตั้งค่าระบบ (System Settings)"
              >
                <Settings className="w-3.5 h-3.5 text-blue-600" />
                <span>ตั้งค่าระบบ</span>
              </Link>
            )}

            {/* User Avatar & Profile shortcut */}
            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 p-1 sm:pl-1.5 sm:pr-2.5 sm:py-1 rounded-xl border border-slate-200 active:scale-95 transition-all shadow-2xs"
              title="ดูโปรไฟล์และสังกัด"
            >
              <div className="w-6 h-6 rounded-lg bg-[#001433] text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                {userName ? userName.charAt(0).toUpperCase() : 'G'}
              </div>
              <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-800 max-w-[100px] truncate">
                {userName || 'รปภ.'}
              </span>
            </button>

            {/* Quick Logout */}
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Expandable Slide-down Search Input */}
        {(showSearch || menuSearchQuery) && (
          <div className="max-w-6xl mx-auto pt-2 pb-0.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={menuSearchQuery}
                onChange={(e) => setMenuSearchQuery(e.target.value)}
                placeholder="พิมพ์ค้นหาเมนู เช่น วิทยุ, ลานจอด, กล้อง, อาคาร..."
                className="w-full bg-white border border-blue-500 text-slate-900 placeholder-slate-400 rounded-xl pl-8 pr-8 py-2 sm:py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
              />
              {menuSearchQuery && (
                <button
                  onClick={() => setMenuSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content Container ── */}
      <main className="max-w-6xl mx-auto px-2.5 sm:px-4 pt-2.5 sm:pt-3 space-y-3">

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: เมนูรายงาน (SPRINGBOARD LAUNCHER) - Visible Immediately
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'menus' && (
          <div className="space-y-2.5">
            
            {/* Category Filter Chips (Ultra-compact ~32px, Smooth Touch Scroll) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-2.5 px-2.5 sm:mx-0 sm:px-0">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex-shrink-0 px-3 py-1.5 sm:py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-xs border border-blue-600'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
              >
                ทั้งหมด ({authorizedMenus.length})
              </button>
              <button
                onClick={() => setSelectedCategory('patrol')}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === 'patrol'
                    ? 'bg-blue-600 text-white shadow-xs border border-blue-600'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>ลาดตระเวน ({authorizedMenus.filter((m) => m.category === 'patrol').length})</span>
              </button>
              <button
                onClick={() => setSelectedCategory('checkpoint')}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === 'checkpoint'
                    ? 'bg-blue-600 text-white shadow-xs border border-blue-600'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>จุดตรวจ (3)</span>
              </button>
              <button
                onClick={() => setSelectedCategory('cctv')}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === 'cctv'
                    ? 'bg-blue-600 text-white shadow-xs border border-blue-600'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>CCTV (4)</span>
              </button>
              <button
                onClick={() => setSelectedCategory('stats')}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === 'stats'
                    ? 'bg-blue-600 text-white shadow-xs border border-blue-600'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>สถิติ (1)</span>
              </button>
              {(isAdmin || canAccessDashboard) && (
                <button
                  onClick={() => setSelectedCategory('system')}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === 'system'
                      ? 'bg-blue-600 text-white shadow-xs border border-blue-600'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-2xs'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>ระบบ / แดชบอร์ด ({authorizedMenus.filter((m) => m.category === 'system').length})</span>
                </button>
              )}
            </div>

            {/* ── View Mode 1: ICON GRID (Universal Springboard for All Screens) ── */}
            {viewMode === 'icon' && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 xs:gap-2.5 sm:gap-3">
                {filteredMenus.map((menu) => {
                  const Icon = menu.icon;
                  const isEmergency = menu.id === 'emergency-incident';
                  const isSop = menu.id === 'sop-dispatch';

                  const handleClick = (e: React.MouseEvent) => {
                    if (isEmergency) {
                      e.preventDefault();
                      setIsReportIncidentOpen(true);
                    } else if (isSop) {
                      e.preventDefault();
                      setIsSopTaskOpen(true);
                    }
                  };

                  return (
                    <Link
                      key={menu.id}
                      href={menu.href}
                      onClick={handleClick}
                      className="group h-full flex flex-col items-center justify-between text-center p-2 xs:p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-slate-50/70 border border-slate-200/90 hover:border-blue-300 shadow-2xs hover:shadow-xs active:scale-[0.96] transition-all duration-150"
                    >
                      {/* Top Section: App Squircle Icon & Aligned Title */}
                      <div className="flex flex-col items-center w-full">
                        {/* Squircle App Icon */}
                        <div className={`relative w-12 h-12 xs:w-[50px] xs:h-[50px] sm:w-[58px] sm:h-[58px] rounded-2xl bg-gradient-to-br ${menu.color} flex items-center justify-center shadow-md ${menu.shadow} group-hover:scale-105 transition-transform duration-150 mb-1.5`}>
                          <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow" strokeWidth={1.75} />
                          {menu.isSupervisor && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white shadow-xs" title="สำหรับหัวหน้า/ผู้ดูแล" />
                          )}
                          {menu.hasAmberDot && activeDispatchCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white shadow-xs animate-pulse" title="มีงานสั่งการที่ได้รับมอบหมาย" />
                          )}
                        </div>

                        {/* App Title: Fixed Height Container for Consistent Baseline across All Cards */}
                        <div className="h-8 xs:h-9 sm:h-9 flex items-center justify-center w-full px-0.5">
                          <h3 className="text-[11px] xs:text-[11.5px] sm:text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
                            {menu.name}
                          </h3>
                        </div>
                      </div>

                      {/* Bottom Section: Frequency Badge */}
                      <div className="w-full pt-1 flex justify-center">
                        <span className="text-[9px] xs:text-[9.5px] sm:text-[10px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-100/80 rounded-md truncate max-w-full">
                          {menu.badge}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* ── View Mode 2: LIST VIEW (Mobile Table Rows) ── */}
            {viewMode === 'list' && (
              <div className="space-y-2">
                {filteredMenus.map((menu) => {
                  const Icon = menu.icon;
                  const isEmergency = menu.id === 'emergency-incident';
                  const isSop = menu.id === 'sop-dispatch';

                  const handleClick = (e: React.MouseEvent) => {
                    if (isEmergency) {
                      e.preventDefault();
                      setIsReportIncidentOpen(true);
                    } else if (isSop) {
                      e.preventDefault();
                      setIsSopTaskOpen(true);
                    }
                  };

                  return (
                    <Link
                      key={menu.id}
                      href={menu.href}
                      onClick={handleClick}
                      className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-slate-50/70 border border-slate-200/90 hover:border-blue-300 shadow-2xs active:scale-[0.99] transition-all group"
                    >
                      {/* Left Icon Avatar */}
                      <div className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${menu.color} flex items-center justify-center flex-shrink-0 shadow-sm ${menu.shadow} group-hover:scale-105 transition-transform`}>
                        <Icon className="w-5 h-5 text-white" strokeWidth={1.75} />
                        {menu.hasAmberDot && activeDispatchCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white shadow-xs animate-pulse" />
                        )}
                      </div>

                      {/* Middle Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                            {menu.name}
                          </h3>
                          {menu.isSupervisor && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                              หัวหน้า
                            </span>
                          )}
                          {menu.hasAmberDot && activeDispatchCount > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 border border-amber-200 animate-pulse flex-shrink-0">
                              มีงานใหม่
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {menu.desc}
                        </p>
                      </div>

                      {/* Right Badge & Chevron */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="hidden xs:inline-block text-[10px] font-medium px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
                          {menu.badge}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {filteredMenus.length === 0 && (
              <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                <Search className="w-8 h-8 mx-auto text-slate-400 mb-1.5" />
                <p className="text-xs font-semibold">ไม่พบเมนูรายงานที่ค้นหา</p>
                <button
                  onClick={() => { setMenuSearchQuery(''); setSelectedCategory('all'); }}
                  className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
                >
                  ล้างตัวกรองและคำค้นหา
                </button>
              </div>
            )}

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: ประวัติรายงาน (INCIDENTS HISTORY)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'incidents' && (
          <div className="space-y-3">
            
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-blue-600" />
                    ประวัติรายงานล่าสุด ({totalRecords})
                  </h2>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1 transition-all shadow-2xs"
                  >
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span>ตัวกรอง</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    disabled={exporting}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{exporting ? '...' : 'CSV'}</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Filter Panel */}
              {showFilterDrawer && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-3 mt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ประเภทรายงาน</label>
                    <select
                      value={filterType}
                      onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    >
                      {REPORT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ผู้รายงาน (ชื่อ/รหัส)</label>
                    <input
                      type="text"
                      list="submitter-pwa-suggestions"
                      value={filterSubmitter}
                      onChange={(e) => handleSubmitterChange(e.target.value)}
                      placeholder="ค้นหาชื่อหรือรหัส..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                    <datalist id="submitter-pwa-suggestions">
                      {suggestions.map((s, i) => (
                        <option key={i} value={s} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ตั้งแต่วันที่</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ถึงวันที่</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4 flex gap-2 pt-1">
                    <button
                      onClick={() => { setPage(1); fetchAllReports(); }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition-all shadow-xs"
                    >
                      กรองข้อมูล
                    </button>
                    <button
                      onClick={handleClearFilters}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-xl text-xs transition-all"
                    >
                      ล้างตัวกรอง
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs">
                {error}
              </div>
            )}

            {/* Incident Cards Feed */}
            {loading ? (
              <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                <span className="text-xs">กำลังโหลดประวัติรายงาน...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                <FileText className="w-8 h-8 mx-auto text-slate-400 mb-1.5" />
                <p className="text-xs font-semibold">ยังไม่มีข้อมูลรายงานในระบบ</p>
                <button
                  onClick={() => setActiveTab('menus')}
                  className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
                >
                  เลือกเมนูรายงานเพื่อส่งแบบฟอร์มแรก
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2 hover:border-slate-300 transition-all"
                  >
                    {/* Header: Type badge & Timestamp */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold ${TYPE_COLOR_MAP[rep.type]?.bg || 'bg-slate-100'} ${TYPE_COLOR_MAP[rep.type]?.text || 'text-slate-700'}`}>
                        {(() => {
                          const IconComp = TYPE_COLOR_MAP[rep.type]?.icon || FileText;
                          return <IconComp className="w-3.5 h-3.5" />;
                        })()}
                        <span>{rep.label}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDateTime(rep.time)}
                      </span>
                    </div>

                    {/* Body: Details */}
                    <div className="text-xs text-slate-700 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {rep.details}
                    </div>

                    {/* Footer: Submitter & Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5 truncate">
                        <UserCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{rep.submitted_by}</span>
                        {rep.updatedBy && (
                          <span className="text-[10px] text-amber-600 flex-shrink-0">(แก้: {rep.updatedBy})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleViewReport(rep)}
                          className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-all flex items-center gap-1 shadow-2xs"
                          title="ดูข้อมูล"
                        >
                          <Eye className="w-3 h-3" />
                          <span>ดู</span>
                        </button>
                        {(isAdmin || isSupervisor || rep.submitted_by === userName || (userEmployeeId && rep.employeeId === userEmployeeId)) && (
                          <button
                            onClick={() => handleEditReport(rep)}
                            className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold transition-all flex items-center gap-1 shadow-2xs"
                            title="แก้ไข"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>แก้</span>
                          </button>
                        )}
                        {(isAdmin || isSupervisor) && (
                          <button
                            onClick={() => handleDelete(rep.deleteType, rep.deleteId)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && totalRecords > 0 && (
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <label className="text-xs text-slate-600 flex items-center gap-1.5">
                  แถว/หน้า
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2 py-1 text-xs outline-none"
                  >
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <Pagination page={page} totalItems={totalRecords} pageSize={pageSize} onPageChange={setPage} />
              </div>
            )}

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: สรุป & สถิติ (STATS OVERVIEW)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'stats' && (
          <div className="space-y-3">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">รายงานวันนี้</span>
                <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">{todayCount}</div>
                <span className="text-[10px] text-slate-400">รายการในผลัดนี้</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">รายงานทั้งหมด</span>
                <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">{totalRecords}</div>
                <span className="text-[10px] text-slate-400">รายการสะสมในระบบ</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ระบบฟอร์ม</span>
                <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">{REPORT_MENUS.length}</div>
                <span className="text-[10px] text-slate-400">แบบตรวจความปลอดภัย</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-teal-600" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">สถานะระบบ</span>
                <div className="text-sm font-bold text-emerald-700 mt-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  พร้อมใช้งาน 100%
                </div>
                <span className="text-[10px] text-slate-400">Live SOC Connected</span>
              </div>
            </div>

            {/* Direct Link to Full Visual Report */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  แดชบอร์ดสรุปผลเชิงลึก (Visual Report)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ดูกราฟสถิติรายสัปดาห์/เดือน สัดส่วนเหตุการณ์ตามพื้นที่ และแนวโน้มความปลอดภัย
                </p>
              </div>

              <Link
                href="/visual-report"
                className="w-full sm:w-auto text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <span>เปิดกราฟสถิติฉบับเต็ม</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 4: โปรไฟล์ รปภ. (OFFICER PROFILE & SETTINGS)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto space-y-3">
            
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 text-center shadow-2xs">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 mx-auto flex items-center justify-center text-white text-2xl font-black shadow-md mb-2.5">
                {userName ? userName.charAt(0).toUpperCase() : 'G'}
              </div>

              <h2 className="text-base font-black text-slate-900">{userName || 'เจ้าหน้าที่รักษาความปลอดภัย'}</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">รหัส: {userEmployeeId || '-'}</p>

              <div className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                {userRoleBadge}
              </div>

              {/* Assigned Site Status Card (Locked for Security Staff) */}
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">พื้นที่ปฏิบัติการ (Assigned Plant)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                    ประจำการตามสังกัด
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1.5 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span>{currentSite?.name} ({currentSite?.code})</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  * เจ้าหน้าที่รักษาความปลอดภัยและหัวหน้า รปภ. ประจำการตามสาขาที่ได้รับมอบหมาย
                </p>
              </div>

              {/* App Mode Status */}
              <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-left flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">โหมดการเปิดใช้งาน</span>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    {isStandalone ? 'PWA ติดตั้งแล้ว (Standalone)' : 'เบราว์เซอร์ (Browser)'}
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Ready
                </span>
              </div>

              {/* Install PWA Prompt inside profile */}
              {installPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="w-full mt-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <Smartphone className="w-4 h-4" />
                  ติดตั้งแอปบนหน้าจอมือถือ (Install PWA)
                </button>
              )}

              {/* Dashboard Direct Shortcut inside Profile for Admins/Executives */}
              {canAccessDashboard && (
                <Link
                  href="/"
                  className="w-full mt-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-xs flex items-center justify-between active:scale-95 transition-all"
                  title="เข้าสู่หน้าจอแดชบอร์ดหลัก SOC"
                >
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-blue-100" />
                    <span>ออกไปสู่แดชบอร์ดหลัก (SOC Dashboard)</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/80" />
                </Link>
              )}

              {/* Admin Tools & Plant Switcher */}
              {isAdmin && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-left space-y-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-1.5">
                      <Wrench className="w-3.5 h-3.5 text-slate-500" />
                      <span>จัดการระบบ (System Administration)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Link
                        href="/admin/settings"
                        className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-900 text-xs font-bold flex items-center justify-between transition-colors shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-blue-700" />
                          <span>ตั้งค่าระบบ & นำเข้า DB</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                      </Link>
                      <Link
                        href="/admin/users"
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center justify-between transition-colors shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-4 h-4 text-slate-600" />
                          <span>จัดการผู้ใช้งาน</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      <span>สลับพื้นที่ปฏิบัติการ (สำหรับผู้ดูแลระบบเท่านั้น)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {sites.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => switchSite(s.id)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                            currentSite?.id === s.id
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          {s.name} ({s.code})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full mt-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                ออกจากระบบ (Logout)
              </button>

            </div>

          </div>
        )}

      </main>

      {/* ── 3. Fixed Mobile Bottom Navigation Bar (Thumb Friendly, iOS Safe-Area Aware) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))] shadow-lg">
        <div className={`max-w-md mx-auto grid ${canAccessDashboard ? 'grid-cols-5' : 'grid-cols-4'} gap-1`}>
          
          {/* Dashboard Shortcut for Admin/Executives */}
          {canAccessDashboard && (
            <Link
              href="/"
              className="flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 text-blue-700 hover:text-blue-900 group"
              title="ไปที่หน้าจอหลัก SOC Dashboard"
            >
              <div className="p-1 rounded-lg bg-blue-50 group-hover:bg-blue-100 text-blue-600 transition-colors">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 font-bold">แดชบอร์ด</span>
            </Link>
          )}

          <button
            onClick={() => setActiveTab('menus')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'menus'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'menus' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <LayoutGrid className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">เมนูหลัก</span>
          </button>

          <button
            onClick={() => setActiveTab('incidents')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 relative ${
              activeTab === 'incidents'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'incidents' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <ClipboardList className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">ประวัติ</span>
            {totalRecords > 0 && (
              <span className="absolute top-0.5 right-4 bg-blue-600 text-white text-[9px] font-bold px-1 rounded-full leading-tight">
                {totalRecords > 99 ? '99+' : totalRecords}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'stats'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'stats' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">สถิติ</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'profile'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'profile' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <UserCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">โปรไฟล์</span>
          </button>

        </div>
      </nav>

      {/* Report View & Edit Modal */}
      <ReportDetailModal
        isOpen={modalOpen}
        mode={modalMode}
        report={selectedReport}
        onClose={() => { setModalOpen(false); setSelectedReport(null); }}
        onSaved={() => fetchAllReports()}
        onDeleted={() => fetchAllReports()}
        userName={userName}
        userEmployeeId={userEmployeeId}
        isAdmin={isAdmin || isSupervisor}
      />

      {/* Real-time Notification Banner / Toast */}
      <NotificationBanner
        notification={activeNotification}
        onOpenTask={(id) => {
          setSelectedTaskId(id);
          setIsSopTaskOpen(true);
        }}
        onDismiss={() => setActiveNotification(null)}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onOpenTask={(id) => {
          setSelectedTaskId(id);
          setIsSopTaskOpen(true);
        }}
        onMarkAllRead={() => {
          IncidentService.markAllNotificationsAsRead();
          setUnreadNotifCount(0);
        }}
      />

      {/* Emergency Incident Report Modal */}
      <ReportIncidentModal
        isOpen={isReportIncidentOpen}
        onClose={() => setIsReportIncidentOpen(false)}
        siteCode={currentSite?.code || 'BPI'}
        siteName={currentSite?.name || 'บางปะอิน'}
        userName={userName}
        userEmployeeId={userEmployeeId}
        onSubmitted={() => fetchAllReports()}
      />

      {/* SOP & Command Dispatch Execution Modal */}
      <SopTaskModal
        isOpen={isSopTaskOpen}
        onClose={() => {
          setIsSopTaskOpen(false);
          setSelectedTaskId(null);
        }}
        userName={userName}
        userEmployeeId={userEmployeeId}
        defaultIncidentId={selectedTaskId}
      />

    </div>
  );
}
