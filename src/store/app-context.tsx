
"use client";

import type { Video, DownloadItem, AppSettings, YouTubePlaylist } from '@/types';
import React, { createContext, useContext, useReducer, ReactNode, Dispatch, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { extractChannelHandle, fetchChannelDetails, fetchChannelPlaylists, fetchPlaylistItems } from '@/lib/youtube';

// --- State & Actions ---
interface AppState {
  videos: Video[];
  playlists: YouTubePlaylist[];
  selectedPlaylistId: string | null; 
  selectedVideos: Set<string>;
  globalQuality: string;
  videoQualities: Record<string, string>; 
  settings: AppSettings;
  downloadQueue: DownloadItem[];
  isLoadingVideos: boolean;
  isLoadingPlaylists: boolean;
  channelName: string; 
  channelId: string | null; 
  uploadsPlaylistId: string | null; 
}

type Action =
  | { type: 'SET_VIDEOS'; payload: Video[] }
  | { type: 'SET_LOADING_VIDEOS'; payload: boolean }
  | { type: 'SET_PLAYLISTS'; payload: YouTubePlaylist[] }
  | { type: 'SET_LOADING_PLAYLISTS'; payload: boolean }
  | { type: 'SET_SELECTED_PLAYLIST_ID'; payload: string | null }
  | { type: 'TOGGLE_SELECT_VIDEO'; payload: string }
  | { type: 'SELECT_ALL_VIDEOS' }
  | { type: 'DESELECT_ALL_VIDEOS' }
  | { type: 'SET_GLOBAL_QUALITY'; payload: string }
  | { type: 'SET_VIDEO_QUALITY'; payload: { videoId: string; quality: string } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_CHANNEL_INFO'; payload: { id: string | null; uploadsPlaylistId: string | null; title: string } }
  | { type: 'ADD_TO_DOWNLOAD_QUEUE'; payload: Video[] } // Videos to be processed for download
  | { type: 'INITIATE_SERVER_DOWNLOAD_SUCCESS'; payload: { videoId: string; downloadUrl: string; filename: string } }
  | { type: 'INITIATE_SERVER_DOWNLOAD_FAILURE'; payload: { videoId: string; error: string } }
  | { type: 'UPDATE_DOWNLOAD_PROGRESS'; payload: { videoId: string; progress: number } } // For client-side simulation or future server push
  | { type: 'SET_DOWNLOAD_ITEM_STATUS'; payload: { videoId: string; status: DownloadItem['status']; errorMessage?: string; downloadUrl?: string } }
  | { type: 'REMOVE_FROM_DOWNLOAD_QUEUE'; payload: string } 
  | { type: 'CLEAR_COMPLETED_DOWNLOADS' };


const initialState: AppState = {
  videos: [],
  playlists: [],
  selectedPlaylistId: null, 
  selectedVideos: new Set(),
  globalQuality: '720p',
  videoQualities: {},
  settings: {
    apiKey: '',
    channelUrl: '', 
    defaultQuality: '720p',
    downloadPathPreference: '/Downloads/OfflineTube', // Potentially for server path
    concurrentDownloads: 2, // How many downloads the frontend will *initiate* concurrently
  },
  downloadQueue: [],
  isLoadingVideos: false, 
  isLoadingPlaylists: false,
  channelName: 'OfflineTube', 
  channelId: null,
  uploadsPlaylistId: null,
};


function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIDEOS':
      return { ...state, videos: action.payload, isLoadingVideos: false };
    case 'SET_LOADING_VIDEOS':
      return { ...state, isLoadingVideos: action.payload };
    case 'SET_PLAYLISTS':
      return { ...state, playlists: action.payload, isLoadingPlaylists: false };
    case 'SET_LOADING_PLAYLISTS':
      return { ...state, isLoadingPlaylists: action.payload };
    case 'SET_SELECTED_PLAYLIST_ID':
      return { ...state, selectedPlaylistId: action.payload, isLoadingVideos: true };
    case 'TOGGLE_SELECT_VIDEO': {
      const newSelectedVideos = new Set(state.selectedVideos);
      if (newSelectedVideos.has(action.payload)) {
        newSelectedVideos.delete(action.payload);
      } else {
        newSelectedVideos.add(action.payload);
      }
      return { ...state, selectedVideos: newSelectedVideos };
    }
    case 'SELECT_ALL_VIDEOS': {
      const allVideoIds = new Set(state.videos.map(v => v.id));
      return { ...state, selectedVideos: allVideoIds };
    }
    case 'DESELECT_ALL_VIDEOS':
      return { ...state, selectedVideos: new Set() };
    case 'SET_GLOBAL_QUALITY':
      return { ...state, globalQuality: action.payload, settings: {...state.settings, defaultQuality: action.payload} };
    case 'SET_VIDEO_QUALITY':
      return {
        ...state,
        videoQualities: {
          ...state.videoQualities,
          [action.payload.videoId]: action.payload.quality,
        },
      };
    case 'UPDATE_SETTINGS':
      console.log('[App Context] Updating settings:', action.payload);
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        globalQuality: action.payload.defaultQuality ?? state.globalQuality,
        channelId: action.payload.channelUrl !== state.settings.channelUrl ? null : state.channelId,
        uploadsPlaylistId: action.payload.channelUrl !== state.settings.channelUrl ? null : state.uploadsPlaylistId,
        channelName: action.payload.channelUrl !== state.settings.channelUrl ? 'OfflineTube' : state.channelName,
        videos: action.payload.channelUrl !== state.settings.channelUrl ? [] : state.videos,
        playlists: action.payload.channelUrl !== state.settings.channelUrl ? [] : state.playlists,
        selectedPlaylistId: action.payload.channelUrl !== state.settings.channelUrl ? null : state.selectedPlaylistId,
      };
    case 'SET_CHANNEL_INFO':
      console.log('[App Context] Channel info set:', action.payload);
      return {
        ...state,
        channelId: action.payload.id,
        uploadsPlaylistId: action.payload.uploadsPlaylistId,
        channelName: action.payload.title || 'Channel',
      };
    case 'ADD_TO_DOWNLOAD_QUEUE': {
      const newItems: DownloadItem[] = action.payload
        .filter(video => !state.downloadQueue.some(item => item.id === video.id)) 
        .map(video => ({
          ...video,
          selectedQuality: state.videoQualities[video.id] || state.globalQuality,
          progress: 0,
          status: 'queued', // Initial status before API call
        }));
      if (newItems.length > 0) {
        console.log(`[App Context Download Queue] Added ${newItems.length} items to client queue:`, newItems.map(i => i.title));
      }
      return { ...state, downloadQueue: [...state.downloadQueue, ...newItems] };
    }
    case 'INITIATE_SERVER_DOWNLOAD_SUCCESS': {
      console.log(`[App Context] Server download initiated for ${action.payload.videoId}. URL: ${action.payload.downloadUrl}`);
      return {
        ...state,
        downloadQueue: state.downloadQueue.map(item =>
          item.id === action.payload.videoId
            ? { ...item, status: 'server_download_ready', downloadUrl: action.payload.downloadUrl, progress: 100 } // Mark as ready
            : item
        ),
      };
    }
    case 'INITIATE_SERVER_DOWNLOAD_FAILURE': {
      console.error(`[App Context] Failed to initiate server download for ${action.payload.videoId}: ${action.payload.error}`);
      return {
        ...state,
        downloadQueue: state.downloadQueue.map(item =>
          item.id === action.payload.videoId
            ? { ...item, status: 'error', errorMessage: action.payload.error, progress: 0 }
            : item
        ),
      };
    }
    case 'UPDATE_DOWNLOAD_PROGRESS': { // Primarily for client-side simulation if needed, or future server push
      const { videoId, progress } = action.payload;
      // This might be used if we want to simulate server progress on client
      // For now, API call success implies server is handling it.
      return {
        ...state,
        downloadQueue: state.downloadQueue.map(item =>
          item.id === videoId && item.status === 'server_downloading' // Only update if in this specific state
            ? { ...item, progress }
            : item
        ),
      };
    }
    case 'SET_DOWNLOAD_ITEM_STATUS': {
      const { videoId, status, errorMessage, downloadUrl } = action.payload;
      const item = state.downloadQueue.find(i => i.id === videoId);
      if(item) {
        console.log(`[App Context Download Status] Video: "${item.title}" (${videoId}), Status changed to: ${status}`);
      }
      return {
        ...state,
        downloadQueue: state.downloadQueue.map(item =>
          item.id === videoId
            ? { ...item, status: status, errorMessage: errorMessage, downloadUrl: downloadUrl ?? item.downloadUrl, progress: status === 'server_download_ready' ? 100 : status === 'error' ? 0 : item.progress }
            : item
        ),
      };
    }
    case 'REMOVE_FROM_DOWNLOAD_QUEUE': {
        const item = state.downloadQueue.find(i => i.id === action.payload);
        if(item) {
          console.log(`[App Context Download Queue] Removed: "${item.title}" (${action.payload})`);
        }
        return {
            ...state,
            downloadQueue: state.downloadQueue.filter(item => item.id !== action.payload)
        };
    }
    case 'CLEAR_COMPLETED_DOWNLOADS': {
        // "completed" might mean server_download_ready and user has clicked link, or just server_download_ready
        const completedCount = state.downloadQueue.filter(item => item.status === 'server_download_ready' || item.status === 'completed').length;
        if (completedCount > 0) {
            console.log(`[App Context Download Queue] Cleared ${completedCount} items considered completed/ready.`);
        }
        return {
            ...state,
            downloadQueue: state.downloadQueue.filter(item => item.status !== 'server_download_ready' && item.status !== 'completed')
        };
    }
    default:
      return state;
  }
}

