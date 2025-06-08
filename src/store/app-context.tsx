"use client";

import type { Video, DownloadItem, AppSettings } from '@/types';
import React, { createContext, useContext, useReducer, ReactNode, Dispatch, useEffect } from 'react';

// --- State & Actions ---
interface AppState {
  videos: Video[];
  selectedVideos: Set<string>;
  globalQuality: string;
  videoQualities: Record<string, string>; // videoId -> quality
  settings: AppSettings;
  downloadQueue: DownloadItem[];
  isLoadingVideos: boolean;
  channelName: string;
}

type Action =
  | { type: 'SET_VIDEOS'; payload: Video[] }
  | { type: 'SET_LOADING_VIDEOS'; payload: boolean }
  | { type: 'TOGGLE_SELECT_VIDEO'; payload: string }
  | { type: 'SELECT_ALL_VIDEOS' }
  | { type: 'DESELECT_ALL_VIDEOS' }
  | { type: 'SET_GLOBAL_QUALITY'; payload: string }
  | { type: 'SET_VIDEO_QUALITY'; payload: { videoId: string; quality: string } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'ADD_TO_DOWNLOAD_QUEUE'; payload: Video[] }
  | { type: 'UPDATE_DOWNLOAD_PROGRESS'; payload: { videoId: string; progress: number } }
  | { type: 'SET_DOWNLOAD_ITEM_STATUS'; payload: { videoId: string; status: DownloadItem['status'] } }
  | { type: 'REMOVE_FROM_DOWNLOAD_QUEUE'; payload: string } // videoId
  | { type: 'CLEAR_COMPLETED_DOWNLOADS' }
  | { type: 'SET_CHANNEL_NAME'; payload: string };


const initialState: AppState = {
  videos: [],
  selectedVideos: new Set(),
  globalQuality: '720p',
  videoQualities: {},
  settings: {
    apiKey: '',
    defaultQuality: '720p',
    downloadPathPreference: 'On My iPad/OfflineTube', // This might be removed if optimizer is fully gone
    concurrentDownloads: 2,
  },
  downloadQueue: [],
  isLoadingVideos: true,
  channelName: 'RamayanaForUs',
};

const MOCK_VIDEOS: Video[] = Array.from({ length: 12 }, (_, i) => ({
  id: `video_${i + 1}`,
  title: `Sample Video Title ${i + 1} - A Very Long Title That Might Need Truncation`,
  thumbnailUrl: `https://placehold.co/600x400.png?text=Video+${i+1}`,
  duration: `${Math.floor(Math.random() * 30) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
  uploadDate: `2023-0${Math.floor(Math.random() * 9) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
  viewCount: `${(Math.random() * 5 + 0.1).toFixed(1)}M views`,
  channelName: 'RamayanaForUs',
  availableQualities: ['480p', '720p', '1080p', '1440p'].slice(0, Math.floor(Math.random() * 3) + 2),
  description: `This is a sample description for video ${i + 1}. It could contain details about the video content, creators, and other relevant information.`,
}));


function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIDEOS':
      return { ...state, videos: action.payload, isLoadingVideos: false };
    case 'SET_LOADING_VIDEOS':
      return { ...state, isLoadingVideos: action.payload };
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
    case 'SET_CHANNEL_NAME':
        return { ...state, channelName: action.payload };
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

  useEffect(() => {
    // Simulate fetching videos
    dispatch({ type: 'SET_LOADING_VIDEOS', payload: true });
    setTimeout(() => {
      dispatch({ type: 'SET_VIDEOS', payload: MOCK_VIDEOS });
    }, 1000);
  }, []);

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
