'use client';

import React from 'react';
import { Radio, ArrowRight, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { IncidentNotification } from '@/lib/incident-service';

interface NotificationBannerProps {
  notification: IncidentNotification | null;
  onOpenTask: (incidentId: string) => void;
  onDismiss: () => void;
}

export default function NotificationBanner({
  notification,
  onOpenTask,
  onDismiss,
}: NotificationBannerProps) {
  if (!notification) return null;

  const isUrgent = notification.type === 'urgent_dispatch' || notification.type === 'incident_reported';

  return (
    <aside
      aria-label="การแจ้งเตือนคำสั่งด่วน"
      className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg animate-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div
        className={`p-3 sm:p-3.5 rounded-2xl shadow-xl border backdrop-blur-md flex items-center justify-between gap-3 ${
          isUrgent
            ? 'bg-slate-900/95 text-white border-amber-500/60 shadow-amber-950/20'
            : 'bg-white/95 text-slate-800 border-slate-200 shadow-slate-900/10'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isUrgent ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-blue-50 text-blue-600'
            }`}
          >
            {isUrgent ? (
              <Radio className="w-5 h-5 animate-pulse" strokeWidth={2} />
            ) : (
              <CheckCircle2 className="w-5 h-5" strokeWidth={2} />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold leading-tight truncate">
              {notification.title}
            </h4>
            <p
              className={`text-[11px] leading-tight truncate mt-0.5 ${
                isUrgent ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              {notification.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {notification.incidentId && (
            <button
              onClick={() => {
                onOpenTask(notification.incidentId);
                onDismiss();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-xs"
            >
              <span>เปิดดูคำสั่ง</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          )}
          <button
            onClick={onDismiss}
            className={`p-1.5 rounded-lg transition-colors ${
              isUrgent ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title="ปิดการแจ้งเตือน"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}