// --- Context ---
interface AppContextType {
  state: AppState;
  dispatch: Dispatch<Action>;
  initiateServerDownload: (video: DownloadItem) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// --- Provider ---
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { toast } = useToast();

  const fetchAndSetChannelData = useCallback(async () => {
    if (!state.settings.apiKey || !state.settings.channelUrl) {
      dispatch({ type: 'SET_CHANNEL_INFO', payload: { id: null, uploadsPlaylistId: null, title: 'OfflineTube' } });
      dispatch({ type: 'SET_PLAYLISTS', payload: [] });
      dispatch({ type: 'SET_VIDEOS', payload: [] });
      return;
    }

    const channelHandleOrId = extractChannelHandle(state.settings.channelUrl);
    if (!channelHandleOrId) {
      toast({ title: 'Invalid Channel URL', description: 'Could not parse channel ID or handle from URL.', variant: 'destructive' });
      dispatch({ type: 'SET_CHANNEL_INFO', payload: { id: null, uploadsPlaylistId: null, title: 'OfflineTube' } });
      return;
    }
    
    if (!state.channelId || !state.uploadsPlaylistId || state.settings.channelUrl !== localStorage.getItem('prevChannelUrl')) {
        localStorage.setItem('prevChannelUrl', state.settings.channelUrl); 
        dispatch({ type: 'SET_LOADING_PLAYLISTS', payload: true }); 
        dispatch({ type: 'SET_LOADING_VIDEOS', payload: true });
        console.log(`[App Context] Fetching channel details for: ${channelHandleOrId}`);
        try {
            const channelInfo = await fetchChannelDetails(state.settings.apiKey, channelHandleOrId);
            if (channelInfo) {
                dispatch({ type: 'SET_CHANNEL_INFO', payload: channelInfo });
            } else {
                toast({ title: 'Channel Not Found', description: 'Could not fetch channel details.', variant: 'destructive' });
                dispatch({ type: 'SET_CHANNEL_INFO', payload: { id: null, uploadsPlaylistId: null, title: 'OfflineTube' } });
                dispatch({ type: 'SET_LOADING_PLAYLISTS', payload: false });
                dispatch({ type: 'SET_LOADING_VIDEOS', payload: false });
            }
        } catch (error: any) {
            toast({ title: 'API Error (Channel)', description: error.message || 'Failed to fetch channel details.', variant: 'destructive' });
            console.error('[App Context] API Error (Channel):', error);
            dispatch({ type: 'SET_LOADING_PLAYLISTS', payload: false });
            dispatch({ type: 'SET_LOADING_VIDEOS', payload: false });
        }
    }
  }, [state.settings.apiKey, state.settings.channelUrl, state.channelId, state.uploadsPlaylistId, toast]);


