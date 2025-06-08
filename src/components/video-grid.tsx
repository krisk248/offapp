
"use client";

import { useAppContext } from '@/store/app-context';
import VideoCard from './video-card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function VideoGrid() {
  const { state, dispatch } = useAppContext();
  const {
    videos,
    isLoadingVideos,
    channelName,
    apiKey,
    channelUrl,
    envVarsLoaded,
    nextPageToken,
    prevPageToken,
    totalVideos,
    videosPerPage
  } = state;

  const handleNextPage = () => {
    if (nextPageToken) {
      // We set the currentPageToken to the nextPageToken, and then dispatch NAVIGATE_VIDEO_PAGE
      // The effect in AppContext will use this new currentPageToken to fetch.
      // This is a bit indirect but avoids passing the token directly through dispatch.
      dispatch({ type: 'SET_VIDEO_PAGE_DATA', payload: { videos: state.videos, nextPageToken: state.nextPageToken, prevPageToken: state.prevPageToken, currentPageToken: nextPageToken } });
      dispatch({ type: 'NAVIGATE_VIDEO_PAGE', payload: 'next' });
    }
  };

  const handlePrevPage = () => {
    if (prevPageToken) {
      // Similar to nextPage, set currentPageToken to prevPageToken before navigating
      dispatch({ type: 'SET_VIDEO_PAGE_DATA', payload: { videos: state.videos, nextPageToken: state.nextPageToken, prevPageToken: state.prevPageToken, currentPageToken: prevPageToken } });
      dispatch({ type: 'NAVIGATE_VIDEO_PAGE', payload: 'prev' });
    }
  };


  if (envVarsLoaded && (!apiKey || !channelUrl)) {
    return (
      <Alert variant="default" className="mt-6 border-primary/50 bg-primary/5">
        <AlertCircle className="h-5 w-5 text-primary" />
        <AlertTitle className="text-primary font-semibold">Configuration Needed</AlertTitle>
        <AlertDescription className="text-primary/90">
          Please create a <code className="font-mono bg-primary/10 px-1 py-0.5 rounded">.env</code> file in your project root and add your YouTube API Key and Channel URL:
          <pre className="mt-2 p-2 bg-black/80 text-white/90 rounded text-xs overflow-x-auto">
            {`NEXT_PUBLIC_YOUTUBE_API_KEY=YOUR_API_KEY_HERE\nNEXT_PUBLIC_YOUTUBE_CHANNEL_URL=YOUR_CHANNEL_URL_HERE`}
          </pre>
           Then, restart your development server.
        </AlertDescription>
      </Alert>
    );
  }


  if (isLoadingVideos && videos.length === 0) { // Show skeletons only if no videos are currently displayed
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: videosPerPage || 8 }).map((_, index) => ( // Use videosPerPage for skeleton count if available
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
      </div>
    );
  }

  if (envVarsLoaded && apiKey && channelUrl && videos.length === 0 && !isLoadingVideos) {
    return (
      <Alert variant="default" className="mt-6">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>No Videos Found</AlertTitle>
        <AlertDescription>
          No videos were found for the channel "{channelName || 'the configured channel'}".
          This could be due to:
          <ul className="list-disc list-inside mt-2 text-sm">
            <li>An incorrect API key or Channel URL in your <code className="font-mono text-xs">.env</code> file.</li>
            <li>The channel having no public videos or playlists.</li>
            <li>A temporary YouTube API issue.</li>
          </ul>
          Please check your <code className="font-mono text-xs">.env</code> file or try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!envVarsLoaded || !apiKey || !channelUrl) {
      return null;
  }

  // Calculate current page number (approximate)
  // This is tricky without knowing the exact previous items count without storing all page tokens
  // For simplicity, we'll just show next/prev.
  // const currentPage = (totalVideos && videosPerPage) ? Math.floor(videos.length / videosPerPage) + (prevPageToken ? 1 : 0) : 1;
  // This needs a more robust way to track page number if we want "Page X of Y"

  return (
    <div className="space-y-6">
      {isLoadingVideos && videos.length > 0 && (
          <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
              <div className="p-4 bg-card rounded-lg shadow-xl">Loading more videos...</div>
          </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
        {videos.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
      {(prevPageToken || nextPageToken) && (
        <div className="flex justify-center items-center space-x-4 pt-4 pb-2 border-t">
          <Button
            onClick={handlePrevPage}
            disabled={!prevPageToken || isLoadingVideos}
            variant="outline"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          <Button
            onClick={handleNextPage}
            disabled={!nextPageToken || isLoadingVideos}
            variant="outline"
          >
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
      {totalVideos && videosPerPage && videos.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {videos.length} videos. (Total approx. {totalVideos} videos in this list)
        </p>
      )}
    </div>
  );
}
