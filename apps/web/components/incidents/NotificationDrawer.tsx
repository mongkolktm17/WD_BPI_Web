'use client';

import React from 'react';
import { X, Bell, Check, Clock, Radio, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { IncidentService, type IncidentNotification } from '@/lib/incident-service';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: IncidentNotification[];
  onOpenTask: (incidentId: string) => void;
  onMarkAllRead: () => void;
}

export default function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onOpenTask,
  onMarkAllRead,
}: NotificationDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Bell className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 leading-tight">
                ศูนย์แจ้งเตือนคำสั่ง
              </h3>
              <p className="text-[10px] text-slate-500 leading-tight">
                การแจ้งเตือนและภารกิจด่วนจาก SOC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono text-[11px]">
            ทั้งหมด {notifications.length} รายการ
          </span>
          {notifications.some((n) => !n.read) && (
            <button
              onClick={onMarkAllRead}
              className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] flex items-center gap-1"
            >
              <Check className="w-3 h-3" strokeWidth={2} />
              <span>อ่านทั้งหมดแล้ว</span>
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
              <p className="text-xs font-semibold">ไม่มีการแจ้งเตือนใหม่</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isUrgent = n.type === 'urgent_dispatch' || n.type === 'incident_reported';
              return (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border transition-all ${
                    !n.read
                      ? 'bg-amber-50/50 border-amber-200/80 shadow-2xs'
                      : 'bg-white border-slate-200/70 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isUrgent ? (
                        <Radio className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 animate-pulse" strokeWidth={2} />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" strokeWidth={2} />
                      )}
                      <h4 className="text-xs font-bold text-slate-800 truncate leading-tight">
                        {n.title}
                      </h4>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 mt-1" />
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {n.message}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100/80 text-[10px] text-slate-400 font-mono">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" strokeWidth={1.5} />
                      <span>{new Date(n.timestamp).toLocaleTimeString('th-TH')}</span>
                    </div>

                    {n.incidentId && (
                      <button
                        onClick={() => {
                          IncidentService.markNotificationAsRead(n.id);
                          onOpenTask(n.incidentId);
                          onClose();
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
                      >
                        <span>เปิดงาน</span>
                        <ArrowRight className="w-3 h-3" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
