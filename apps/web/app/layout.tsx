import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '../components/AppShell';
import { SiteProvider } from '../lib/SiteContext';
import { Suspense } from 'react';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'WD Security Operations Center (BPI & PRB)',
  description: 'Multi-Site Security Management & Command Operations System',
  icons: {
    icon: '/favicon.png',
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
          <SiteProvider>
            <AppShell>{children}</AppShell>
          </SiteProvider>
        </Suspense>
      </body>
    </html>
  );
}