  useEffect(() => {
    fetchAndSetChannelData();
  }, [fetchAndSetChannelData]);


  useEffect(() => {
    const fetchPlaylists = async () => {
      if (state.settings.apiKey && state.channelId && (state.playlists.length === 0 || state.settings.channelUrl !== localStorage.getItem('prevPlaylistsChannelUrl'))) { 
        localStorage.setItem('prevPlaylistsChannelUrl', state.settings.channelUrl);
        dispatch({ type: 'SET_LOADING_PLAYLISTS', payload: true });
        console.log(`[App Context] Fetching playlists for channel ID: ${state.channelId}`);
        try {
          const playlistsData = await fetchChannelPlaylists(state.settings.apiKey, state.channelId);
          dispatch({ type: 'SET_PLAYLISTS', payload: playlistsData });
        } catch (error: any) {
          toast({ title: 'API Error (Playlists)', description: error.message || 'Failed to fetch playlists.', variant: 'destructive' });
          console.error('[App Context] API Error (Playlists):', error);
          dispatch({ type: 'SET_LOADING_PLAYLISTS', payload: false });
        }
      }
    };
    if(state.channelId) fetchPlaylists();
  }, [state.settings.apiKey, state.channelId, state.playlists.length, state.settings.channelUrl, toast]);


