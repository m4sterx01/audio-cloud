import { NextResponse } from 'next/server';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { fileTypeFromBuffer } from 'file-type';

// --- Configuration ---
const UPLOAD_DIRECTORY = path.join(process.cwd(), 'private_audio_uploads');
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const ALLOWED_MIME_TYPES = [
    'audio/mpeg',   // .mp3
    'audio/mp3',
    'audio/wav',    // .wav
    'audio/x-wav',
    'audio/ogg',    // .ogg
    'audio/mp4',    // .m4a, mp4 audio
    'audio/flac',   // .flac
    'audio/x-flac',
    'audio/aac',    // .aac
    'audio/x-aiff', // .aif
    'video/mp4',    // Some audio files are detected as video/mp4
];

export async function POST(request) {
    try {
        await mkdir(UPLOAD_DIRECTORY, { recursive: true });

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
        }
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "File size exceeds the 100MB limit." }, { status: 400 });
        }
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // --- CORE SECURITY CHECK ---
        // Determine the true file type from its content.
        const type = await fileTypeFromBuffer(buffer);

        // Verify the detected type against our allowlist.
        if (!type || !ALLOWED_MIME_TYPES.includes(type.mime)) {
            console.warn(`SECURITY: Blocked upload of invalid file type. Original Name: ${file.name}, Detected MIME: ${type ? type.mime : 'unknown'}`);
            return NextResponse.json({ error: "Invalid or unsupported file type." }, { status: 415 });
        }

        // --- Proceed with saving ---
        const originalName = path.parse(file.name).name;
        const sanitizedName = originalName.replace(/[^a-zA-Z0-9-_\.]/g, "");
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        
        // Create a unique filename and append the VERIFIED extension from the content check.
        const filename = `${sanitizedName}-${uniqueSuffix}.${type.ext}`;
        
        const filePath = path.join(UPLOAD_DIRECTORY, filename);
        await writeFile(filePath, buffer);

        // Base64 encode the full, new, safe filename.
        const encodedFilename = Buffer.from(filename).toString('base64');

        return NextResponse.json({ success: true, encodedFilename: encodedFilename });

    } catch (error) {
        console.error("Upload failed:", error);
        return NextResponse.json({ error: "Internal Server Error: Could not upload file." }, { status: 500 });
    }
}
