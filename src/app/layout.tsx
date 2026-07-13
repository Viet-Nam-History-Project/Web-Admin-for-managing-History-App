import type { Metadata } from 'next';
import './globals.css';
import { AppFrame } from '@/components/layout/AppFrame';
import { AdminPreferencesProvider } from '@/contexts/AdminPreferencesContext';

export const metadata: Metadata = {
  title: 'Admin | Lịch Sử Việt Nam',
  description: 'Web admin quản trị hệ thống học Lịch Sử Việt Nam',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('admin-theme')==='dark'?'dark':'light';var r=localStorage.getItem('admin-reduced-motion')==='true';document.documentElement.dataset.theme=t;document.documentElement.dataset.reducedMotion=String(r);document.documentElement.style.colorScheme=t;}catch(e){}})();` }} /></head>
      <body><AdminPreferencesProvider><AppFrame>{children}</AppFrame></AdminPreferencesProvider></body>
    </html>
  );
}
