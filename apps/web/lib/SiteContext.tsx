'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from './api';

export interface SiteInfo {
  id: number;
  code: string;
  name: string;
  nameEn?: string;
  location?: string;
  address?: string;
  description?: string;
  isActive?: boolean;
}

export const DEFAULT_SITES: SiteInfo[] = [
  {
    id: 1,
    code: 'BPI',
    name: 'สาขาบางปะอิน',
    nameEn: 'Bang Pa-in Plant',
    location: 'นิคมอุตสาหกรรมไฮเทค อยุธยา',
    isActive: true,
  },
  {
    id: 2,
    code: 'PRB',
    name: 'สาขาปราจีนบุรี',
    nameEn: 'Prachinburi Plant',
    location: 'นิคมอุตสาหกรรม 304 ปราจีนบุรี',
    isActive: true,
  },
];

interface SiteContextType {
  currentSite: SiteInfo;
  currentSiteCode: string;
  currentSiteId: number;
  sites: SiteInfo[];
  switchSite: (siteCodeOrId: string | number) => void;
  isExecutive: boolean;
  autoRotate: boolean;
  setAutoRotate: (val: boolean) => void;
  rotationSeconds: number;
  setRotationSeconds: (seconds: number) => void;
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  toggleRotation: () => void;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [sites, setSites] = useState<SiteInfo[]>(DEFAULT_SITES);
  const [currentSiteId, setCurrentSiteId] = useState<number>(1);
  const [isExecutive, setIsExecutive] = useState<boolean>(true); // default true for executive view
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [rotationSeconds, setRotationSeconds] = useState<number>(15);
  const [timeLeft, setTimeLeft] = useState<number>(15);

  // Initialize from localStorage and current user profile
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.location.pathname === '/login') return;

    const savedSite = localStorage.getItem('selected_site_id');
    if (savedSite) {
      setCurrentSiteId(Number(savedSite));
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    // Fetch live sites list and profile
    apiFetch<any>('/api/sites')
      .then((res) => {
        const data = Array.isArray(res) ? res : res.data || [];
        if (data.length > 0) {
          setSites(data);
        }
      })
      .catch(() => {});

    apiFetch<any>('/api/auth/me')
      .then((res) => {
        const u = res?.user || res?.data?.user || res?.data || res;
        if (u) {
          const roleName = u.role?.name || u.role_name || u.role || '';
          const isExec =
            u.isExecutive ||
            u.roleId === 1 ||
            u.roleId === 6 ||
            roleName.includes('ผู้บริหาร') ||
            roleName.includes('Admin');
          setIsExecutive(isExec);

          // If user is not executive and has default site, enforce it
          if (!isExec && u.defaultSiteId) {
            setCurrentSiteId(u.defaultSiteId);
          }
        }
      })
      .catch(() => {});
  }, []);

  const switchSite = useCallback(
    (siteCodeOrId: string | number) => {
      let target: SiteInfo | undefined;
      if (typeof siteCodeOrId === 'number') {
        target = sites.find((s) => s.id === siteCodeOrId);
      } else {
        target = sites.find((s) => s.code.toUpperCase() === siteCodeOrId.toUpperCase());
      }

      if (target) {
        setCurrentSiteId(target.id);
        setTimeLeft(rotationSeconds); // reset countdown timer
        if (typeof window !== 'undefined') {
          localStorage.setItem('selected_site_id', String(target.id));
          localStorage.setItem('selected_site_code', target.code);
        }
      }
    },
    [sites, rotationSeconds],
  );

  const toggleRotation = useCallback(() => {
    setAutoRotate((prev) => !prev);
    setTimeLeft(rotationSeconds);
  }, [rotationSeconds]);

  // 15-Second Auto Rotation Timer
  useEffect(() => {
    if (!autoRotate) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Switch to the next site
          setCurrentSiteId((currId) => {
            const nextSite = currId === 1 ? 2 : 1;
            if (typeof window !== 'undefined') {
              localStorage.setItem('selected_site_id', String(nextSite));
            }
            return nextSite;
          });
          return rotationSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRotate, rotationSeconds]);

  const currentSite = sites.find((s) => s.id === currentSiteId) || sites[0] || DEFAULT_SITES[0];

  return (
    <SiteContext.Provider
      value={{
        currentSite,
        currentSiteCode: currentSite.code,
        currentSiteId,
        sites,
        switchSite,
        isExecutive,
        autoRotate,
        setAutoRotate,
        rotationSeconds,
        setRotationSeconds,
        timeLeft,
        setTimeLeft,
        toggleRotation,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
}
