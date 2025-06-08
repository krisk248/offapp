// src/app/downloads/page.tsx
"use client";

import Header from '@/components/header';
import DownloadPanel from '@/components/download-panel';
import { AppProvider, useAppContext } from '@/store/app-context'; // AppProvider might not be needed if in layout
import { useEffect, useState } from 'react';

function DownloadsPageContent() {
  const { state } = useAppContext(); // Access context if needed for conditional rendering based on queue
  
  // This state is to ensure client-side components reliant on window or specific context are ready
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // You can return a loader here if needed, or null
    return null; 
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <Header />
      <main className="container mx-auto px-2 py-4 sm:px-4 sm:py-6 flex-grow">
        <h2 className="text-2xl font-headline font-semibold mb-6">Download Queue Management</h2>
        <DownloadPanel />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        OfflineTube &copy; {new Date().getFullYear()} - Manage your downloads.
      </footer>
    </div>
  );
}

export default function DownloadsPage() {
  // AppProvider is now in layout.tsx, so no need to wrap here again
  return <DownloadsPageContent />;
}
