
export interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: string;
  uploadDate: string;
  viewCount: string;
  channelName: string;
  playlist?: string;
  playlistId?: string;
  availableQualities: string[];
  description?: string;
  publishedAt: string;
}

export interface VideoPage {
  videos: Video[];
  nextPageToken?: string;
  prevPageToken?: string;
  totalResults?: number;
  resultsPerPage?: number;
}

export interface DownloadItem extends Video {
  selectedQuality: string;
  progress: number;
  status:
    | 'queued'
    | 'initiating_server_download'
    | 'server_downloading'
    | 'server_download_ready'
    | 'error'
    | 'paused'
    | 'completed';
  downloadUrl?: string;
  filename?: string;
  errorMessage?: string;
}

export interface AppSettings {
  defaultQuality: string;
  downloadPathPreference: string;
  concurrentDownloads: number;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  itemCount?: number;
  publishedAt?: string;
}
