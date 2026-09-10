import type { Metadata, Viewport } from 'next';
import { TabBar } from '@/components/TabBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'NutriPerso',
  description: 'Registre alimentaire personnel.',
  manifest: '/manifest.json',
  applicationName: 'NutriPerso',
  appleWebApp: {
    capable: true,
    title: 'NutriPerso',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#12151A',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" data-theme="nutriperso">
      <body className="min-h-dvh bg-base-100 text-base-content">
        {/* pb-24 réserve la hauteur de la barre d'onglets fixe. */}
        <main className="safe-top mx-auto w-full max-w-lg px-4 pb-24">{children}</main>
        <TabBar />
      </body>
    </html>
  );
}