  useEffect(() => {
    const fetchVideos = async () => {
      if (state.settings.apiKey && (state.uploadsPlaylistId || state.selectedPlaylistId)) {
        const playlistToFetch = state.selectedPlaylistId || state.uploadsPlaylistId;
        if (!playlistToFetch) return;

        const currentPlaylistKey = playlistToFetch;
        const previousPlaylistKey = localStorage.getItem('currentVideosPlaylistKey');

        if (state.videos.length > 0 && currentPlaylistKey === previousPlaylistKey && !state.isLoadingVideos) {
            return;
        }
        localStorage.setItem('currentVideosPlaylistKey', currentPlaylistKey);


        dispatch({ type: 'SET_LOADING_VIDEOS', payload: true });
        console.log(`[App Context] Fetching videos for playlist ID: ${playlistToFetch}`);
        try {
          const videosData = await fetchPlaylistItems(state.settings.apiKey, playlistToFetch, 50); 
          const currentPlaylist = state.playlists.find(p => p.id === playlistToFetch);
          
          const videosWithPlaylistContext = videosData.map(v => ({
            ...v,
            playlist: currentPlaylist && state.selectedPlaylistId ? currentPlaylist.title : undefined,
            playlistId: currentPlaylist && state.selectedPlaylistId ? currentPlaylist.id : undefined,
          }));

          dispatch({ type: 'SET_VIDEOS', payload: videosWithPlaylistContext });
        } catch (error: any) {
          toast({ title: 'API Error (Videos)', description: error.message || 'Failed to fetch videos.', variant: 'destructive' });
          console.error('[App Context] API Error (Videos):', error);
          dispatch({ type: 'SET_LOADING_VIDEOS', payload: false });
        }
      } else if (!state.settings.apiKey || !state.settings.channelUrl) {
          dispatch({ type: 'SET_VIDEOS', payload: [] });
          localStorage.removeItem('currentVideosPlaylistKey');
      }
    };
    if(state.uploadsPlaylistId || state.selectedPlaylistId) fetchVideos();
  }, [state.settings.apiKey, state.settings.channelUrl, state.uploadsPlaylistId, state.selectedPlaylistId, state.playlists, toast, state.videos.length, state.isLoadingVideos ]);

  const initiateServerDownload = useCallback(async (video: DownloadItem) => {
    if (!video || video.status === 'server_downloading' || video.status === 'server_download_ready') {
      console.log(`[App Context] Download for ${video.title} already in progress or ready.`);
      return;
    }

    dispatch({ type: 'SET_DOWNLOAD_ITEM_STATUS', payload: { videoId: video.id, status: 'initiating_server_download' } });
    console.log(`[App Context] Initiating server download for: ${video.title} (ID: ${video.id}), Quality: ${video.selectedQuality}`);

    try {
      const response = await fetch('/api/start-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          videoTitle: video.title,
          selectedQuality: video.selectedQuality,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({ title: 'Download Started', description: `${video.title} is being downloaded by the server.` });
        dispatch({ type: 'INITIATE_SERVER_DOWNLOAD_SUCCESS', payload: { videoId: video.id, downloadUrl: result.downloadUrl, filename: result.filename } });
      } else {
        console.error(`[App Context] API call to /start-download failed for ${video.id}:`, result.message);
        toast({ title: 'Download Error', description: result.message || 'Failed to start server download.', variant: 'destructive' });
        dispatch({ type: 'INITIATE_SERVER_DOWNLOAD_FAILURE', payload: { videoId: video.id, error: result.message || 'API request failed' } });
      }
    } catch (error: any) {
      console.error(`[App Context] Network or other error initiating download for ${video.id}:`, error);
      toast({ title: 'Download Request Error', description: error.message || 'Could not reach server.', variant: 'destructive' });
      dispatch({ type: 'INITIATE_SERVER_DOWNLOAD_FAILURE', payload: { videoId: video.id, error: error.message || 'Network error' } });
    }
  }, [toast, dispatch]);


  // Effect to process 'queued' items
  useEffect(() => {
    const queuedItems = state.downloadQueue.filter(item => item.status === 'queued');
    const currentlyDownloadingCount = state.downloadQueue.filter(
        item => item.status === 'initiating_server_download' || item.status === 'server_downloading'
    ).length;
    
    const availableSlots = state.settings.concurrentDownloads - currentlyDownloadingCount;

    if (queuedItems.length > 0 && availableSlots > 0) {
        queuedItems.slice(0, availableSlots).forEach(item => {
            initiateServerDownload(item);
        });
    }
  }, [state.downloadQueue, state.settings.concurrentDownloads, initiateServerDownload]);


  return (
    <AppContext.Provider value={{ state, dispatch, initiateServerDownload }}>
      {children}
    </AppContext.Provider>
  );
}

// --- Hook ---
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
