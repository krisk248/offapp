
"use client";

import type { Video, DownloadItem, AppSettings, YouTubePlaylist } from '@/types';
import React, { createContext, useContext, useReducer, ReactNode, Dispatch, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { extractChannelHandle, fetchChannelDetails, fetchChannelPlaylists, fetchPlaylistItems } from '@/lib/youtube';

// --- State & Actions ---
interface AppState {
  videos: Video[];
  playlists: YouTubePlaylist[];
  selectedPlaylistId: string | null; // ID of the currently selected playlist to filter videos
  selectedVideos: Set<string>;
  globalQuality: string;
  videoQualities: Record<string, string>; // videoId -> quality
  settings: AppSettings;
  downloadQueue: DownloadItem[];
  isLoadingVideos: boolean;
  isLoadingPlaylists: boolean;
  channelName: string; // Fetched from API
  channelId: string | null; // Fetched from API
  uploadsPlaylistId: string | null; // Fetched from API
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
  | { type: 'ADD_TO_DOWNLOAD_QUEUE'; payload: Video[] }
  | { type: 'UPDATE_DOWNLOAD_PROGRESS'; payload: { videoId: string; progress: number } }
  | { type: 'SET_DOWNLOAD_ITEM_STATUS'; payload: { videoId: string; status: DownloadItem['status'] } }
  | { type: 'REMOVE_FROM_DOWNLOAD_QUEUE'; payload: string } // videoId
  | { type: 'CLEAR_COMPLETED_DOWNLOADS' };


const initialState: AppState = {
  videos: [],
  playlists: [],
  selectedPlaylistId: null, // No playlist selected by default
  selectedVideos: new Set(),
  globalQuality: '720p',
  videoQualities: {},
  settings: {
    apiKey: '',
    channelUrl: '', // e.g. https://www.youtube.com/@RamayanaForUs
    defaultQuality: '720p',
    downloadPathPreference: '/Downloads/OfflineTube',
    concurrentDownloads: 2,
  },
  downloadQueue: [],
  isLoadingVideos: false, // Initially false, true when fetching
  isLoadingPlaylists: false,
  channelName: 'OfflineTube', // Default, will be updated from API
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
      return { ...state, selectedPlaylistId: action.payload, isLoadingVideos: true }; // Set loading true to trigger video fetch for playlist
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
      console.log('Updating settings:', action.payload);
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
      console.log('Channel info set:', action.payload);
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
        console.log(`[Download Queue] Added ${newItems.length} items:`, newItems.map(i => i.title));
      }
      return { ...state, downloadQueue: [...state.downloadQueue, ...newItems] };
    }
    case 'UPDATE_DOWNLOAD_PROGRESS': {
      const { videoId, progress } = action.payload;
      const item = state.downloadQueue.find(i => i.id === videoId);
      if (item) {
        console.log(`[Download Progress] Video: "${item.title}" (${videoId}), Progress: ${progress}%`);
        if (progress === 100) {
           console.log(`[Download Complete] Video: "${item.title}" (${videoId})`);
        }
      }
      return {
        ...state,
        downloadQueue: state.downloadQueue.map(item =>
          item.id === videoId
            ? { ...item, progress: progress, status: progress === 100 ? 'completed' : item.status === 'queued' ? 'downloading' : item.status }
            : item
        ),
      };
    }
    case 'SET_DOWNLOAD_ITEM_STATUS': {
      const { videoId, status } = action.payload;
      const item = state.downloadQueue.find(i => i.id === videoId);
      if(item) {
        console.log(`[Download Status] Video: "${item.title}" (${videoId}), Status changed to: ${status}`);
      }
      return {
        ...state,
        downloadQueue: state.downloadQueue.map(item =>
          item.id === videoId
            ? { ...item, status: status }
            : item
        ),
      };
    }
    case 'REMOVE_FROM_DOWNLOAD_QUEUE': {
        const item = state.downloadQueue.find(i => i.id === action.payload);
        if(item) {
          console.log(`[Download Queue] Removed: "${item.title}" (${action.payload})`);
        }
        return {
            ...state,
            downloadQueue: state.downloadQueue.filter(item => item.id !== action.payload)
        };
    }
    case 'CLEAR_COMPLETED_DOWNLOADS': {
        const completedCount = state.downloadQueue.filter(item => item.status === 'completed').length;
        if (completedCount > 0) {
            console.log(`[Download Queue] Cleared ${completedCount} completed downloads.`);
        }
        return {
            ...state,
            downloadQueue: state.downloadQueue.filter(item => item.status !== 'completed')
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
        localStorage.setItem('prevChannelUrl', state.settings.channelUrl); // Store current URL to compare
        dispatch({ type: 'SET_LOADING_PLAYLISTS', payload: true }); 
        dispatch({ type: 'SET_LOADING_VIDEOS', payload: true });
        console.log(`Fetching channel details for: ${channelHandleOrId}`);
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
            console.error('API Error (Channel):', error);
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
        console.log(`Fetching playlists for channel ID: ${state.channelId}`);
        try {
          const playlistsData = await fetchChannelPlaylists(state.settings.apiKey, state.channelId);
          dispatch({ type: 'SET_PLAYLISTS', payload: playlistsData });
        } catch (error: any) {
          toast({ title: 'API Error (Playlists)', description: error.message || 'Failed to fetch playlists.', variant: 'destructive' });
          console.error('API Error (Playlists):', error);
          dispatch({ type: 'SET_LOADING_PLAYLISTS', payload: false });
        }
      }
    };
    if(state.channelId) fetchPlaylists(); // Ensure channelId is present before fetching
  }, [state.settings.apiKey, state.channelId, state.playlists.length, state.settings.channelUrl, toast]);


  useEffect(() => {
    const fetchVideos = async () => {
      if (state.settings.apiKey && (state.uploadsPlaylistId || state.selectedPlaylistId)) {
        const playlistToFetch = state.selectedPlaylistId || state.uploadsPlaylistId;
        if (!playlistToFetch) return;

        // Check if videos for this playlist are already loaded to avoid refetch unless playlist changes
        const currentPlaylistKey = playlistToFetch;
        const previousPlaylistKey = localStorage.getItem('currentVideosPlaylistKey');

        if (state.videos.length > 0 && currentPlaylistKey === previousPlaylistKey && !state.isLoadingVideos) {
            // Videos for this context are already loaded and not currently forced to reload
            // console.log("Videos for playlist already loaded, skipping refetch:", playlistToFetch);
            return;
        }
        localStorage.setItem('currentVideosPlaylistKey', currentPlaylistKey);


        dispatch({ type: 'SET_LOADING_VIDEOS', payload: true });
        console.log(`Fetching videos for playlist ID: ${playlistToFetch}`);
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
          console.error('API Error (Videos):', error);
          dispatch({ type: 'SET_LOADING_VIDEOS', payload: false });
        }
      } else if (!state.settings.apiKey || !state.settings.channelUrl) {
          // Clear videos if no API key or channel URL
          dispatch({ type: 'SET_VIDEOS', payload: [] });
          localStorage.removeItem('currentVideosPlaylistKey');
      }
    };
    if(state.uploadsPlaylistId || state.selectedPlaylistId) fetchVideos(); // Ensure some playlist ID is available
  }, [state.settings.apiKey, state.settings.channelUrl, state.uploadsPlaylistId, state.selectedPlaylistId, state.playlists, toast, state.videos.length, state.isLoadingVideos ]);


  // Simulate download progress
  useEffect(() => {
    const activeDownloadSlots = state.settings.concurrentDownloads;
    let currentlyDownloadingCount = state.downloadQueue.filter(item => item.status === 'downloading').length;

    state.downloadQueue.forEach(item => {
      // Start new downloads if slots are available and item is queued
      if (item.status === 'queued' && currentlyDownloadingCount < activeDownloadSlots) {
        dispatch({ type: 'SET_DOWNLOAD_ITEM_STATUS', payload: { videoId: item.id, status: 'downloading' }});
        currentlyDownloadingCount++;
      }

      // Process items that are 'downloading'
      if (item.status === 'downloading' && item.progress < 100) {
        const intervalId = `downloadInterval_${item.id}`;
        // Clear existing interval for this item if any, to avoid multiple intervals
        const existingInterval = (window as any)[intervalId];
        if (existingInterval) {
          clearInterval(existingInterval);
        }

        // Set a new interval
        (window as any)[intervalId] = setInterval(() => {
          // Check if item still exists and is downloading before updating progress
          const currentItemState = state.downloadQueue.find(i => i.id === item.id);
          if (currentItemState && currentItemState.status === 'downloading' && currentItemState.progress < 100) {
            dispatch({
              type: 'UPDATE_DOWNLOAD_PROGRESS',
              payload: { videoId: item.id, progress: Math.min(currentItemState.progress + 2, 100) }, // Slower progress step
            });
          } else {
            // If item completed or status changed, clear interval
            clearInterval((window as any)[intervalId]);
            delete (window as any)[intervalId];
            if (currentItemState && currentItemState.progress === 100 && currentItemState.status !== 'completed') {
                dispatch({type: 'SET_DOWNLOAD_ITEM_STATUS', payload: { videoId: item.id, status: 'completed' }});
            }
          }
        }, 300); // Slower interval
      }
    });

    // Cleanup: clear intervals for items no longer in queue or not downloading
    return () => {
      state.downloadQueue.forEach(item => {
        const intervalId = `downloadInterval_${item.id}`;
        if ((window as any)[intervalId]) {
          clearInterval((window as any)[intervalId]);
          delete (window as any)[intervalId];
        }
      });
    };
  }, [state.downloadQueue, state.settings.concurrentDownloads, dispatch]); // Re-run if queue or settings change


  return (
    <AppContext.Provider value={{ state, dispatch }}>
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

