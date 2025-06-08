// src/app/api/start-download/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid'; // For unique filenames if needed

// Helper function to sanitize filenames
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9_\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\.\-\s]/g, '_').replace(/\s+/g, '_');
}

export async function POST(req: NextRequest) {
  console.log('[API /start-download] Received download request');
  try {
    const body = await req.json();
    const { videoId, videoTitle, selectedQuality } = body;

    if (!videoId || !videoTitle || !selectedQuality) {
      console.error('[API /start-download] Missing parameters:', body);
      return NextResponse.json({ success: false, message: 'Missing required parameters: videoId, videoTitle, selectedQuality' }, { status: 400 });
    }

    const downloadsDir = path.join(process.cwd(), 'public', 'downloads', 'videos');
    // Ensure the directory exists
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
      console.log(`[API /start-download] Created downloads directory: ${downloadsDir}`);
    }

    // Sanitize title and construct filename
    const sanitizedTitle = sanitizeFilename(videoTitle);
    const filename = `${sanitizedTitle}_${selectedQuality}_${videoId}.mp4`; // Add videoId for uniqueness
    const outputPath = path.join(downloadsDir, filename);
    const downloadUrl = `/downloads/videos/${filename}`;

    // Map quality to yt-dlp format string (example, might need adjustment)
    // Common formats: 1080p -> 137+140 or bestvideo[height<=1080]+bestaudio/best
    // 720p -> 136+140 or bestvideo[height<=720]+bestaudio/best
    // For simplicity, let's try to get a merged mp4 format.
    // A more robust solution would involve checking available formats first.
    let formatString = `bestvideo[height<=${selectedQuality.replace('p', '')}][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best`;
    if (selectedQuality === 'audio_only') { // Example for audio
        formatString = 'bestaudio[ext=m4a]/bestaudio';
    }


    // Construct the yt-dlp command
    // Using -S to prefer codecs if possible, res,ext
    const command = `yt-dlp -S "res:${selectedQuality.replace('p','')},ext:mp4:m4a" --merge-output-format mp4 -o "${outputPath}" "https://www.youtube.com/watch?v=${videoId}"`;

    console.log(`[API /start-download] Executing command: ${command}`);

    // Execute yt-dlp
    // This is asynchronous. The API will respond that the process has started.
    // Actual file availability will happen later.
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`[API /start-download] yt-dlp execution error for ${videoId}: ${error.message}`);
        console.error(`[API /start-download] yt-dlp stderr for ${videoId}: ${stderr}`);
        // Note: Can't send response here as it might have already been sent.
        // Implement a webhook or status update mechanism for robust error reporting to client.
        // For now, client will assume error if file doesn't appear or link doesn't work.
        return;
      }
      console.log(`[API /start-download] yt-dlp stdout for ${videoId}: ${stdout}`);
      console.log(`[API /start-download] Successfully downloaded ${videoTitle} (${videoId}) to ${outputPath}`);
      // File is now downloaded. Frontend needs to be aware or poll.
    });

    // Respond to the client that the download process has been initiated
    return NextResponse.json({ 
      success: true, 
      message: 'Download initiated successfully.',
      videoId: videoId,
      downloadUrl: downloadUrl, // Provide the expected URL
      filename: filename
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API /start-download] General error:', error);
    return NextResponse.json({ success: false, message: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
