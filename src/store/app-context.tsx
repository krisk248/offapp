

"use client";

import type { Video, DownloadItem, AppSettings, YouTubePlaylist } from '@/types';
import React, { createContext, useContext, useReducer, ReactNode, Dispatch, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { extractChannelHandle, fetchChannelDetails, fetchChannelPlaylists, fetchPlaylistItems } from '@/lib/youtube';

interface AppState {
  videos: Video[];
  playlists: YouTubePlaylist[];
  selectedPlaylistId: string | null; 
  selectedVideos: Set<string>;
  globalQuality: string;
  videoQualities: Record<string, string>; 
  settings: AppSettings; // Simplified settings
  downloadQueue: DownloadItem[];
  isLoadingVideos: boolean;
  isLoadingPlaylists: boolean;
  channelName: string; 
  channelId: string | null; 
  uploadsPlaylistId: string | null; 
  envVarsLoaded: boolean; // To track if env vars have been processed
  apiKey?: string; // Loaded from env
  channelUrl?: string; // Loaded from env
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
  // | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> } // Simplified/removed if no UI settings
  | { type: 'SET_ENV_CONFIG'; payload: { apiKey?: string, channelUrl?: string } }
  | { type: 'SET_CHANNEL_INFO'; payload: { id: string | null; uploadsPlaylistId: string | null; title: string } }
  | { type: 'ADD_TO_DOWNLOAD_QUEUE'; payload: Video[] }
  | { type: 'INITIATE_SERVER_DOWNLOAD_SUCCESS'; payload: { videoId: string; downloadUrl: string; filename: string } }
  | { type: 'INITIATE_SERVER_DOWNLOAD_FAILURE'; payload: { videoId: string; error: string } }
  | { type: 'UPDATE_DOWNLOAD_PROGRESS'; payload: { videoId: string; progress: number } }
  | { type: 'SET_DOWNLOAD_ITEM_STATUS'; payload: { videoId: string; status: DownloadItem['status']; errorMessage?: string; downloadUrl?: string; filename?: string} }
  | { type: 'REMOVE_FROM_DOWNLOAD_QUEUE'; payload: string } 
  | { type: 'CLEAR_COMPLETED_DOWNLOADS' };

const initialState: AppState = {
  videos: [],
  playlists: [],
  selectedPlaylistId: null, 
  selectedVideos: new Set(),
  globalQuality: '480p', // Default to 480p
  videoQualities: {},
  settings: {
    defaultQuality: '480p', // Default quality setting
    downloadPathPreference: '/Downloads/OfflineTube', 
    concurrentDownloads: 2, 
  },
  downloadQueue: [],
  isLoadingVideos: false, 
  isLoadingPlaylists: false,
  channelName: 'Dushyath Youtube Downloader', 
  channelId: null,
  uploadsPlaylistId: null,
  envVarsLoaded: false,
  // apiKey and channelUrl will be loaded from process.env
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
      // Ensure settings.defaultQuality is also updated if globalQuality is the source of truth for it
      return { ...state, globalQuality: action.payload, settings: {...state.settings, defaultQuality: action.payload} };
    case 'SET_VIDEO_QUALITY':
      return {
        ...state,
        videoQualities: {
          ...state.videoQualities,
          [action.payload.videoId]: action.payload.quality,
        },
      };
    case 'SET_ENV_CONFIG':
      console.log('[App Context] ENV Config loaded:', {apiKeyExists: !!action.payload.apiKey, channelUrlExists: !!action.payload.channelUrl});
      return {
        ...state,
        apiKey: action.payload.apiKey,
        channelUrl: action.payload.channelUrl,
        envVarsLoaded: true,
        // Reset channel specific data if URL changed (though env vars change less often)
        channelId: null,
        uploadsPlaylistId: null,
        channelName: 'Dushyath Youtube Downloader',
        videos: [],
        playlists: [],
        selectedPlaylistId: null,
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
          status: 'queued', 
        }));
      if (newItems.length > 0) {
        console.log(`[App Context Download Queue] Added ${newItems.length} items to client queue:`, newItems.map(i => i.title));
      }
      return { ...state, downloadQueue: [...state.downloadQueue, ...newItems] };
    }
    case 'INITIATE_SERVER_DOWNLOAD_SUCCESS': {
      console.log(`[App Context] Server download initiated for ${action.payload.videoId}. URL: ${action.payload.downloadUrl}, Filename: ${action.payload.filename}`);
      return {
        ...state,
        downloadQueue: state.downloadQueue.map(item =>
          item.id === action.payload.videoId
            ? { ...item, status: 'server_download_ready', downloadUrl: action.payload.downloadUrl, filename: action.payload.filename, progress: 100 } 
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
    case 'UPDATE_DOWNLOAD_PROGRESS': { 
      const { videoId, progress } = action.payload;
      return {
        ...state,
        downloadQueue: state.downloadQueue.map(item =>
          item.id === videoId && item.status === 'server_downloading' 
            ? { ...item, progress }
            : item
        ),
      };
    }
    case 'SET_DOWNLOAD_ITEM_STATUS': {
      const { videoId, status, errorMessage, downloadUrl, filename } = action.payload;
      const item = state.downloadQueue.find(i => i.id === videoId);
      if(item) {
        console.log(`[App Context Download Status] Video: "${item.title}" (${videoId}), Status changed to: ${status}`);
      }
      return {
        ...state,
        downloadQueue: state.downloadQueue.map(item =>
          item.id === videoId
            ? { ...item, status: status, errorMessage: errorMessage, downloadUrl: downloadUrl ?? item.downloadUrl, filename: filename ?? item.filename, progress: status === 'server_download_ready' ? 100 : status === 'error' ? 0 : item.progress }
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
        const completedCount = state.downloadQueue.filter(item => item.status === 'server_download_ready' || item.status === 'completed' || item.status === 'error').length;
        if (completedCount > 0) {
            console.log(`[App Context Download Queue] Cleared ${completedCount} items considered finished/failed.`);
        }
        return {
            ...state,
            downloadQueue: state.downloadQueue.filter(item => item.status !== 'server_download_ready' && item.status !== 'completed' && item.status !== 'error')
        };
    }
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: Dispatch<Action>;
  initiateServerDownload: (video: DownloadItem) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { toast } = useToast();

  useEffect(() => {
    // Load API Key and Channel URL from .env file (client-side)
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    const channelUrl = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL;
    dispatch({ type: 'SET_ENV_CONFIG', payload: { apiKey, channelUrl } });
  }, []);


  const fetchAndSetChannelData = useCallback(async () => {
    if (!state.apiKey || !state.channelUrl) {
      if(state.envVarsLoaded){ // Only show toast if env vars were attempted to be loaded
         // Toast is handled by VideoGrid now
      }
      dispatch({ type: 'SET_CHANNEL_INFO', payload: { id: null, uploadsPlaylistId: null, title: 'Dushyath Youtube Downloader' } });
      dispatch({ type: 'SET_PLAYLISTS', payload: [] });
      dispatch({ type: 'SET_VIDEOS', payload: [] });
      return;
    }

    const channelHandleOrId = extractChannelHandle(state.channelUrl);
    if (!channelHandleOrId) {
      toast({ title: 'Invalid Channel URL', description: 'Could not parse channel ID or handle from URL in .env file.', variant: 'destructive' });
      dispatch({ type: 'SET_CHANNEL_INFO', payload: { id: null, uploadsPlaylistId: null, title: 'Dushyath Youtube Downloader' } });
      return;
    }
    
    // Fetch only if channelId is not set, or if env vars have been freshly loaded and might indicate a change.
    if (!state.channelId || !state.uploadsPlaylistId) {
        dispatch({ type: 'SET_LOADING_PLAYLISTS', payload: true }); 
        dispatch({ type: 'SET_LOADING_VIDEOS', payload: true });
        console.log(`[App Context] Fetching channel details for: ${channelHandleOrId}`);
        try {
            const channelInfo = await fetchChannelDetails(state.apiKey, channelHandleOrId);
            if (channelInfo) {
                dispatch({ type: 'SET_CHANNEL_INFO', payload: channelInfo });
            } else {
                toast({ title: 'Channel Not Found', description: 'Could not fetch channel details with provided API Key and Channel URL.', variant: 'destructive' });
                dispatch({ type: 'SET_CHANNEL_INFO', payload: { id: null, uploadsPlaylistId: null, title: 'Dushyath Youtube Downloader' } });
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
  }, [state.apiKey, state.channelUrl, state.channelId, state.uploadsPlaylistId, state.envVarsLoaded, toast]);


  useEffect(() => {
    if(state.envVarsLoaded) { // Ensure env vars are loaded before trying to fetch channel data
        fetchAndSetChannelData();
    }
  }, [state.envVarsLoaded, fetchAndSetChannelData]);


  useEffect(() => {
    const fetchPlaylists = async () => {
      if (state.apiKey && state.channelId && (state.playlists.length === 0 || !state.selectedPlaylistId)) { 
        dispatch({ type: 'SET_LOADING_PLAYLISTS', payload: true });
        console.log(`[App Context] Fetching playlists for channel ID: ${state.channelId}`);
        try {
          const playlistsData = await fetchChannelPlaylists(state.apiKey, state.channelId);
          dispatch({ type: 'SET_PLAYLISTS', payload: playlistsData });
        } catch (error: any) {
          toast({ title: 'API Error (Playlists)', description: error.message || 'Failed to fetch playlists.', variant: 'destructive' });
          console.error('[App Context] API Error (Playlists):', error);
          dispatch({ type: 'SET_LOADING_PLAYLISTS', payload: false });
        }
      }
    };
    if(state.channelId && state.apiKey) fetchPlaylists();
  }, [state.apiKey, state.channelId, state.playlists.length, state.selectedPlaylistId, toast]);


  useEffect(() => {
    const fetchVideos = async () => {
      if (state.apiKey && (state.uploadsPlaylistId || state.selectedPlaylistId)) {
        const playlistToFetch = state.selectedPlaylistId || state.uploadsPlaylistId;
        if (!playlistToFetch) return;

        dispatch({ type: 'SET_LOADING_VIDEOS', payload: true });
        console.log(`[App Context] Fetching videos for playlist ID: ${playlistToFetch}`);
        try {
          const videosData = await fetchPlaylistItems(state.apiKey, playlistToFetch, 50); 
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
      } else if (state.envVarsLoaded && (!state.apiKey || !state.channelUrl)) {
          dispatch({ type: 'SET_VIDEOS', payload: [] });
      }
    };
    if (state.envVarsLoaded && state.apiKey && (state.uploadsPlaylistId || state.selectedPlaylistId)) {
        fetchVideos();
    }
  }, [state.apiKey, state.channelUrl, state.uploadsPlaylistId, state.selectedPlaylistId, state.playlists, toast, state.envVarsLoaded]);

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
        toast({ title: 'Download Request Sent', description: `${video.title} is being prepared by the server.` });
        // The API now includes filename
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

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

