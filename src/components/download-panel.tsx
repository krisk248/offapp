
"use client";

import { useAppContext } from '@/store/app-context';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, PauseCircle, PlayCircle, Trash2, CheckCircle, Clock, Archive, ServerCrash } from 'lucide-react';
import type { DownloadItem } from '@/types';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function DownloadPanel() {
  const { state, dispatch } = useAppContext(); // Removed initiateServerDownload, it's internal to context
  const { downloadQueue } = state;
  const { toast } = useToast();
  const [isZipping, setIsZipping] = useState(false);

  const handlePause = (videoId: string) => {
    dispatch({ type: 'SET_DOWNLOAD_ITEM_STATUS', payload: { videoId, status: 'paused' } });
    console.log(`[Download Panel] Paused (simulated) for video ID: ${videoId}`);
  };

  const handleResume = (item: DownloadItem) => {
    if (item.status === 'paused' || item.status === 'error') {
        console.log(`[Download Panel] Resuming/Retrying download for: ${item.title}`);
        // The AppContext will pick up 'queued' items or handle retries if logic is added there
        // For now, setting to 'queued' will re-trigger the download process by the AppContext effect
        dispatch({ type: 'SET_DOWNLOAD_ITEM_STATUS', payload: { videoId: item.id, status: 'queued', progress: 0 } });
    } else {
        console.log(`[Download Panel] Resume called for item with status ${item.status}, no action taken.`);
    }
  };

  const handleCancel = (videoId: string) => {
    dispatch({ type: 'REMOVE_FROM_DOWNLOAD_QUEUE', payload: videoId });
    console.log(`[Download Panel] Canceled/Removed from queue: ${videoId}`);
  };

  const handleClearCompleted = () => {
    dispatch({type: 'CLEAR_COMPLETED_DOWNLOADS'});
  }

  const handleDownloadAllAsZip = async () => {
    const readyItems = state.downloadQueue.filter(item => item.status === 'server_download_ready' && item.filename);
    if (readyItems.length === 0) {
      toast({ title: "No Videos Ready", description: "No videos are currently ready to be included in a ZIP.", variant: "default" });
      return;
    }

    const filenames = readyItems.map(item => item.filename!);
    console.log('[Download Panel] Requesting ZIP for filenames:', filenames);

    setIsZipping(true);
    try {
      const response = await fetch('/api/zip-downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to create ZIP. Server returned an error." }));
        console.error('[Download Panel] ZIP Creation Failed on server:', errorData);
        toast({ title: "ZIP Creation Failed", description: errorData.message || "Could not create ZIP file.", variant: "destructive" });
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const contentDisposition = response.headers.get('content-disposition');
      let downloadFilename = `Dushyath_Youtube_Downloads_${new Date().toISOString().split('T')[0]}.zip`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch && filenameMatch.length > 1) {
          downloadFilename = filenameMatch[1];
        }
      }
      a.download = downloadFilename;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "ZIP Download Started", description: "Your ZIP archive is downloading." });

    } catch (error: any) {
      console.error('[Download Panel] Error requesting ZIP:', error);
      toast({ title: "ZIP Request Error", description: error.message || "Could not request ZIP file from server.", variant: "destructive" });
    } finally {
      setIsZipping(false);
    }
  };


  const getStatusIcon = (status: DownloadItem['status']) => {
    switch (status) {
      case 'queued':
      case 'initiating_server_download':
        return <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />;
      case 'server_downloading':
        return <Download className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'server_download_ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'paused':
        return <PauseCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <ServerCrash className="h-4 w-4 text-destructive" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-700" />;
      default:
        return null;
    }
  };

  const readyForZipCount = downloadQueue.filter(item => item.status === 'server_download_ready' && item.filename).length;
  const totalProgress = downloadQueue.length > 0
    ? downloadQueue.reduce((acc, item) => acc + (item.status === 'server_download_ready' || item.status === 'completed' ? 100 : (item.status === 'initiating_server_download' ? 10 : (item.status === 'server_downloading' ? item.progress : 0) ) ), 0) / downloadQueue.length
    : 0;

  return (
    <div className="bg-background shadow-lg rounded-lg border">
      <div className="border-b p-4 sm:p-6">
        <h3 className="text-xl font-headline flex items-center justify-between">
          <span>
            <Download className="mr-2 h-6 w-6 text-primary inline-block" />
            Download Queue
          </span>
          {readyForZipCount > 0 && (
            <Button
              onClick={handleDownloadAllAsZip}
              variant="default"
              size="sm"
              disabled={isZipping || readyForZipCount === 0}
              className="bg-accent hover:bg-accent/90"
            >
              <Archive className="mr-2 h-4 w-4" />
              {isZipping ? 'Zipping...' : `Download All Ready as ZIP (${readyForZipCount})`}
            </Button>
          )}
        </h3>
      </div>
      <div className="p-0 flex-grow overflow-hidden">
        {downloadQueue.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground min-h-[300px] flex flex-col justify-center items-center">
            <DownloadCloudIcon className="w-16 h-16 mb-4 text-gray-300" />
            <p>Your download queue is empty.</p>
            <p className="text-sm">Select videos and add them to the queue to begin.</p>
          </div>
        ) : (
          <ScrollArea className="h-full p-1 max-h-[calc(100vh-350px)] sm:max-h-[calc(100vh-300px)]">
            <div className="space-y-3 p-3">
            {downloadQueue.map(item => (
              <div key={item.id} className="p-3 border rounded-md bg-background/50 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                   <Image
                    src={item.thumbnailUrl}
                    alt={item.title}
                    width={80}
                    height={45}
                    className="rounded object-cover aspect-video"
                    data-ai-hint="video thumbnail small"
                    unoptimized={true}
                  />
                  <div className="flex-grow overflow-hidden">
                    <p className="text-sm font-medium truncate" title={item.title}>{item.title}</p>
                    <p className="text-xs text-muted-foreground">Quality: {item.selectedQuality}</p>
                    {item.status === 'error' && item.errorMessage && (
                        <p className="text-xs text-destructive truncate" title={item.errorMessage}>Error: {item.errorMessage}</p>
                    )}
                     {item.filename && item.status === 'server_download_ready' && (
                        <p className="text-xs text-muted-foreground truncate" title={item.filename}>Filename: {item.filename}</p>
                    )}
                  </div>
                   <div className="flex-shrink-0">{getStatusIcon(item.status)}</div>
                </div>
                {(item.status === 'queued' || item.status === 'initiating_server_download' || item.status === 'server_downloading') && (
                     <Progress value={item.progress} className="h-2 mb-2 [&>div]:bg-accent" />
                )}
                {item.status === 'server_download_ready' && (
                     <Progress value={100} className="h-2 mb-2 [&>div]:bg-green-500" />
                )}

                <div className="flex justify-end items-center gap-2">
                  <span className="text-xs text-muted-foreground mr-auto">
                    {item.status === 'server_download_ready' ? 'Ready for ZIP' :
                     item.status === 'initiating_server_download' ? 'Starting...' :
                     item.status === 'error' ? 'Failed' :
                     item.status === 'paused' ? 'Paused' :
                     item.status.replace(/_/g, ' ')}
                    { (item.status !== 'server_download_ready' && item.status !== 'error' && item.status !== 'paused' && item.status !== 'queued' && item.status !== 'initiating_server_download') && ` - ${item.progress.toFixed(0)}%`}
                  </span>

                  {(item.status === 'initiating_server_download' || item.status === 'server_downloading') && (
                    <Button variant="ghost" size="icon" onClick={() => handlePause(item.id)} className="h-7 w-7" title="Pause Download (Simulated)">
                      <PauseCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {(item.status === 'paused' || item.status === 'error') && (
                     <Button variant="ghost" size="icon" onClick={() => handleResume(item)} className="h-7 w-7" title={item.status === 'error' ? 'Retry Download' : 'Resume Download'}>
                      <PlayCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {(item.status !== 'server_download_ready' && item.status !== 'completed') && (
                    <Button variant="ghost" size="icon" onClick={() => handleCancel(item.id)} className="h-7 w-7 text-destructive hover:text-destructive" title="Cancel & Remove">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            </div>
          </ScrollArea>
        )}
      </div>
      {downloadQueue.length > 0 && (
        <div className="border-t p-4 space-y-2 flex-col items-stretch">
            <div className="flex justify-between items-center text-sm mb-1">
                <span>Overall Server Readiness (All Queued Items)</span>
                <span className="font-semibold text-accent">{totalProgress.toFixed(0)}%</span>
            </div>
            <Progress value={totalProgress} className="h-3 [&>div]:bg-primary" />
             {downloadQueue.some(item => item.status === 'server_download_ready' || item.status === 'completed' || item.status === 'error') && (
              <Button onClick={handleClearCompleted} variant="outline" size="sm" className="w-full mt-2">
                <Trash2 className="mr-2 h-4 w-4" /> Clear Finished/Failed
              </Button>
            )}
        </div>
      )}
    </div>
  );
}

function DownloadCloudIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 17-4 4-4-4" />
    </svg>
  )
}
