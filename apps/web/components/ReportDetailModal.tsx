'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, Pencil, Trash2, Save, CheckCircle, AlertTriangle, Building2, Car, Camera, Radio, ClipboardList, UserCheck, BarChart3, HardHat } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const BUILDING_CONFIG: Record<string, { title: string; posts: string[] }> = {
  '2': { title: 'Building 2', posts: ['A2', 'A3', 'Traffic', 'D1', 'D3', 'D7', 'Patrol 1', 'Patrol 2', 'Machine', 'Support', 'Other'] },
  '3': { title: 'Building 3', posts: ['Gate 2', 'RCSC', 'FA LAB', 'EXIT INSPECTION (ทางออก)', 'Other'] },
  '4': { title: 'Building 4', posts: ['Gate 1', 'Gate 5', 'Gate 6', 'Worker', 'Scan Receiving', 'Receiving', 'Traffic Receiving', 'Transfer room', 'Scan Link way', 'Park 3', 'Customs Park 2', 'Patrol 1', 'Patrol 2', 'Support', 'Other'] },
  '6': { title: 'Building 6', posts: ['6/1', '6/2', 'Rel.Lab B2L3', 'Patrol', 'Other'] },
  '9': { title: 'Building 9', posts: ['B9', 'Other'] },
};

const TYPE_ICONS: Record<string, typeof Building2> = {
  general: Building2,
  car_parking: Car,
  cctv_inspection: Camera,
  hand_held: Radio,
  patrol: ClipboardList,
  guard_count: UserCheck,
  cctv_report: BarChart3,
  cctv_angle: Camera,
  metal_detector: HardHat,
};

const TYPE_LABELS: Record<string, string> = {
  general: 'รายงานทั่วไป',
  car_parking: 'ตรวจลานจอดรถ',
  cctv_inspection: 'ตรวจห้อง CCTV',
  hand_held: 'ตรวจ Hand Held',
  patrol: 'Checklist Patrol',
  guard_count: 'บันทึกจำนวน รปภ.',
  cctv_report: 'NVR Recording',
  cctv_angle: 'CCTV Angle Check',
  metal_detector: 'ตรวจ Metal Detector',
};

interface ReportData {
  id: number;
  type: string;
  label: string;
  building?: string;
  [key: string]: any;
}

interface ReportDetailModalProps {
  isOpen: boolean;
  mode: 'view' | 'edit';
  report: ReportData | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  userName: string;
  userEmployeeId?: string;
  isAdmin: boolean;
}

