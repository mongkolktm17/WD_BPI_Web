'use client';

import React from 'react';
import { useSite } from '@/lib/SiteContext';
import { Play, Pause, RotateCw, Layers, Shield, Sparkles, Building2 } from 'lucide-react';

interface ExecutiveRotatingBarProps {
  isDualView: boolean;
  setIsDualView: (val: boolean) => void;
}

export function ExecutiveRotatingBar({ isDualView, setIsDualView }: ExecutiveRotatingBarProps) {
  const {
    currentSite,
    sites,
    switchSite,
    isExecutive,
    autoRotate,
    toggleRotation,
    timeLeft,
    rotationSeconds,
    setRotationSeconds,
  } = useSite();

  if (!isExecutive) return null;

  const progressPercent = Math.max(0, Math.min(100, ((rotationSeconds - timeLeft) / rotationSeconds) * 100));

  return (
    <div className="w-full bg-[#001433]/95 backdrop-blur-md text-white rounded-xl p-2.5 md:p-3 border border-[#0052CC]/30 shadow-lg overflow-hidden relative">
      {/* 15s Countdown Running Progress Line */}
      {autoRotate && !isDualView && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#0052CC] via-[#00A3E0] to-emerald-400 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Left: Auto-Rotation Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={toggleRotation}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all shadow-xs cursor-pointer ${
              autoRotate
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
                : 'bg-[#0052CC] hover:bg-[#00388A] text-white'
            }`}
            title={autoRotate ? 'คลิกเพื่อหยุดสลับหน้าจอชั่วคราว' : 'คลิกเพื่อเริ่มสลับหน้าจออัตโนมัติ'}
          >
            {autoRotate ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>PAUSE ({timeLeft}s)</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>AUTO-CYCLE (15s)</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <span className="hidden md:inline">รอบ:</span>
            <select
              value={rotationSeconds}
              onChange={(e) => setRotationSeconds(Number(e.target.value))}
              className="bg-[#0B2545] text-slate-200 border border-[#0052CC]/40 rounded px-2 py-1 text-[11px] outline-none cursor-pointer font-mono"
            >
              <option value={10}>10s</option>
              <option value={15}>15s (STD)</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </div>
        </div>

        {/* Center: Site Tabs */}
        <div className="flex items-center bg-[#071A2E] p-1 rounded-lg border border-[#0052CC]/30 gap-1 w-full sm:w-auto justify-center">
          {sites.map((site) => {
            const isActive = !isDualView && currentSite.id === site.id;
            return (
              <button
                key={site.id}
                onClick={() => {
                  setIsDualView(false);
                  switchSite(site.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer font-mono ${
                  isActive
                    ? site.code === 'BPI'
                      ? 'bg-[#0052CC] text-white shadow-xs'
                      : 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{site.name}</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-black/40 font-mono">
                  {site.code}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: View Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDualView(!isDualView)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer border ${
              isDualView
                ? 'bg-[#0052CC] text-white border-blue-400 shadow-xs ring-2 ring-blue-400/30'
                : 'bg-[#0B2545] text-slate-300 border-[#0052CC]/30 hover:bg-slate-800 hover:text-white'
            }`}
            title="เปรียบเทียบ KPI ทั้ง 2 สาขาเคียงข้างกันในหน้าจอเดียว"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isDualView ? 'SINGLE VIEW' : 'DUAL COMPARISON'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
