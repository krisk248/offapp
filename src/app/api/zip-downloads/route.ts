
// src/app/api/zip-downloads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { PassThrough } from 'stream';

export async function POST(req: NextRequest) {
  console.log('[API /zip-downloads] Received ZIP request');
  try {
    const body = await req.json();
    const { filenames } = body;

    if (!Array.isArray(filenames) || filenames.length === 0) {
      console.error('[API /zip-downloads] No filenames provided for zipping.');
      return NextResponse.json({ success: false, message: 'No filenames provided.' }, { status: 400 });
    }
    console.log('[API /zip-downloads] Filenames received for zipping:', filenames);

    const downloadsDir = path.join(process.cwd(), 'public', 'downloads', 'videos');
    const validFilesToZip: { path: string, name: string }[] = [];

    for (const filename of filenames) {
      if (typeof filename !== 'string' || filename.includes('..') || filename.includes('/')) {
        console.warn(`[API /zip-downloads] Invalid or potentially malicious filename skipped: ${filename}`);
        continue;
      }
      const filePath = path.join(downloadsDir, filename);
      if (fs.existsSync(filePath)) {
        console.log(`[API /zip-downloads] File found, will add to zip: ${filePath}`);
        validFilesToZip.push({ path: filePath, name: filename });
      } else {
        console.warn(`[API /zip-downloads] File not found, SKIPPED: ${filePath}`);
      }
    }

    if (validFilesToZip.length === 0) {
      console.error('[API /zip-downloads] No valid files found on server to zip from the provided list.');
      return NextResponse.json({ success: false, message: 'No valid files found on server to zip.' }, { status: 404 });
    }

    const passThrough = new PassThrough();
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('warning', function(err) {
      if (err.code === 'ENOENT') {
        console.warn('[API /zip-downloads] Archiver warning (ENOENT - file not found during archiving):', err);
      } else {
        console.error('[API /zip-downloads] Archiver warning:', err);
      }
    });

    archive.on('error', function(err) {
      console.error('[API /zip-downloads] Archiver fatal error:', err);
      // It's hard to send a JSON response here as headers might already be sent for streaming.
      // The client will likely experience a broken download.
    });

    archive.pipe(passThrough);

    console.log(`[API /zip-downloads] Archiving ${validFilesToZip.length} valid files...`);
    validFilesToZip.forEach(file => {
      console.log(`[API /zip-downloads] Adding to ZIP: ${file.name} from path: ${file.path}`);
      archive.file(file.path, { name: file.name });
    });

    console.log('[API /zip-downloads] Finalizing archive...');
    archive.finalize(); // finalize() is asynchronous, but we pipe immediately.

    const zipFilename = `Dushyath_Youtube_Downloads_${new Date().toISOString().split('T')[0]}.zip`;
    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', `attachment; filename="${zipFilename}"`);

    console.log('[API /zip-downloads] Streaming ZIP response to client.');
    // @ts-ignore: ReadableStream is compatible with PassThrough for NextResponse
    return new NextResponse(passThrough, { status: 200, headers });

  } catch (error: any) {
    console.error('[API /zip-downloads] General error in ZIP endpoint:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to create ZIP file.' }, { status: 500 });
  }
}
