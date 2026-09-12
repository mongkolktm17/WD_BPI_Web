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
    <div className="w-full bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-2.5 md:p-3 border border-slate-700/80 shadow-xl overflow-hidden relative">
      {/* 15s Countdown Running Progress Line */}
      {autoRotate && !isDualView && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Left: Auto-Rotation Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={toggleRotation}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
              autoRotate
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
            title={autoRotate ? 'คลิกเพื่อหยุดสลับหน้าจอชั่วคราว' : 'คลิกเพื่อเริ่มสลับหน้าจออัตโนมัติ'}
          >
            {autoRotate ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>หยุดชั่วคราว (เหลือ {timeLeft}s)</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>เล่นสลับอัตโนมัติ (ทุก 15s)</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <span className="hidden md:inline">รอบ:</span>
            <select
              value={rotationSeconds}
              onChange={(e) => setRotationSeconds(Number(e.target.value))}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-[11px] outline-none cursor-pointer"
            >
              <option value={10}>10 วินาที</option>
              <option value={15}>15 วินาที (มาตรฐาน)</option>
              <option value={30}>30 วินาที</option>
              <option value={60}>60 วินาที</option>
            </select>
          </div>
        </div>

        {/* Center: Site Tabs */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 gap-1 w-full sm:w-auto justify-center">
          {sites.map((site) => {
            const isActive = !isDualView && currentSite.id === site.id;
            return (
              <button
                key={site.id}
                onClick={() => {
                  setIsDualView(false);
                  switchSite(site.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? site.code === 'BPI'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{site.name}</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-black/30 font-mono">
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isDualView
                ? 'bg-purple-600 text-white border-purple-500 shadow-md ring-2 ring-purple-400/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700/80 hover:text-white'
            }`}
            title="เปรียบเทียบ KPI ทั้ง 2 สาขาเคียงข้างกันในหน้าจอเดียว"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isDualView ? 'โหมดเดี่ยว (Single)' : 'เปรียบเทียบ 2 สาขา (Dual View)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
