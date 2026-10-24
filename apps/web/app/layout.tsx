import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '../components/AppShell';
import { SiteProvider } from '../lib/SiteContext';
import QueryProvider from '../lib/QueryProvider';
import { Suspense } from 'react';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1e3a8a',
};

export const metadata: Metadata = {
  title: 'WD Security Operations Center (BPI & PRB)',
  description: 'Multi-Site Security Management & Command Operations System',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'WD SOC' },
  icons: {
    icon: '/report_assets/Images/PCS_logo.png',
    shortcut: '/report_assets/Images/PCS_logo.png',
    apple: '/report_assets/Images/PCS_logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <Suspense>
          <QueryProvider>
            <SiteProvider>
              <AppShell>{children}</AppShell>
            </SiteProvider>
          </QueryProvider>
        </Suspense>
      </body>
    </html>
  );
}
