import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WD Security Operations Center (BPI & PRB)',
    short_name: 'WD SOC',
    description: 'ศูนย์ปฏิบัติการความปลอดภัยและระบบรายงานเหตุการณ์ บมจ. เวสเทิร์น ดิจิตอล (บางปะอิน & ปราจีนบุรี)',
    start_url: '/report-page',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#1e3a8a',
    orientation: 'portrait-primary',
    categories: ['security', 'business', 'productivity'],
    icons: [
      {
        src: '/favicon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/report_assets/Images/PCS_logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/report_assets/Images/WD_logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logos/wd-corporate-logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
