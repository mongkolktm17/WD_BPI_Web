'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

// Redirect non-admin users away from admin pages.
// Admin = permissions include 'all'/'admin' OR role id 1 OR admin role name.
// Returns: true = authorized, null = still checking (caller should render loading).
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
        const isAdmin =
          perms.includes('all') ||
          perms.includes('admin') ||
          role?.id === 1 ||
          role?.roleName === 'admin' ||
          role?.name === 'admin' ||
          role?.roleName === 'ผู้ดูแลระบบ' ||
          role?.name === 'ผู้ดูแลระบบ';
        if (!isAdmin) {
          router.replace('/report-page');
        } else {
          setAuthorized(true);
        }
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  return authorized;
}
