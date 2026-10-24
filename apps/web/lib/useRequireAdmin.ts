'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

// Redirect non-admin users away from admin pages.
// Admin = roleId 1, roleId 6, admin role name, or explicit all/admin permission.
// Returns: true = authorized, false = unauthorized (redirecting), null = still checking.
export function useRequireAdmin(): boolean | null {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    apiFetch<any>('/api/auth/me')
      .then((data) => {
        const d = data?.data ?? data;
        const u = d?.user ?? d;
        const perms: string[] = [];
        const pushPerm = (p: any) => {
          if (typeof p === 'string') perms.push(p);
          else if (p?.moduleName) perms.push(p.moduleName);
          else if (p?.name) perms.push(p.name);
        };
        (u?.role?.permissions || []).forEach(pushPerm);
        (u?.permissions || []).forEach(pushPerm);

        const role = u?.role;
        const roleId = Number(role?.id ?? u?.roleId ?? 0);
        const roleName = String(role?.name || role?.roleName || u?.roleName || '');
        const username = String(u?.username || '');

        const isAdmin =
          perms.includes('all') ||
          perms.includes('admin') ||
          roleId === 1 ||
          roleId === 6 ||
          username === 'admin' ||
          username === 'itadmin' ||
          u?.isExecutive === true ||
          roleName.toLowerCase().includes('admin') ||
          roleName.includes('ผู้ดูแลระบบ') ||
          roleName.includes('ผู้บริหาร');

        if (!isAdmin) {
          setAuthorized(false);
          router.replace('/report-page');
        } else {
          setAuthorized(true);
        }
      })
      .catch(() => {
        setAuthorized(false);
        router.replace('/login');
      });
  }, [router]);

  return authorized;
}
