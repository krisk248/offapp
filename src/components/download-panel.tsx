
"use client";

import { useAppContext } from '@/store/app-context';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Download, PauseCircle, PlayCircle, Trash2, XCircle, CheckCircle, Clock, ExternalLink, ServerCrash } from 'lucide-react';
import type { DownloadItem } from '@/types';
import Image from 'next/image';

export default function DownloadPanel() {
  const { state, dispatch, initiateServerDownload } = useAppContext();
  const { downloadQueue } = state;

  const handlePause = (videoId: string) => {
    // Pausing a server-side yt-dlp process via frontend is complex and not implemented.
    // This could change status to 'paused' locally if we want to prevent new auto-starts.
    dispatch({ type: 'SET_DOWNLOAD_ITEM_STATUS', payload: { videoId, status: 'paused' } });
    console.log(`[Download Panel] Paused (simulated) for video ID: ${videoId}`);
  };

  const handleResume = (item: DownloadItem) => {
    // If it was 'paused' locally, and not yet started on server, or if server failed:
    if (item.status === 'paused' || item.status === 'error') {
        console.log(`[Download Panel] Resuming/Retrying download for: ${item.title}`);
        initiateServerDownload(item); // Re-trigger the API call
    } else {
        console.log(`[Download Panel] Resume called for item with status ${item.status}, no action taken.`);
    }
  };

  const handleCancel = (videoId: string) => {
    // Cancelling an in-progress yt-dlp on server is also complex.
    // This will remove it from the client queue. If it's downloading, server will continue.
    dispatch({ type: 'REMOVE_FROM_DOWNLOAD_QUEUE', payload: videoId });
    console.log(`[Download Panel] Canceled/Removed from queue: ${videoId}`);
  };
  
  const handleClearCompleted = () => {
    dispatch({type: 'CLEAR_COMPLETED_DOWNLOADS'});
  }

  const getStatusIcon = (status: DownloadItem['status']) => {
    switch (status) {
      case 'queued':
      case 'initiating_server_download':
        return <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />;
      case 'server_downloading': // This status might be brief as API responds on start
        return <Download className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'server_download_ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'paused':
        return <PauseCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <ServerCrash className="h-4 w-4 text-destructive" />; // Changed icon for server error
      case 'completed': // If we want a final "user downloaded" state
        return <CheckCircle className="h-4 w-4 text-green-700" />;
      default:
        return null;
    }
  };
  
  const totalProgress = downloadQueue.length > 0 
    ? downloadQueue.reduce((acc, item) => acc + (item.status === 'server_download_ready' || item.status === 'completed' ? 100 : item.progress), 0) / downloadQueue.length
    : 0;

  return (
    <Card className="shadow-lg rounded-lg flex flex-col max-h-[calc(100vh-200px)]">
      <CardHeader className="border-b">
        <CardTitle className="text-xl font-headline flex items-center">
          <Download className="mr-2 h-6 w-6 text-primary" />
          Download Queue
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-hidden">
        {downloadQueue.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground h-full flex flex-col justify-center items-center">
            <DownloadCloudIcon className="w-16 h-16 mb-4 text-gray-300" />
            <p>Your download queue is empty.</p>
            <p className="text-sm">Select videos and click download.</p>
          </div>
        ) : (
          <ScrollArea className="h-full p-1">
            <div className="space-y-3 p-3">
            {downloadQueue.map(item => (
              <div key={item.id} className="p-3 border rounded-md bg-background/50">
                <div className="flex items-center gap-3 mb-2">
                   <Image 
                    src={item.thumbnailUrl} 
                    alt={item.title} 
                    width={80} 
                    height={45} 
                    className="rounded object-cover aspect-video"
                    data-ai-hint="video thumbnail small"
                  />
                  <div className="flex-grow overflow-hidden">
                    <p className="text-sm font-medium truncate" title={item.title}>{item.title}</p>
                    <p className="text-xs text-muted-foreground">Quality: {item.selectedQuality}</p>
                    {item.status === 'error' && item.errorMessage && (
                        <p className="text-xs text-destructive truncate" title={item.errorMessage}>Error: {item.errorMessage}</p>
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
                    {item.status === 'server_download_ready' ? 'Ready to Download' : 
                     item.status === 'initiating_server_download' ? 'Starting...' :
                     item.status === 'error' ? 'Failed' :
                     item.status.replace(/_/g, ' ')} 
                    { (item.status !== 'server_download_ready' && item.status !== 'error') && ` - ${item.progress}%`}
                  </span>

                  {item.status === 'server_download_ready' && item.downloadUrl && (
                     <Button asChild variant="default" size="sm" className="h-7 bg-accent hover:bg-accent/90">
                        <a href={item.downloadUrl} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-1" /> Download Now
                        </a>
                     </Button>
                  )}
                  
                  {(item.status === 'initiating_server_download' || item.status === 'server_downloading') && (
                    <Button variant="ghost" size="icon" onClick={() => handlePause(item.id)} className="h-7 w-7" title="Pause (simulation)">
                      <PauseCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {(item.status === 'paused' || item.status === 'error') && (
                     <Button variant="ghost" size="icon" onClick={() => handleResume(item)} className="h-7 w-7" title={item.status === 'error' ? 'Retry Download' : 'Resume Download'}>
                      <PlayCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {(item.status !== 'server_download_ready' && item.status !== 'completed') && (
                    <Button variant="ghost" size="icon" onClick={() => handleCancel(item.id)} className="h-7 w-7 text-destructive hover:text-destructive" title="Cancel Download">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      {downloadQueue.length > 0 && (
        <CardFooter className="border-t p-4 space-y-2 flex-col items-stretch">
            <div className="flex justify-between items-center text-sm mb-1">
                <span>Overall Progress (Server Downloads)</span>
                <span className="font-semibold text-accent">{totalProgress.toFixed(0)}%</span>
            </div>
            <Progress value={totalProgress} className="h-3 [&>div]:bg-primary" />
             {downloadQueue.some(item => item.status === 'server_download_ready' || item.status === 'completed' || item.status === 'error') && (
              <Button onClick={handleClearCompleted} variant="outline" size="sm" className="w-full mt-2">
                <Trash2 className="mr-2 h-4 w-4" /> Clear Finished/Failed
              </Button>
            )}
        </CardFooter>
      )}
    </Card>
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
