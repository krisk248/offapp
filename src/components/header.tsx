"use client";

import { Youtube, Settings, DownloadCloud, CheckCircle, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/store/app-context';
import SettingsDialog from './settings-dialog';
import { useState } from 'react';
import Link from 'next/link';

export default function Header() {
  const { state, dispatch } = useAppContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const selectedCount = state.selectedVideos.size;
  const videosToDownload = state.videos.filter(v => state.selectedVideos.has(v.id));

  const handleDownloadAllSelectedToQueue = () => {
    if (videosToDownload.length > 0) {
      dispatch({ type: 'ADD_TO_DOWNLOAD_QUEUE', payload: videosToDownload });
      // Clear selection after adding to queue, so the "Download Selected" button resets
      dispatch({ type: 'DESELECT_ALL_VIDEOS' }); 
    }
  };

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Youtube className="h-8 w-8 text-primary" />
          <Link href="/" className="text-2xl font-headline font-semibold text-foreground hover:text-primary transition-colors">
            OfflineTube
          </Link>
          <span className="text-sm text-muted-foreground ml-2 hidden sm:inline">
            {state.channelName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-5 w-5 text-accent" />
              <span>{selectedCount} video{selectedCount > 1 ? 's' : ''} selected</span>
            </div>
          )}
          <Button 
            variant="default" 
            size="lg" // Kept size lg for prominence
            onClick={handleDownloadAllSelectedToQueue}
            disabled={selectedCount === 0}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <DownloadCloud className="mr-2 h-5 w-5" />
            Add to Queue {selectedCount > 0 ? `(${selectedCount})` : ''}
          </Button>
          <Button variant="outline" size="icon" asChild aria-label="View Downloads">
            <Link href="/downloads">
              <Archive className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={() => setIsSettingsOpen(true)} aria-label="Settings">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <SettingsDialog isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </header>
  );
}
