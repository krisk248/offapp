
"use client";

import { Youtube, DownloadCloud, Archive } from 'lucide-react'; // Removed Settings
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/store/app-context';
// SettingsDialog import removed
import Link from 'next/link';

export default function Header() {
  const { state, dispatch } = useAppContext();
  // isSettingsOpen state removed

  const selectedCount = state.selectedVideos.size;
  const videosToDownload = state.videos.filter(v => state.selectedVideos.has(v.id));

  const handleDownloadAllSelectedToQueue = () => {
    if (videosToDownload.length > 0) {
      dispatch({ type: 'ADD_TO_DOWNLOAD_QUEUE', payload: videosToDownload });
      dispatch({ type: 'DESELECT_ALL_VIDEOS' }); 
    }
  };

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Youtube className="h-8 w-8 text-primary" />
          <Link href="/" className="text-2xl font-headline font-semibold text-foreground hover:text-primary transition-colors">
            Dushyath Youtube Downloader
          </Link>
          <span className="text-sm text-muted-foreground ml-2 hidden sm:inline">
            {state.channelName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {selectedCount > 0 && (
            <Button variant="ghost" size="sm" className="text-muted-foreground pointer-events-none">
              {selectedCount} video{selectedCount > 1 ? 's' : ''} selected
            </Button>
          )}
          <Button 
            variant="default" 
            size="lg"
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
          {/* Settings button removed */}
        </div>
      </div>
      {/* SettingsDialog component removed */}
    </header>
  );
}

