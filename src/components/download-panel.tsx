"use client";

import { useAppContext } from '@/store/app-context';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Download, PauseCircle, PlayCircle, Trash2, XCircle, CheckCircle, Clock } from 'lucide-react';
import type { DownloadItem } from '@/types';
import Image from 'next/image';

export default function DownloadPanel() {
  const { state, dispatch } = useAppContext();
  const { downloadQueue } = state;

  const handlePause = (videoId: string) => {
    dispatch({ type: 'SET_DOWNLOAD_ITEM_STATUS', payload: { videoId, status: 'paused' } });
    // Actual pause logic for yt-dlp would go here
  };

  const handleResume = (videoId: string) => {
    dispatch({ type: 'SET_DOWNLOAD_ITEM_STATUS', payload: { videoId, status: 'queued' } }); // Re-queue to be picked up by simulator
    // Actual resume logic
  };

  const handleCancel = (videoId: string) => {
    dispatch({ type: 'REMOVE_FROM_DOWNLOAD_QUEUE', payload: videoId });
    // Actual cancellation logic
  };
  
  const handleClearCompleted = () => {
    dispatch({type: 'CLEAR_COMPLETED_DOWNLOADS'});
  }

  const getStatusIcon = (status: DownloadItem['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'downloading':
        return <Download className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'paused':
        return <PauseCircle className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };
  
  const totalProgress = downloadQueue.length > 0 
    ? downloadQueue.reduce((acc, item) => acc + item.progress, 0) / downloadQueue.length
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
          <ScrollArea className="h-full p-1"> {/* Adjust max height as needed */}
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
                  </div>
                   <div className="flex-shrink-0">{getStatusIcon(item.status)}</div>
                </div>
                <Progress value={item.progress} className="h-2 mb-2 [&>div]:bg-accent" />
                <div className="flex justify-end items-center gap-2">
                  <span className="text-xs text-muted-foreground mr-auto">{item.progress}% - {item.status}</span>
                  {item.status === 'downloading' && (
                    <Button variant="ghost" size="icon" onClick={() => handlePause(item.id)} className="h-7 w-7">
                      <PauseCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {item.status === 'paused' && (
                     <Button variant="ghost" size="icon" onClick={() => handleResume(item.id)} className="h-7 w-7">
                      <PlayCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {(item.status === 'queued' || item.status === 'paused' || item.status === 'error') && (
                    <Button variant="ghost" size="icon" onClick={() => handleCancel(item.id)} className="h-7 w-7 text-destructive hover:text-destructive">
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
                <span>Overall Progress</span>
                <span className="font-semibold text-accent">{totalProgress.toFixed(0)}%</span>
            </div>
            <Progress value={totalProgress} className="h-3 [&>div]:bg-primary" />
             {downloadQueue.some(item => item.status === 'completed') && (
              <Button onClick={handleClearCompleted} variant="outline" size="sm" className="w-full mt-2">
                <Trash2 className="mr-2 h-4 w-4" /> Clear Completed
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