export default function ReportDetailModal({
  isOpen,
  mode: initialMode,
  report,
  onClose,
  onSaved,
  onDeleted,
  userName,
  userEmployeeId,
  isAdmin,
}: ReportDetailModalProps) {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (report && isOpen) {
      const d: Record<string, any> = {};
      const r = report as any;

      switch (report.type) {
        case 'general':
          d.report_date = r.report_date || r.reportDate || '';
          d.employee_id = r.employee_id || r.employeeId || '';
          d.full_name = r.full_name || r.fullName || '';
          d.shift = r.shift || '';
          d.building = r.building || '';
          d.guard_post = r.guard_post || r.guardPost || '';
          d.report_time = r.report_time || r.reportTime || '';
          d.incident_report = r.incident_report || r.incidentReport || '';
          d.special_incident = r.special_incident || r.specialIncident || '';
          d.emergency_incident = r.emergency_incident || r.emergencyIncident || '';
          break;

        case 'car_parking':
          d.inspection_date = r.inspection_date || r.inspectionDate || r.recordDate || '';
          d.inspector_code = r.inspector_code || r.inspectorCode || '';
          d.inspector_name = r.inspector_name || r.inspectorName || r.driverName || '';
          d.shift = r.shift || '';
          d.parking_lot = r.parking_lot || r.parkingLot || r.slotNo || '';
          d.total_cars = r.total_cars ?? r.totalCars ?? 0;
          d.spare_tire_status = r.spare_tire_status || r.spareTireStatus || '';
          d.license_plates = r.license_plates || r.licensePlates || r.carLicense || '';
          d.motorcycle_parking_lot = r.motorcycle_parking_lot || r.motorcycleParkingLot || '';
          d.motorcycle_count_1 = r.motorcycle_count_1 ?? r.motorcycleCount1 ?? 0;
          d.motorcycle_count_2 = r.motorcycle_count_2 ?? r.motorcycleCount2 ?? 0;
          d.motorcycle_count_3 = r.motorcycle_count_3 ?? r.motorcycleCount3 ?? 0;
          d.lot_counts = r.lot_counts || r.lotCounts || null;
          break;

        case 'cctv_inspection':
          d.inspection_date = r.inspection_date || r.inspectionDate || '';
          d.inspector_name = r.inspector_name || r.inspectorName || '';
          d.total_checked = r.total_checked ?? r.totalChecked ?? 0;
          d.total_passed = r.total_passed ?? r.totalPassed ?? 0;
          d.total_failed = r.total_failed ?? r.totalFailed ?? 0;
          d.summary = r.summary || '';
          break;

        case 'hand_held':
          d.inspection_date = r.inspection_date || r.inspectionDate || '';
          d.building = r.building || '';
          d.guard_post = r.guard_post || r.guardPost || '';
          d.inspector_code = r.inspector_code || r.inspectorCode || '';
          d.inspector_name = r.inspector_name || r.inspectorName || '';
          d.shift = r.shift || '';
          d.battery_status = r.battery_status || r.batteryStatus || '';
          d.led_status = r.led_status || r.ledStatus || '';
          d.detection_test_status = r.detection_test_status || r.detectionTestStatus || '';
          d.alarm_status = r.alarm_status || r.alarmStatus || '';
          d.remarks = r.remarks || '';
          break;

        case 'patrol':
          d.patrol_date = r.patrol_date || r.patrolDate || '';
          d.patrol_route = r.patrol_route || r.patrolRoute || '';
          d.officer_name = r.officer_name || r.officerName || r.inspector_name || '';
          d.status = r.status || '';
          d.notes = r.notes || '';
          break;

        case 'guard_count':
          d.record_date = r.record_date || r.recordDate || '';
          d.shift = r.shift || '';
          d.total_guards = r.total_guards ?? r.totalGuards ?? r.total ?? 0;
          d.present_guards = r.present_guards ?? r.presentGuards ?? 0;
          d.absent_guards = r.absent_guards ?? r.absentGuards ?? 0;
          d.remark = r.remark || '';
          break;

      case 'cctv_report':
        d.report_date = r.report_date || r.reportDate || '';
        d.total_normal = r.total_normal ?? r.totalNormal ?? 0;
        d.total_abnormal = r.total_abnormal ?? r.totalAbnormal ?? 0;
        d.reporter_name = r.reporter_name || r.reporterName || '';
        d.remark = r.remark || '';
        d.details = r.details || [];
        break;

        case 'cctv_angle':
          d.report_date = r.report_date || r.reportDate || '';
          d.building = r.building || '';
          d.nvr = r.nvr ?? 0;
          d.total_cameras = r.total_cameras ?? r.totalCameras ?? 0;
          d.correct_cameras = r.correct_cameras ?? r.correctCameras ?? 0;
          d.incorrect_cameras = r.incorrect_cameras ?? r.incorrectCameras ?? 0;
          d.checked_by = r.checked_by || r.checkedBy || '';
          break;

        case 'metal_detector':
          const ml = r.legacy || {};
          d.inspection_date = r.inspection_date || r.inspectionDate || ml.inspectionDate || r.checkDate || '';
          d.shift = r.shift || ml.shift || '';
          d.employee_id = r.employee_id || r.employeeId || ml.employeeId || '';
          d.employee_name = r.employee_name || r.employeeName || ml.employeeName || '';
          d.building = r.building || ml.building || '';
          d.guard_post = r.guard_post || r.guardPost || ml.guardPost || '';
          d.scanner_brand = r.scanner_brand || r.scannerBrand || ml.scannerBrand || '';
          d.zone1_status = r.zone1_status || r.zone1Status || ml.zone1Status || '';
          d.zone2_status = r.zone2_status || r.zone2Status || ml.zone2Status || '';
          d.zone3_status = r.zone3_status || r.zone3Status || ml.zone3Status || '';
          d.zone4_status = r.zone4_status || r.zone4Status || ml.zone4Status || '';
          d.zone5_status = r.zone5_status || r.zone5Status || ml.zone5Status || '';
          d.zone6_status = r.zone6_status || r.zone6Status || ml.zone6Status || '';
          break;
      }

      setFormData(d);
      setError('');
      setSuccess('');
    }
  }, [report, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen || !report) return null;

  const TypeIcon = TYPE_ICONS[report.type] || Building2;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const r = report as any;
      let endpoint = '';
      let body: any = {};

      switch (report.type) {
        case 'general':
          endpoint = `/api/reports/building-reports/${report.id}`;
          body = {
            reportDate: formData.report_date,
            employeeId: formData.employee_id,
            fullName: formData.full_name,
            shift: formData.shift,
            guardPost: formData.guard_post,
            reportTime: formData.report_time,
            incidentReport: formData.incident_report,
            specialIncident: formData.special_incident || undefined,
            emergencyIncident: formData.emergency_incident || undefined,
          };
          break;

        case 'car_parking':
          endpoint = `/api/parking/${report.id}`;
          body = {
            recordDate: formData.inspection_date,
            inspectorCode: formData.inspector_code,
            inspectorName: formData.inspector_name,
            shift: formData.shift,
            parkingLot: formData.parking_lot,
            totalCars: parseInt(formData.total_cars) || 0,
            spareTireStatus: formData.spare_tire_status || undefined,
            licensePlates: formData.license_plates || undefined,
            motorcycleParkingLot: formData.motorcycle_parking_lot || undefined,
            motorcycleCount1: parseInt(formData.motorcycle_count_1) || 0,
            motorcycleCount2: parseInt(formData.motorcycle_count_2) || 0,
            motorcycleCount3: parseInt(formData.motorcycle_count_3) || 0,
          };
          break;

        case 'cctv_inspection':
          endpoint = `/api/cctv/inspections/${report.id}`;
          body = {
            inspectionDate: formData.inspection_date,
            inspectorName: formData.inspector_name,
            totalChecked: parseInt(formData.total_checked) || 0,
            totalPassed: parseInt(formData.total_passed) || 0,
            totalFailed: parseInt(formData.total_failed) || 0,
            summary: formData.summary || undefined,
          };
          break;

        case 'patrol':
          endpoint = `/api/patrol/${report.id}`;
          body = {
            patrolDate: formData.patrol_date,
            patrolRoute: formData.patrol_route,
            officerName: formData.officer_name,
            status: formData.status,
            notes: formData.notes || undefined,
          };
          break;

        case 'guard_count':
          endpoint = `/api/guards/counts/${report.id}`;
          body = {
            recordDate: formData.record_date,
            shift: formData.shift,
            totalGuards: parseInt(formData.total_guards) || 0,
            presentGuards: parseInt(formData.present_guards) || 0,
            absentGuards: parseInt(formData.absent_guards) || 0,
            remark: formData.remark || undefined,
          };
          break;

        case 'cctv_report':
          endpoint = `/api/cctv/reports/${report.id}`;
          body = {
            reportDate: formData.report_date,
            reporterName: formData.reporter_name,
            totalNormal: parseInt(formData.total_normal) || 0,
            totalAbnormal: parseInt(formData.total_abnormal) || 0,
            remark: formData.remark || undefined,
          };
          break;

        case 'hand_held':
          endpoint = `/api/metal-detector/handheld-checks/${report.id}`;
          body = {
            inspectionDate: formData.inspection_date,
            building: formData.building,
            guardPost: formData.guard_post,
            inspectorCode: formData.inspector_code,
            inspectorName: formData.inspector_name,
            shift: formData.shift,
            batteryStatus: formData.battery_status,
            ledStatus: formData.led_status,
            detectionTestStatus: formData.detection_test_status,
            alarmStatus: formData.alarm_status,
            remarks: formData.remarks || undefined,
          };
          break;

        case 'metal_detector':
          endpoint = `/api/metal-detector/walkthrough-checks/${report.id}`;
          body = {
            checkDate: formData.inspection_date,
            building: formData.building,
            guardPost: formData.guard_post,
            employeeId: formData.employee_id,
            employeeName: formData.employee_name,
            shift: formData.shift,
            scannerBrand: formData.scanner_brand,
            zone1Status: formData.zone1_status,
            zone2Status: formData.zone2_status,
            zone3Status: formData.zone3_status,
            zone4Status: formData.zone4_status,
            zone5Status: formData.zone5_status,
            zone6Status: formData.zone6_status,
          };
          break;

        case 'walkthrough':
          endpoint = `/api/metal-detector/walkthrough-checks/${report.id}`;
          body = {
            checkDate: formData.inspection_date,
            building: formData.building,
            guardPost: formData.guard_post,
            employeeId: formData.employee_id,
            employeeName: formData.employee_name,
            shift: formData.shift,
            scannerBrand: formData.scanner_brand,
            zone1Status: formData.zone1_status,
            zone2Status: formData.zone2_status,
            zone3Status: formData.zone3_status,
            zone4Status: formData.zone4_status,
            zone5Status: formData.zone5_status,
            zone6Status: formData.zone6_status,
          };
          break;

        case 'cctv_angle':
          endpoint = `/api/cctv/camera-checks/${report.id}`;
          body = {
            reportDate: formData.report_date,
            building: formData.building,
            nvr: parseInt(formData.nvr) || 0,
            totalCameras: parseInt(formData.total_cameras) || 0,
            correctCameras: parseInt(formData.correct_cameras) || 0,
            incorrectCameras: parseInt(formData.incorrect_cameras) || 0,
            checkedBy: formData.checked_by,
          };
          break;

        default:
          throw new Error('ไม่รองรับการแก้ไขรายงานประเภทนี้');
      }

      if (!endpoint) {
        throw new Error('ไม่รองรับการแก้ไขรายงานประเภทนี้ในขณะนี้');
      }

      await apiFetch(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      setSuccess('บันทึกเรียบร้อยแล้ว');
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายงานนี้?')) return;
    setLoading(true);
    setError('');
    try {
      let deleteEndpoint = '';
      switch (report.type) {
        case 'general':
          deleteEndpoint = `/api/reports/building-reports/${report.id}`;
          break;
        case 'car_parking':
          deleteEndpoint = `/api/parking/${report.id}`;
          break;
        case 'cctv_inspection':
          deleteEndpoint = `/api/cctv/inspections/${report.id}`;
          break;
        case 'patrol':
          deleteEndpoint = `/api/patrol/${report.id}`;
          break;
        case 'guard_count':
          deleteEndpoint = `/api/guards/counts/${report.id}`;
          break;
        case 'cctv_report':
          deleteEndpoint = `/api/cctv/reports/${report.id}`;
          break;
        case 'hand_held':
          deleteEndpoint = `/api/metal-detector/handheld-checks/${report.id}`;
          break;
        case 'metal_detector':
          deleteEndpoint = `/api/metal-detector/walkthrough-checks/${report.id}`;
          break;
        case 'walkthrough':
          deleteEndpoint = `/api/metal-detector/walkthrough-checks/${report.id}`;
          break;
        case 'cctv_angle':
          deleteEndpoint = `/api/cctv/camera-checks/${report.id}`;
          break;
        default:
          throw new Error('ไม่รองรับการลบรายงานประเภทนี้');
      }
      await apiFetch(deleteEndpoint, { method: 'DELETE' });
      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'ลบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const rpt = report as any;
  const reportEmployeeId = rpt.employee_id || rpt.employeeId || rpt.inspector_code || rpt.inspectorCode || '';
  const canEdit = isAdmin || report.fullName === userName || report.submitted_by === userName || (report as any).officerName === userName || (report as any).inspectorName === userName || (userEmployeeId !== undefined && userEmployeeId !== '' && reportEmployeeId !== '' && reportEmployeeId === userEmployeeId);
  const canDelete = isAdmin;
  const buildingConfig = report.building ? BUILDING_CONFIG[report.building] : null;

  const renderViewField = (label: string, value: any) => (
    <div>
      <label className="block text-[10px] sm:text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl break-words">{value || '-'}</p>
    </div>
  );

  const renderTextField = (name: string, label: string, placeholder?: string) => (
    <div>
      <label className="block text-[10px] sm:text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {mode === 'edit' ? (
        <input type="text" name={name} value={formData[name] || ''} onChange={handleChange} placeholder={placeholder}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-500 bg-white" />
      ) : (
        <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl break-words">{formData[name] || '-'}</p>
      )}
    </div>
  );

  const renderNumberField = (name: string, label: string, min?: number) => (
    <div>
      <label className="block text-[10px] sm:text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {mode === 'edit' ? (
        <input type="number" name={name} value={formData[name] ?? 0} onChange={handleChange} min={min ?? 0}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-500 bg-white" />
      ) : (
        <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl">{formData[name] ?? '-'}</p>
      )}
    </div>
  );

  const renderDateField = (name: string, label: string) => (
    <div>
      <label className="block text-[10px] sm:text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {mode === 'edit' ? (
        <input type="date" name={name} value={formData[name] || ''} onChange={handleChange}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-500 bg-white" />
      ) : (
        <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl">{formData[name] || '-'}</p>
      )}
    </div>
  );

  const renderTimeField = (name: string, label: string) => (
    <div>
      <label className="block text-[10px] sm:text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {mode === 'edit' ? (
        <input type="time" name={name} value={formData[name] || ''} onChange={handleChange}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-500 bg-white" />
      ) : (
        <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl">{formData[name] || '-'}</p>
      )}
    </div>
  );

  const renderTextareaField = (name: string, label: string, rows?: number) => (
    <div>
      <label className="block text-[10px] sm:text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {mode === 'edit' ? (
        <textarea name={name} rows={rows || 3} value={formData[name] || ''} onChange={handleChange}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-500 bg-white resize-y" />
      ) : (
        <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl whitespace-pre-wrap break-words">{formData[name] || '-'}</p>
      )}
    </div>
  );

  const renderSelectField = (name: string, label: string, options: { value: string; label: string }[]) => (
    <div>
      <label className="block text-[10px] sm:text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {mode === 'edit' ? (
        <select name={name} value={formData[name] || ''} onChange={handleChange}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-500 bg-white">
          <option value="">-- เลือก --</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl">
          {options.find(o => o.value === formData[name])?.label || formData[name] || '-'}
        </p>
      )}
    </div>
  );

  const renderShiftToggle = (name: string, label: string, options: { value: string; label: string; color: string }[]) => (
    <div>
      <label className="block text-[10px] sm:text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {mode === 'edit' ? (
        <div className="flex gap-2">
          {options.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setFormData({ ...formData, [name]: opt.value })}
              className={`flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${formData[name] === opt.value ? opt.color : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl">{formData[name] || '-'}</p>
      )}
    </div>
  );

  const renderFormContent = () => {
    const r = report as any;
    switch (report.type) {
      case 'general':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {renderDateField('report_date', 'วันที่รายงาน')}
              {renderTextField('employee_id', 'รหัสพนักงาน')}
              {renderTextField('full_name', 'ชื่อ-นามสกุล')}
              {renderSelectField('shift', 'กะ', [
                { value: 'เช้า', label: 'เช้า' },
                { value: 'ดึก', label: 'ดึก' },
              ])}
              {renderTextField('building', 'อาคาร')}
              {renderTextField('guard_post', 'จุดรักษาการณ์')}
              {renderTimeField('report_time', 'เวลารายงาน')}
            </div>
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              {renderTextareaField('incident_report', 'รายงานเหตุการณ์', 4)}
            </div>
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              {renderTextareaField('special_incident', 'กรณีเหตุการณ์พิเศษ')}
            </div>
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              {renderTextareaField('emergency_incident', 'กรณีเหตุฉุกเฉิน')}
            </div>
          </div>
        );

      case 'car_parking':
        const lotCounts = formData.lot_counts;
        const carLots = lotCounts ? Object.entries(lotCounts).filter(([, v]: any) => v.vehicleType === 'car') : [];
        const motoLots = lotCounts ? Object.entries(lotCounts).filter(([, v]: any) => v.vehicleType === 'moto') : [];
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {renderDateField('inspection_date', 'วันที่ตรวจ')}
              {renderTextField('inspector_code', 'รหัสผู้ตรวจ')}
              {renderTextField('inspector_name', 'ชื่อผู้ตรวจ')}
              {renderSelectField('shift', 'กะ', [
                { value: 'เช้า', label: 'เช้า' },
                { value: 'บ่าย', label: 'บ่าย' },
                { value: 'ดึก', label: 'ดึก' },
              ])}
              {renderTextField('parking_lot', 'ลานจอดรถ')}
              {renderNumberField('total_cars', 'จำนวนรถทั้งหมด')}
            </div>
            {carLots.length > 0 && (
              <div className="border-t border-slate-200 pt-3 sm:pt-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">จำนวนรถแต่ละลาน</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {carLots.map(([lot, info]: any) => (
                    <div key={lot} className="bg-blue-50 rounded-lg p-2 text-center">
                      <div className="text-[10px] sm:text-xs text-blue-700 font-medium truncate" title={lot}>{lot}</div>
                      <div className="text-sm sm:text-base font-bold text-blue-900">{info.vehicleCount || 0} คัน</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              {renderTextField('spare_tire_status', 'สถานะยางอะไหล่')}
              {renderTextareaField('license_plates', 'หมายเลขทะเบียน')}
            </div>
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              <p className="text-xs font-semibold text-slate-500 mb-3">จอดรถมอเตอร์ไซค์</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {renderTextField('motorcycle_parking_lot', 'ลานจอดมอเตอร์ไซค์')}
                {renderNumberField('motorcycle_count_1', 'มอเตอร์ไซค์ 1')}
                {renderNumberField('motorcycle_count_2', 'มอเตอร์ไซค์ 2')}
                {renderNumberField('motorcycle_count_3', 'มอเตอร์ไซค์ 3')}
              </div>
              {motoLots.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2">จำนวนมอเตอร์ไซค์แต่ละลาน</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {motoLots.map(([lot, info]: any) => (
                      <div key={lot} className="bg-amber-50 rounded-lg p-2 text-center">
                        <div className="text-[10px] sm:text-xs text-amber-700 font-medium truncate" title={lot}>{lot}</div>
                        <div className="text-sm sm:text-base font-bold text-amber-900">{info.vehicleCount || 0} คัน</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'cctv_inspection':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {renderDateField('inspection_date', 'วันที่ตรวจสอบ')}
              {renderTextField('inspector_name', 'ชื่อผู้ตรวจสอบ')}
            </div>
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              <p className="text-xs font-semibold text-slate-500 mb-3">ผลการตรวจสอบ</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {renderNumberField('total_checked', 'ตรวจสอบทั้งหมด')}
                {renderNumberField('total_passed', 'ผ่าน')}
                {renderNumberField('total_failed', 'ไม่ผ่าน')}
              </div>
            </div>
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              {renderTextareaField('summary', 'สรุปผล')}
            </div>
          </div>
        );

      case 'hand_held':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {renderDateField('inspection_date', 'วันที่ตรวจ')}
              {renderTextField('inspector_code', 'รหัสผู้ตรวจ')}
              {renderTextField('inspector_name', 'ผู้ตรวจ')}
              {renderTextField('building', 'อาคาร')}
              {renderTextField('guard_post', 'จุดรักษาการณ์')}
              {renderSelectField('shift', 'กะ', [
                { value: 'เช้า', label: 'เช้า' },
                { value: 'บ่าย', label: 'บ่าย' },
                { value: 'ดึก', label: 'ดึก' },
              ])}
            </div>
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              <p className="text-xs font-semibold text-slate-500 mb-3">สถานะอุปกรณ์</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {renderSelectField('battery_status', 'สถานะแบตเตอรี่', [
                  { value: 'ปกติ', label: 'ปกติ' },
                  { value: 'ไม่ปกติ', label: 'ไม่ปกติ' },
                  { value: 'ครบถ้วน', label: 'ครบถ้วน' },
                ])}
                {renderSelectField('led_status', 'สถานะ LED', [
                  { value: 'ปกติ', label: 'ปกติ' },
                  { value: 'ไม่ปกติ', label: 'ไม่ปกติ' },
                  { value: 'ครบถ้วน', label: 'ครบถ้วน' },
                ])}
                {renderSelectField('detection_test_status', 'ผลทดสอบการตรวจจับ', [
                  { value: 'ปกติ', label: 'ปกติ' },
                  { value: 'ไม่ปกติ', label: 'ไม่ปกติ' },
                  { value: 'ครบถ้วน', label: 'ครบถ้วน' },
                ])}
                {renderSelectField('alarm_status', 'สถานะสัญญาณเตือน', [
                  { value: 'ปกติ', label: 'ปกติ' },
                  { value: 'ไม่ปกติ', label: 'ไม่ปกติ' },
                  { value: 'ครบถ้วน', label: 'ครบถ้วน' },
                ])}
              </div>
            </div>
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              {renderTextareaField('remarks', 'หมายเหตุ')}
            </div>
          </div>
        );

      case 'patrol':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {renderDateField('patrol_date', 'วันที่ลาดตระเวน')}
              {renderTextField('patrol_route', 'เส้นทางลาดตระเวน')}
              {renderTextField('officer_name', 'ชื่อเจ้าหน้าที่')}
              {renderSelectField('status', 'สถานะ', [
                { value: 'completed', label: 'เสร็จสิ้น' },
                { value: 'pending', label: 'รอดำเนินการ' },
                { value: 'in_progress', label: 'กำลังดำเนินการ' },
              ])}
            </div>
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              {renderTextareaField('notes', 'บันทึกเพิ่มเติม')}
            </div>
          </div>
        );

      case 'guard_count':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {renderDateField('record_date', 'วันที่บันทึก')}
              {renderSelectField('shift', 'ช่วงเวลา', [
                { value: 'morning', label: 'เช้า (Morning)' },
                { value: 'evening', label: 'เย็น (Evening)' },
                { value: 'night', label: 'ดึก (Night)' },
              ])}
            </div>
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              <p className="text-xs font-semibold text-slate-500 mb-3">จำนวนเจ้าหน้าที่</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {renderNumberField('total_guards', 'รวมทั้งหมด')}
                {renderNumberField('present_guards', 'มาปฏิบัติหน้าที่')}
                {renderNumberField('absent_guards', 'ไม่มา')}
              </div>
            </div>
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              {renderTextareaField('remark', 'หมายเหตุ')}
            </div>
          </div>
        );

      case 'cctv_report':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {renderDateField('report_date', 'วันที่รายงาน')}
              {renderTextField('reporter_name', 'ชื่อผู้รายงาน')}
            </div>
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              <p className="text-xs font-semibold text-slate-500 mb-3">สถิติช่องสัญญาณ</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {renderNumberField('total_normal', 'ออนไลน์ (Normal)')}
                {renderNumberField('total_abnormal', 'ออฟไลน์ (Abnormal)')}
              </div>
            </div>
            {formData.details && Array.isArray(formData.details) && formData.details.length > 0 && (
              <div className="border-t border-slate-200 pt-3 sm:pt-4">
                <p className="text-xs font-semibold text-slate-500 mb-3">รายละเอียด NVR</p>
                <div className="space-y-2">
                  {formData.details.map((d: any, i: number) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-3 text-xs sm:text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-700">{d.nvrName || `NVR ${i + 1}`}</span>
                        <span className="text-slate-500">{d.onlineChannels || 0}/{d.totalChannels || 0} ช่อง</span>
                      </div>
                      {d.channelStatusesJson && (
                        <p className="text-[10px] sm:text-xs text-slate-500 break-words">{d.channelStatusesJson}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              {renderTextareaField('remark', 'หมายเหตุ')}
            </div>
          </div>
        );

      case 'cctv_angle':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {renderDateField('report_date', 'วันที่ตรวจสอบ')}
              {renderTextField('checked_by', 'ผู้ตรวจสอบ')}
              {renderTextField('building', 'อาคาร')}
              {renderNumberField('nvr', 'หมายเลข NVR')}
            </div>
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              <p className="text-xs font-semibold text-slate-500 mb-3">ผลการตรวจสอบกล้อง</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {renderNumberField('total_cameras', 'กล้องทั้งหมด')}
                {renderNumberField('correct_cameras', 'ถูกต้อง')}
                {renderNumberField('incorrect_cameras', 'ไม่ถูกต้อง')}
              </div>
            </div>
          </div>
        );

      case 'metal_detector':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {renderDateField('inspection_date', 'วันที่ตรวจ')}
              {renderTextField('employee_id', 'รหัสเจ้าหน้าที่')}
              {renderTextField('employee_name', 'ชื่อเจ้าหน้าที่')}
              {renderSelectField('shift', 'กะ', [
                { value: 'เช้า', label: 'เช้า' },
                { value: 'บ่าย', label: 'บ่าย' },
                { value: 'ดึก', label: 'ดึก' },
              ])}
              {renderTextField('building', 'อาคาร')}
              {renderTextField('guard_post', 'จุดรักษาการณ์')}
              {renderTextField('scanner_brand', 'ยี่ห้อเครื่องตรวจ')}
            </div>
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              <p className="text-xs font-semibold text-slate-500 mb-3">สถานะ Zone ตรวจสอบ</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {renderTextField('zone1_status', 'Zone 1')}
                {renderTextField('zone2_status', 'Zone 2')}
                {renderTextField('zone3_status', 'Zone 3')}
                {renderTextField('zone4_status', 'Zone 4')}
                {renderTextField('zone5_status', 'Zone 5')}
                {renderTextField('zone6_status', 'Zone 6')}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl p-3 sm:p-4">
              <p className="text-xs font-semibold text-slate-500 mb-1">รายละเอียด</p>
              <p className="text-xs sm:text-sm text-slate-700 break-words">{report.details || '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 sm:p-4">
              <p className="text-xs font-semibold text-slate-500 mb-1">ผู้รายงาน</p>
              <p className="text-xs sm:text-sm text-slate-700 break-words">{report.fullName || report.submitted_by || '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 sm:p-4">
              <p className="text-xs font-semibold text-slate-500 mb-1">เวลา</p>
              <p className="text-xs sm:text-sm text-slate-700">{report.time || '-'}</p>
            </div>
          </div>
        );
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 safe-area-inset" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
              <TypeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">
                {mode === 'view' ? 'ดูรายงาน' : 'แก้ไขรายงาน'}
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 truncate">{report.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {error && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-red-100 text-red-700 border border-red-300 flex items-start gap-2 text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}
          {success && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-start gap-2 text-xs sm:text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="break-words">{success}</span>
            </div>
          )}

          {renderFormContent()}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex-shrink-0">
              {canDelete && (
                <button onClick={handleDelete} disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50 border border-red-200 sm:border-transparent">
                  <Trash2 className="w-4 h-4" />
                  ลบรายงาน
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {mode === 'view' && canEdit && (
                <button onClick={() => setMode('edit')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl shadow-md transition-all">
                  <Pencil className="w-4 h-4" />
                  แก้ไข
                </button>
              )}
              {mode === 'edit' && (
                <button onClick={handleSave} disabled={loading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl shadow-md transition-all disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              )}
              <button onClick={onClose}
                className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                ปิด
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
