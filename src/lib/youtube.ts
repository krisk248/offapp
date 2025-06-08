
import type { Video, YouTubePlaylist, VideoPage } from '@/types';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const VIDEOS_PER_PAGE = 50; // Max allowed by YouTube API for playlistItems is 50

function formatYouTubeDuration(isoDuration: string | undefined): string {
  if (!isoDuration) return "N/A";
  if (isoDuration === 'P0D') return "LIVE"; // Often used for live streams by API before actual duration

  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "N/A";

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  let formatted = "";
  if (hours > 0) {
    formatted += `${hours}:`;
    formatted += `${String(minutes).padStart(2, '0')}:`;
  } else {
    formatted += `${minutes}:`;
  }
  formatted += String(seconds).padStart(2, '0');
  return formatted;
}

function formatViewCount(viewCountStr: string | undefined): string {
  if (!viewCountStr) return "N/A views";
  const views = parseInt(viewCountStr);
  if (isNaN(views)) return "N/A views";
  if (views >= 1_000_000_000) return (views / 1_000_000_000).toFixed(1) + 'B views';
  if (views >= 1_000_000) return (views / 1_000_000).toFixed(1) + 'M views';
  if (views >= 1_000) return (views / 1_000).toFixed(1) + 'K views';
  return views + ' views';
}

function formatUploadDate(dateString: string | undefined): string {
  if (!dateString) return "Unknown date";
  try {
    return formatDistanceToNowStrict(parseISO(dateString), { addSuffix: true });
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return "Unknown date";
  }
}

export function extractChannelHandle(channelUrl: string): string | null {
  try {
    const url = new URL(channelUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0 && pathParts[0].startsWith('@')) {
      return pathParts[0];
    }
    if (pathParts[0] === 'channel' && pathParts[1]) {
        return pathParts[1];
    }
    if (pathParts[0] === 'user' && pathParts[1]) {
        return pathParts[1];
    }
  } catch (error) {
    console.error("Invalid channel URL:", channelUrl, error);
  }
  return null;
}

export async function fetchChannelDetails(apiKey: string, channelHandleOrId: string): Promise<{ id: string; uploadsPlaylistId: string; title: string } | null> {
  let endpoint = `${YOUTUBE_API_BASE_URL}/channels?part=snippet,contentDetails&key=${apiKey}`;
  if (channelHandleOrId.startsWith('@')) {
    endpoint += `&forHandle=${channelHandleOrId.substring(1)}`;
  } else if (channelHandleOrId.startsWith('UC')) {
    endpoint += `&id=${channelHandleOrId}`;
  } else {
    endpoint += `&forUsername=${channelHandleOrId}`;
  }

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('YouTube API Error (fetchChannelDetails):', response.status, errorData);
      throw new Error(errorData.error?.message || `Failed to fetch channel details, status: ${response.status}`);
    }
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const channel = data.items[0];
      return {
        id: channel.id,
        uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads,
        title: channel.snippet.title,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching channel details:', error);
    throw error;
  }
}

export async function fetchChannelPlaylists(apiKey: string, channelId: string): Promise<YouTubePlaylist[]> {
  const endpoint = `${YOUTUBE_API_BASE_URL}/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=50&key=${apiKey}`;
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('YouTube API Error (fetchChannelPlaylists):', response.status, errorData);
      throw new Error(errorData.error?.message || `Failed to fetch playlists, status: ${response.status}`);
    }
    const data = await response.json();
    return data.items.map((item: any) => ({
      id: item.id,
      title: item.snippet?.title || "Untitled Playlist",
      description: item.snippet?.description,
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || 'https://placehold.co/320x180.png?text=Playlist',
      itemCount: item.contentDetails?.itemCount || 0,
      publishedAt: item.snippet?.publishedAt,
    }));
  } catch (error) {
    console.error('Error fetching channel playlists:', error);
    throw error;
  }
}

export async function fetchPlaylistItems(apiKey: string, playlistId: string, pageToken?: string): Promise<VideoPage> {
  let playlistItemsEndpoint = `${YOUTUBE_API_BASE_URL}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${VIDEOS_PER_PAGE}&key=${apiKey}`;
  if (pageToken) {
    playlistItemsEndpoint += `&pageToken=${pageToken}`;
  }
  try {
    const response = await fetch(playlistItemsEndpoint);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('YouTube API Error (fetchPlaylistItems - initial):', response.status, errorData);
      throw new Error(errorData.error?.message || `Failed to fetch playlist items, status: ${response.status}`);
    }
    const data = await response.json();

    const videoIds = data.items
        .map((item: any) => item.contentDetails?.videoId)
        .filter(Boolean)
        .join(',');

    if (!videoIds) return { videos: [], nextPageToken: data.nextPageToken, prevPageToken: data.prevPageToken, totalResults: data.pageInfo?.totalResults, resultsPerPage: data.pageInfo?.resultsPerPage };

    const videosEndpoint = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${apiKey}`;
    const videosResponse = await fetch(videosEndpoint);
    if (!videosResponse.ok) {
      const errorData = await videosResponse.json();
      console.error('YouTube API Error (fetchPlaylistItems - videos):', response.status, errorData);
      throw new Error(errorData.error?.message || `Failed to fetch video details, status: ${videosResponse.status}`);
    }
    const videosData = await videosResponse.json();

    const playlistItemDetails = data.items.reduce((acc: any, item: any) => {
        if(item.contentDetails?.videoId) {
            acc[item.contentDetails.videoId] = {
                playlistId: item.snippet?.playlistId,
                position: item.snippet?.position
            };
        }
        return acc;
    }, {});

    const videos: Video[] = videosData.items.map((video: any) => {
      let durationStr: string;
      if (video.snippet?.liveBroadcastContent === 'live' || video.contentDetails?.duration === 'P0D') {
        durationStr = 'LIVE';
      } else if (video.contentDetails?.duration && video.contentDetails.duration !== 'PT0S' && video.snippet?.liveBroadcastContent !== 'upcoming') {
        durationStr = formatYouTubeDuration(video.contentDetails.duration);
      } else if (video.snippet?.liveBroadcastContent === 'upcoming') {
        durationStr = 'Upcoming';
      } else if (video.contentDetails?.duration === 'PT0S') { // For very short videos or if API returns PT0S incorrectly
        durationStr = '0:00';
      }
      else {
        durationStr = 'N/A';
      }

      return {
        id: video.id,
        title: video.snippet?.title || "Untitled Video",
        thumbnailUrl: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || `https://placehold.co/600x400.png?text=Video`,
        duration: durationStr,
        uploadDate: formatUploadDate(video.snippet?.publishedAt),
        viewCount: formatViewCount(video.statistics?.viewCount),
        channelName: video.snippet?.channelTitle || "Unknown Channel",
        description: video.snippet?.description,
        availableQualities: ['1080p', '720p', '480p', '360p'],
        publishedAt: video.snippet?.publishedAt,
        playlistId: playlistItemDetails[video.id]?.playlistId,
      };
    });

    return {
        videos,
        nextPageToken: data.nextPageToken,
        prevPageToken: data.prevPageToken,
        totalResults: data.pageInfo?.totalResults,
        resultsPerPage: data.pageInfo?.resultsPerPage
    };

  } catch (error) {
    console.error(`Error fetching items for playlist ${playlistId}:`, error);
    throw error;
  }
}
