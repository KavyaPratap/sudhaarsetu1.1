import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import 'leaflet/dist/leaflet.css';
import { I18nProvider } from '@/context/i18n-context';
import VoiceNavigator from '@/components/VoiceNavigator';

export const metadata: Metadata = {
  title: 'SudhaarSetu - Report & Resolve',
  description: 'Your platform for civic issue reporting and community action.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          'font-body'
        )}
      >
        <I18nProvider>
          {children}
          <VoiceNavigator />
        </I18nProvider>
        <Toaster />
      </body>
    </html>
  );
}
