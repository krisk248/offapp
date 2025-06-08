"use client";

import { Youtube, Settings, DownloadCloud, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/store/app-context';
import SettingsDialog from './settings-dialog'; // Will be created
import { useState } from 'react';

export default function Header() {
  const { state, dispatch } = useAppContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const selectedCount = state.selectedVideos.size;
  const videosToDownload = state.videos.filter(v => state.selectedVideos.has(v.id));

  const handleDownloadAll = () => {
    if (videosToDownload.length > 0) {
      dispatch({ type: 'ADD_TO_DOWNLOAD_QUEUE', payload: videosToDownload });
      // Optionally clear selection after adding to queue
      // dispatch({ type: 'DESELECT_ALL_VIDEOS' }); 
    }
  };

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Youtube className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold text-foreground">
            OfflineTube
          </h1>
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
            size="lg"
            onClick={handleDownloadAll}
            disabled={selectedCount === 0}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <DownloadCloud className="mr-2 h-5 w-5" />
            Download {selectedCount > 0 ? `(${selectedCount})` : 'Selected'}
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
