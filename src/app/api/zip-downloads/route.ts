
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

    const downloadsDir = path.join(process.cwd(), 'public', 'downloads', 'videos');
    const validFilesToZip: { path: string, name: string }[] = [];

    for (const filename of filenames) {
      if (typeof filename !== 'string' || filename.includes('..') || filename.includes('/')) {
        console.warn(`[API /zip-downloads] Invalid or potentially malicious filename skipped: ${filename}`);
        continue; 
      }
      const filePath = path.join(downloadsDir, filename);
      if (fs.existsSync(filePath)) {
        validFilesToZip.push({ path: filePath, name: filename });
      } else {
        console.warn(`[API /zip-downloads] File not found, skipped: ${filePath}`);
      }
    }

    if (validFilesToZip.length === 0) {
      console.error('[API /zip-downloads] No valid files found to zip from the provided list.');
      return NextResponse.json({ success: false, message: 'No valid files found to zip.' }, { status: 404 });
    }

    const passThrough = new PassThrough();
    const archive = archiver('zip', {
      zlib: { level: 9 } 
    });

    archive.on('warning', function(err) {
      if (err.code === 'ENOENT') {
        console.warn('[API /zip-downloads] Archiver warning:', err);
      } else {
        console.error('[API /zip-downloads] Archiver error:', err);
      }
    });

    archive.on('error', function(err) {
      console.error('[API /zip-downloads] Archiver fatal error:', err);
    });
    
    archive.pipe(passThrough);

    validFilesToZip.forEach(file => {
      console.log(`[API /zip-downloads] Adding to ZIP: ${file.name}`);
      archive.file(file.path, { name: file.name });
    });

    archive.finalize();
    console.log('[API /zip-downloads] Finalized archive. Streaming response.');
    
    const zipFilename = `Dushyath_Youtube_Downloads_${new Date().toISOString().split('T')[0]}.zip`;
    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', `attachment; filename="${zipFilename}"`);

    // @ts-ignore: ReadableStream is compatible with PassThrough for NextResponse
    return new NextResponse(passThrough, { status: 200, headers });

  } catch (error: any) {
    console.error('[API /zip-downloads] General error in ZIP endpoint:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to create ZIP file.' }, { status: 500 });
  }
}

