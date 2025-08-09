import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import mime from 'mime-types';

// The secure, private directory for uploads.
const UPLOAD_DIRECTORY = path.join(process.cwd(), 'private_audio_uploads');

export async function GET(request, { params }) {
    // The 'filename' parameter is a Base64 encoded string.
    const { filename: encodedFilename } = params;

    if (!encodedFilename) {
        return new NextResponse('Identifier is required', { status: 400 });
    }

    try {
        // Decode the Base64 identifier to get the actual filename (e.g., 'my-song-12345.mp3').
        const filename = Buffer.from(encodedFilename, 'base64').toString('utf-8');

        // Sanitize the DECODED filename to prevent directory traversal attacks.
        const sanitizedFilename = path.basename(filename);
        if (sanitizedFilename !== filename) {
            return new NextResponse('Invalid identifier', { status: 400 });
        }

        const filePath = path.join(UPLOAD_DIRECTORY, sanitizedFilename);

        // Check if the file exists.
        await fs.access(filePath);
        
        // Get file stats to determine content length.
        const stats = await fs.stat(filePath);
        const fileBuffer = await fs.readFile(filePath);

        // Determine the content type from the filename's extension.
        // This is safe because the extension was verified during the upload security check.
        const contentType = mime.lookup(filePath) || 'application/octet-stream';

        // Stream the file back to the client.
        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': stats.size.toString(),
            },
        });

    } catch (error) {
        console.error(`Error streaming file for identifier ${encodedFilename}:`, error);
        return new NextResponse('File not found or invalid identifier', { status: 404 });
    }
}
