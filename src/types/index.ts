
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
  filename?: string; // Added filename, will be provided by server
  errorMessage?: string;      
}

export interface AppSettings {
  // apiKey: string; // Removed, will use env var
  // channelUrl: string; // Removed, will use env var
  defaultQuality: string; // Will be '480p' by default
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

