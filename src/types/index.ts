export interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: string; 
  uploadDate: string; 
  viewCount: string; 
  channelName: string;
  playlist?: string; 
  availableQualities: string[];
  description?: string; // Added for more details if needed
}

export interface DownloadItem extends Video {
  selectedQuality: string;
  progress: number; // 0-100
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'error';
}

export interface AppSettings {
  apiKey: string;
  defaultQuality: string;
  downloadPathPreference: string; // e.g., "ask" or a default path
  concurrentDownloads: number;
}
