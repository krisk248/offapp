import type { Video, YouTubePlaylist } from '@/types';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Helper to format ISO duration (PT1M30S) to "1:30"
function formatYouTubeDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";

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

// Helper to format view count
function formatViewCount(viewCountStr: string | undefined): string {
  if (!viewCountStr) return "N/A views";
  const views = parseInt(viewCountStr);
  if (views >= 1_000_000_000) return (views / 1_000_000_000).toFixed(1) + 'B views';
  if (views >= 1_000_000) return (views / 1_000_000).toFixed(1) + 'M views';
  if (views >= 1_000) return (views / 1_000).toFixed(1) + 'K views';
  return views + ' views';
}

// Helper to format upload date
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
      return pathParts[0]; // Returns "@YourChannel"
    }
    // Fallback for older /channel/UC... or /user/username URLs if needed
    if (pathParts[0] === 'channel' && pathParts[1]) {
        return pathParts[1]; // Returns UC... string
    }
    if (pathParts[0] === 'user' && pathParts[1]) {
        return pathParts[1]; // Returns username
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
     // Assume it's a legacy username if not starting with @ or UC
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
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || 'https://placehold.co/320x180.png?text=Playlist',
      itemCount: item.contentDetails.itemCount,
      publishedAt: item.snippet.publishedAt,
    }));
  } catch (error) {
    console.error('Error fetching channel playlists:', error);
    throw error; // Re-throw to be caught by caller
  }
}


export async function fetchPlaylistItems(apiKey: string, playlistId: string, maxResults: number = 20): Promise<Video[]> {
  const playlistItemsEndpoint = `${YOUTUBE_API_BASE_URL}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}&key=${apiKey}`;
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
        .filter(Boolean) // Filter out items that might not be videos (e.g., deleted videos)
        .join(',');

    if (!videoIds) return [];

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
                playlistId: item.snippet.playlistId,
                position: item.snippet.position
            };
        }
        return acc;
    }, {});


    return videosData.items.map((video: any) => ({
      id: video.id,
      title: video.snippet.title,
      thumbnailUrl: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || `https://placehold.co/600x400.png?text=Video`,
      duration: formatYouTubeDuration(video.contentDetails.duration),
      uploadDate: formatUploadDate(video.snippet.publishedAt), // Using relative time
      viewCount: formatViewCount(video.statistics?.viewCount),
      channelName: video.snippet.channelTitle,
      description: video.snippet.description,
      availableQualities: ['1080p', '720p', '480p', '360p'], // Mocked, as API doesn't provide this easily
      publishedAt: video.snippet.publishedAt, // Raw ISO date
      playlistId: playlistItemDetails[video.id]?.playlistId,
      // playlist: can be added if playlist name is passed or fetched separately
    }));
  } catch (error) {
    console.error(`Error fetching items for playlist ${playlistId}:`, error);
    throw error;
  }
}
