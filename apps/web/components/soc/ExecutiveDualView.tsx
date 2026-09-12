'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Building2, Users, Camera, Car, ShieldCheck, ArrowRight, Activity } from 'lucide-react';
import { useSite } from '@/lib/SiteContext';

export function ExecutiveDualView({ onSelectSite }: { onSelectSite: (siteId: number) => void }) {
  const [bpiData, setBpiData] = useState<any>(null);
  const [prbData, setPrbData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<any>('/api/stats/dashboard?site_id=1').catch(() => null),
      apiFetch<any>('/api/stats/dashboard?site_id=2').catch(() => null),
    ])
      .then(([bpi, prb]) => {
        setBpiData(bpi?.data ?? bpi);
        setPrbData(prb?.data ?? prb);
      })
      .finally(() => setLoading(false));
  }, []);

  const renderSiteCard = (title: string, code: string, color: string, data: any, siteId: number) => {
    const guards = data?.guards?.today || {};
    const parking = data?.parking || {};
    const cctv = data?.cctv || {};
    const nvr = data?.nvr || {};
    const carUsed = parking?.car?.today || 0;
    const carCap = parking?.carCapacity || (code === 'BPI' ? 1075 : 550);
    const motoUsed = parking?.motorcycle?.today || 0;
    const motoCap = parking?.motorcycleCapacity || (code === 'BPI' ? 757 : 380);

    const cctvOnline = cctv?.online || 0;
    const cctvTotal = cctv?.total || (code === 'BPI' ? 815 : 142);
    const cctvPercent = cctvTotal > 0 ? ((cctvOnline / cctvTotal) * 100).toFixed(1) : '100.0';

    const activeGuards = (guards?.morning || 0) + (guards?.evening || 0);
    const contractGuards = (guards?.morningContract || guards?.morning || 0) + (guards?.eveningContract || guards?.evening || 0);

    return (
      <div className={`bg-white rounded-3xl p-5 border-2 shadow-lg flex flex-col justify-between relative overflow-hidden ${
        code === 'BPI' ? 'border-blue-200' : 'border-emerald-200'
      }`}>
        <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-slate-50 rounded-full pointer-events-none opacity-60" />
        
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-sm shadow-md ${
                code === 'BPI' ? 'bg-gradient-to-br from-blue-600 to-sky-500' : 'bg-gradient-to-br from-emerald-600 to-teal-500'
              }`}>
                {code}
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 leading-tight">{title}</h2>
                <p className="text-xs text-slate-400">
                  {code === 'BPI' ? 'นิคมอุตสาหกรรมไฮเทค อยุธยา' : 'นิคมอุตสาหกรรม 304 ปราจีนบุรี'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Operational 98%</span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Guards */}
            <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>กำลังพล รปภ.</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {activeGuards} <span className="text-xs text-slate-400 font-normal">/ {contractGuards} นาย</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                กะเช้า {guards?.morning || 0} · กะดึก {guards?.evening || 0}
              </div>
            </div>

            {/* Surveillance */}
            <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                <Camera className="w-3.5 h-3.5 text-indigo-600" />
                <span>กล้อง CCTV</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {cctvPercent}%
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                ออนไลน์ {cctvOnline} จาก {cctvTotal} กล้อง
              </div>
            </div>

            {/* Parking */}
            <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                <Car className="w-3.5 h-3.5 text-sky-600" />
                <span>ลานจอดรถยนต์</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {carUsed} <span className="text-xs text-slate-400 font-normal">/ {carCap} ช่อง</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                จยย. {motoUsed} / {motoCap} คัน
              </div>
            </div>

            {/* Security Devices */}
            <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>เครื่องคัดกรองบุคคล</span>
              </div>
              <div className="text-xl font-black text-emerald-600">
                พร้อมใช้งาน 100%
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                Walkthrough & Handheld
              </div>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <button
          onClick={() => onSelectSite(siteId)}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-white shadow-md cursor-pointer ${
            code === 'BPI'
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          <span>เปิดดู Dashboard ละเอียดสาขานี้</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4 my-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">เปรียบเทียบสถานการณ์ 2 สาขา (Executive Dual-View)</h2>
          <p className="text-xs text-slate-500">มอนิเตอร์กำลังพล ระบบกล้อง และความปลอดภัยพร้อมกัน 2 แห่งแบบ Real-time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderSiteCard('สาขาบางปะอิน (BPI Plant)', 'BPI', 'blue', bpiData, 1)}
        {renderSiteCard('สาขาปราจีนบุรี (PRB Plant)', 'PRB', 'emerald', prbData, 2)}
      </div>
    </div>
  );
}
