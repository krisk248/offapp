"use client";

import Image from 'next/image';
import type { Video } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Download, CalendarDays, ListVideo } from 'lucide-react'; // Removed Clock, using CalendarDays
import { useAppContext } from '@/store/app-context';
import { cn } from '@/lib/utils';

interface VideoCardProps {
  video: Video;
}

export default function VideoCard({ video }: VideoCardProps) {
  const { state, dispatch } = useAppContext();
  const isSelected = state.selectedVideos.has(video.id);
  const currentQuality = state.videoQualities[video.id] || state.globalQuality;

  const handleSelectToggle = () => {
    dispatch({ type: 'TOGGLE_SELECT_VIDEO', payload: video.id });
  };

  const handleQualityChange = (quality: string) => {
    dispatch({ type: 'SET_VIDEO_QUALITY', payload: { videoId: video.id, quality } });
  };

  const handleDownloadSingle = () => {
    // Ensure the video being downloaded has its quality set if not already specific
    const videoToDownload = {
      ...video,
      selectedQuality: state.videoQualities[video.id] || state.globalQuality,
    };
    dispatch({ type: 'ADD_TO_DOWNLOAD_QUEUE', payload: [videoToDownload] });
  };
  
  const availableQualities = video.availableQualities?.length > 0 ? video.availableQualities : ['720p', '480p', '360p'];


  return (
    <Card className={cn("flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg", isSelected ? "ring-2 ring-primary" : "")}>
      <CardHeader className="p-0 relative">
        <Image
          src={video.thumbnailUrl || `https://placehold.co/600x338.png?text=No+Thumbnail`}
          alt={video.title}
          width={600}
          height={338} // approx 16:9
          className="w-full h-auto object-cover aspect-video transition-opacity duration-300 opacity-0"
          onLoadingComplete={(image) => image.classList.remove('opacity-0')}
          data-ai-hint="video thumbnail"
          unoptimized={video.thumbnailUrl?.includes('i.ytimg.com')} // Allow YouTube images
        />
        <Badge variant="secondary" className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
          {video.duration}
        </Badge>
        <div className="absolute top-2 left-2">
           <Checkbox
            id={`select-${video.id}`}
            checked={isSelected}
            onCheckedChange={handleSelectToggle}
            aria-label={`Select video ${video.title}`}
            className="bg-background/80 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground h-6 w-6 rounded"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-base font-headline font-semibold leading-tight mb-2 h-12 overflow-hidden" title={video.title}>
          {video.title.length > 60 ? video.title.substring(0, 57) + "..." : video.title}
        </CardTitle>
        <div className="text-xs text-muted-foreground space-y-1.5">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{video.uploadDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            <span>{video.viewCount}</span>
          </div>
          {video.playlist && ( // Show if video is associated with a playlist (via filtering)
            <div className="flex items-center gap-1.5" title={video.playlist}>
              <ListVideo className="h-3.5 w-3.5" />
              <span className="truncate">{video.playlist.length > 25 ? video.playlist.substring(0,22) + "..." : video.playlist}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-between">
         <Select value={currentQuality} onValueChange={handleQualityChange}>
            <SelectTrigger className="w-full sm:w-[120px] h-10 text-xs rounded-md">
              <SelectValue placeholder="Quality" />
            </SelectTrigger>
            <SelectContent>
              {availableQualities.map(q => (
                <SelectItem key={q} value={q} className="text-xs">{q}</SelectItem>
              ))}
               {!availableQualities.includes(currentQuality) && ( // If global quality isn't in video's specific list
                <SelectItem value={currentQuality} className="text-xs bg-muted">{currentQuality} (Global)</SelectItem>
              )}
            </SelectContent>
          </Select>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDownloadSingle}
          className="w-full sm:w-auto h-10 text-primary border-primary hover:bg-primary/10 hover:text-primary"
        >
          <Download className="mr-1.5 h-4 w-4" />
          Download
        </Button>
      </CardFooter>
    </Card>
  );
}
