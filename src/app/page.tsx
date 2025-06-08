"use client";

import { AppProvider } from '@/store/app-context';
import Header from '@/components/header';
import ControlsPanel from '@/components/controls-panel';
import VideoGrid from '@/components/video-grid';
import DownloadPanel from '@/components/download-panel';
import { Separator } from '@/components/ui/separator';

function OfflineTubePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <Header />
      <main className="container mx-auto px-2 py-4 sm:px-4 sm:py-6 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main content area for videos and controls */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            <ControlsPanel />
            <VideoGrid />
          </div>

          {/* Sidebar area for downloads */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-6 lg:sticky lg:top-[calc(theme(spacing.16)_+_1px)] lg:max-h-[calc(100vh_-_theme(spacing.16)_-_theme(spacing.12))] lg:overflow-y-auto pb-6">
             {/* The sticky top value needs to match header height + some padding */}
            <DownloadPanel />
          </aside>
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        OfflineTube &copy; {new Date().getFullYear()} - Download videos responsibly.
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <OfflineTubePage />
    </AppProvider>
  );
}
