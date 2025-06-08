
// src/app/downloads/page.tsx
"use client";

import Header from '@/components/header';
import DownloadPanel from '@/components/download-panel';
import { useEffect, useState } from 'react';

function DownloadsPageContent() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; 
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <Header />
      <main className="container mx-auto px-2 py-4 sm:px-4 sm:py-6 flex-grow">
        {/* DownloadPanel is no longer wrapped in a Card here, it will manage its own styling */}
        <DownloadPanel />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        Dushyath Youtube Downloader &copy; {new Date().getFullYear()} - Manage your downloads.
      </footer>
    </div>
  );
}

export default function DownloadsPage() {
  return <DownloadsPageContent />;
}

