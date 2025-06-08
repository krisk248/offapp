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
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        globalQuality: action.payload.defaultQuality ?? state.globalQuality,
        // Reset channel info if URL changes, to trigger refetch
        channelId: action.payload.channelUrl !== state.settings.channelUrl ? null : state.channelId,
        uploadsPlaylistId: action.payload.channelUrl !== state.settings.channelUrl ? null : state.uploadsPlaylistId,
        channelName: action.payload.channelUrl !== state.settings.channelUrl ? 'OfflineTube' : state.channelName,
        videos: action.payload.channelUrl !== state.settings.channelUrl ? [] : state.videos,
        playlists: action.payload.channelUrl !== state.settings.channelUrl ? [] : state.playlists,
        selectedPlaylistId: action.payload.channelUrl !== state.settings.channelUrl ? null : state.selectedPlaylistId,

      };
    case 'SET_CHANNEL_INFO':
      return {
        ...state,
        channelId: action.payload.id,
        uploadsPlaylistId: action.payload.uploadsPlaylistId,
        channelName: action.payload.title || 'Channel',
      };
    case 'ADD_TO_DOWNLOAD_QUEUE': {
      const newItems: DownloadItem[] = action.payload
        .filter(video => !state.downloadQueue.some(item => item.id === video.id)) // Avoid duplicates
        .map(video => ({
          ...video,
          selectedQuality: state.videoQualities[video.id] || state.globalQuality,
          progress: 0,
          status: 'queued',
        }));
      return { ...state, downloadQueue: [...state.downloadQueue, ...newItems] };
    }
    case 'UPDATE_DOWNLOAD_PROGRESS':
      return {
        ...state,
        downloadQueue: state.downloadQueue.map(item =>
          item.id === action.payload.videoId
            ? { ...item, progress: action.payload.progress, status: action.payload.progress === 100 ? 'completed' : item.status === 'queued' ? 'downloading' : item.status }
            : item
        ),
      };
    case 'SET_DOWNLOAD_ITEM_STATUS':
      return {
        ...state,
        downloadQueue: state.downloadQueue.map(item =>
          item.id === action.payload.videoId
            ? { ...item, status: action.payload.status }
            : item
        ),
      };
    case 'REMOVE_FROM_DOWNLOAD_QUEUE':
        return {
            ...state,
            downloadQueue: state.downloadQueue.filter(item => item.id !== action.payload)
        };
    case 'CLEAR_COMPLETED_DOWNLOADS':
        return {
            ...state,
            downloadQueue: state.downloadQueue.filter(item => item.status !== 'completed')
        };
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
      // Clear data if API key or URL is missing
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
    
    // Fetch channel details first (includes uploadsPlaylistId)
    if (!state.channelId || !state.uploadsPlaylistId) {
        dispatch({ type: 'SET_LOADING_PLAYLISTS', payload: true }); // General loading state
        dispatch({ type: 'SET_LOADING_VIDEOS', payload: true });
        try {
            const channelInfo = await fetchChannelDetails(state.settings.apiKey, channelHandleOrId);
            if (channelInfo) {
                dispatch({ type: 'SET_CHANNEL_INFO', payload: channelInfo });
                // Now channelInfo.id and channelInfo.uploadsPlaylistId are set in state for next effect
            } else {
                toast({ title: 'Channel Not Found', description: 'Could not fetch channel details.', variant: 'destructive' });
                dispatch({ type: 'SET_CHANNEL_INFO', payload: { id: null, uploadsPlaylistId: null, title: 'OfflineTube' } });
                dispatch({ type: 'SET_LOADING_PLAYLISTS', payload: false });
                dispatch({ type: 'SET_LOADING_VIDEOS', payload: false });
            }
        } catch (error: any) {
            toast({ title: 'API Error (Channel)', description: error.message || 'Failed to fetch channel details.', variant: 'destructive' });
            dispatch({ type: 'SET_LOADING_PLAYLISTS', payload: false });
            dispatch({ type: 'SET_LOADING_VIDEOS', payload: false });
        }
    }
  }, [state.settings.apiKey, state.settings.channelUrl, state.channelId, state.uploadsPlaylistId, toast]);


  // Effect to fetch initial channel info (ID, uploads playlist ID)
  useEffect(() => {
    fetchAndSetChannelData();
  }, [fetchAndSetChannelData]);


  // Effect to fetch playlists once channelId is known
  useEffect(() => {
    const fetchPlaylists = async () => {
      if (state.settings.apiKey && state.channelId && state.playlists.length === 0) { // only fetch if not already fetched
        dispatch({ type: 'SET_LOADING_PLAYLISTS', payload: true });
        try {
          const playlistsData = await fetchChannelPlaylists(state.settings.apiKey, state.channelId);
          dispatch({ type: 'SET_PLAYLISTS', payload: playlistsData });
        } catch (error: any) {
          toast({ title: 'API Error (Playlists)', description: error.message || 'Failed to fetch playlists.', variant: 'destructive' });
          dispatch({ type: 'SET_LOADING_PLAYLISTS', payload: false });
        }
      }
    };
    fetchPlaylists();
  }, [state.settings.apiKey, state.channelId, state.playlists.length, toast]);


  // Effect to fetch videos based on selected playlist or general uploads
  useEffect(() => {
    const fetchVideos = async () => {
      if (state.settings.apiKey && (state.uploadsPlaylistId || state.selectedPlaylistId)) {
        const playlistToFetch = state.selectedPlaylistId || state.uploadsPlaylistId;
        if (!playlistToFetch) return;

        dispatch({ type: 'SET_LOADING_VIDEOS', payload: true });
        try {
          // Add playlist name to video if fetching specific playlist items
          const videosData = await fetchPlaylistItems(state.settings.apiKey, playlistToFetch, 50); // Fetch up to 50 videos
          const currentPlaylist = state.playlists.find(p => p.id === playlistToFetch);
          
          const videosWithPlaylistContext = videosData.map(v => ({
            ...v,
            playlist: currentPlaylist && state.selectedPlaylistId ? currentPlaylist.title : undefined,
            playlistId: currentPlaylist && state.selectedPlaylistId ? currentPlaylist.id : undefined,
          }));

          dispatch({ type: 'SET_VIDEOS', payload: videosWithPlaylistContext });
        } catch (error: any) {
          toast({ title: 'API Error (Videos)', description: error.message || 'Failed to fetch videos.', variant: 'destructive' });
          dispatch({ type: 'SET_LOADING_VIDEOS', payload: false });
        }
      }
    };
    fetchVideos();
  }, [state.settings.apiKey, state.uploadsPlaylistId, state.selectedPlaylistId, state.playlists, toast]);


  // Simulate download progress
  useEffect(() => {
    const activeDownloads = state.downloadQueue.filter(item => item.status === 'downloading' || (item.status === 'queued' && state.downloadQueue.filter(d => d.status === 'downloading').length < state.settings.concurrentDownloads));
    
    activeDownloads.forEach(item => {
      if (item.status === 'queued') {
        dispatch({ type: 'SET_DOWNLOAD_ITEM_STATUS', payload: { videoId: item.id, status: 'downloading' }});
      }

      if (item.status === 'downloading' && item.progress < 100) {
        const interval = setInterval(() => {
          dispatch({
            type: 'UPDATE_DOWNLOAD_PROGRESS',
            payload: { videoId: item.id, progress: Math.min(item.progress + 10, 100) },
          });
        }, 500);
        return () => clearInterval(interval);
      }
    });
  }, [state.downloadQueue, state.settings.concurrentDownloads, dispatch]);


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
