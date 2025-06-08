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
  progress: number; // 0-100. For server downloads, this might represent stages or be simulated.
  status: 
    | 'queued'                // Initial state in client before API call
    | 'initiating_server_download' // Client called API, waiting for server response
    | 'server_downloading'    // Server confirmed yt-dlp started (or frontend simulates this)
    | 'server_download_ready' // Server downloaded file, downloadUrl is available
    | 'error'                 // Error occurred on client or server side
    | 'paused'                // Paused by user (future feature for server downloads)
    | 'completed';            // For client-side simulation, or if server confirms download AND client saves it.
  downloadUrl?: string;       // URL to download the file from the server (e.g., /downloads/videos/file.mp4)
  errorMessage?: string;      // Optional error message
}

export interface AppSettings {
  apiKey: string;
  channelUrl: string; 
  defaultQuality: string;
  downloadPathPreference: string; // This will now likely refer to a server path if used by backend
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
