"use client";

import { useAppContext } from '@/store/app-context';
import VideoCard from './video-card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function VideoGrid() {
  const { state } = useAppContext();
  const { videos, isLoadingVideos, settings, channelName } = state;

  if (!settings.apiKey || !settings.channelUrl) {
    return (
      <Alert variant="default" className="mt-6 border-primary/50 bg-primary/5">
        <AlertCircle className="h-5 w-5 text-primary" />
        <AlertTitle className="text-primary font-semibold">Configuration Needed</AlertTitle>
        <AlertDescription className="text-primary/90">
          Please enter your YouTube API Key and Channel URL in the <strong className="font-medium">Settings</strong> (gear icon in the header) to load videos.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoadingVideos) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <Skeleton className="h-[180px] w-full rounded-t-lg" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <div className="p-4 flex justify-between items-center mt-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (videos.length === 0 && !isLoadingVideos) {
    return (
      <Alert variant="default" className="mt-6">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>No Videos Found</AlertTitle>
        <AlertDescription>
          No videos were found for the channel "{channelName || 'the configured channel'}".
          This could be due to:
          <ul className="list-disc list-inside mt-2 text-sm">
            <li>An incorrect API key or Channel URL.</li>
            <li>The channel having no public videos or playlists.</li>
            <li>A temporary YouTube API issue.</li>
          </ul>
          Please check your settings or try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
      {videos.map(video => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
