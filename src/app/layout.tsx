
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppProvider } from '@/store/app-context'; // Import AppProvider

export const metadata: Metadata = {
  title: 'Dushyath Youtube Downloader',
  description: 'Download YouTube videos for offline viewing.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AppProvider> {/* Wrap children with AppProvider */}
          {children}
          <Toaster />
        </AppProvider>
      </body>
    </html>
  );
}

