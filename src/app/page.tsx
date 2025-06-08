"use client";

import Header from '@/components/header';
import ControlsPanel from '@/components/controls-panel';
import VideoGrid from '@/components/video-grid';
// DownloadPanel is removed from here

function OfflineTubePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <Header />
      <main className="container mx-auto px-2 py-4 sm:px-4 sm:py-6 flex-grow">
        {/* Main content area for videos and controls, now takes full width or adjusts */}
        <div className="space-y-6">
          <ControlsPanel />
          <VideoGrid />
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        OfflineTube &copy; {new Date().getFullYear()} - Download videos responsibly.
      </footer>
    </div>
  );
}

// AppProvider is removed from here, now it's in layout.tsx
export default function Home() {
  return <OfflineTubePage />;
}
