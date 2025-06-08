export interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: string;
  uploadDate: string; // Should be formatted string e.g., "Jan 1, 2023" or "3 days ago"
  viewCount: string; // Should be formatted string e.g., "1.2M views"
  channelName: string;
  playlist?: string; // Name of the playlist it belongs to, if filtered by playlist
  playlistId?: string; // ID of the playlist it belongs to
  availableQualities: string[]; // This is hard to get from API, usually mocked or from yt-dlp
  description?: string;
  publishedAt: string; // ISO date string from API
}

export interface DownloadItem extends Video {
  selectedQuality: string;
  progress: number; // 0-100
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'error';
}

export interface AppSettings {
  apiKey: string;
  channelUrl: string; // Added for YouTube channel
  defaultQuality: string;
  downloadPathPreference: string;
  concurrentDownloads: number;
}

export interface YouTubePlaylist {
  id: string;
  title:string;
  description?: string;
  thumbnailUrl?: string;
  itemCount?: number;
  publishedAt?: string;
}
