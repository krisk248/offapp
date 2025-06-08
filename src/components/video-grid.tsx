"use client";

import { useAppContext } from '@/store/app-context';
import VideoCard from './video-card';
import { Skeleton } from '@/components/ui/skeleton';

export default function VideoGrid() {
  const { state } = useAppContext();
  const { videos, isLoadingVideos } = state;

  if (isLoadingVideos) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <Skeleton className="h-[180px] w-full rounded-t-lg" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <div className="p-4 flex justify-between">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p className="text-lg">No videos found for this channel.</p>
        <p className="text-sm">Please check your API key or channel ID in settings.</p>
      </div>
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
