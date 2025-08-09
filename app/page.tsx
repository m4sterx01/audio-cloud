"use client";

import { useState, useEffect, useRef, FC } from 'react';
import type { WaveSurferOptions } from 'wavesurfer.js';

// Custom hook for WaveSurfer.js integration
const useWaveSurfer = (containerRef: React.RefObject<HTMLDivElement>, audioUrl: string) => {
    const waveSurferRef = useRef<any | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!containerRef.current || !audioUrl) return;

        import('wavesurfer.js').then(WaveSurferModule => {
            const WaveSurfer = WaveSurferModule.default;
            if (waveSurferRef.current) waveSurferRef.current.destroy();
            
            const ws = WaveSurfer.create({
                container: containerRef.current!,
                waveColor: '#e5e7eb', // gray-200
                progressColor: '#f97316', // orange-500
                barWidth: 3,
                barGap: 2.5,
                barRadius: 3,
                height: 80,
                url: audioUrl,
                cursorWidth: 1,
                cursorColor: '#f97316',
            });
            waveSurferRef.current = ws;

            const subscriptions = [
                ws.on('play', () => setIsPlaying(true)),
                ws.on('pause', () => setIsPlaying(false)),
                ws.on('ready', (newDuration: number) => setDuration(newDuration)),
                ws.on('timeupdate', (newTime: number) => setCurrentTime(newTime)),
            ];
            return () => {
                subscriptions.forEach(unsub => unsub());
                if (waveSurferRef.current) waveSurferRef.current.destroy();
            };
        });
    }, [audioUrl, containerRef]);

    const handlePlayPause = () => waveSurferRef.current?.playPause();
    const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().slice(14, 19);
    return { isPlaying, handlePlayPause, currentTime: formatTime(currentTime), duration: formatTime(duration) };
};

const AudioUploaderPage: FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [externalUrl, setExternalUrl] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState({ url: '', embedCode: '' });
    const [isDragging, setIsDragging] = useState(false);
    const [copied, setCopied] = useState(false);

    const waveformRef = useRef<HTMLDivElement>(null);
    const { isPlaying, handlePlayPause, currentTime, duration } = useWaveSurfer(waveformRef, result.url);

    const handleFileChange = (selectedFile: File | null) => {
        if (!selectedFile) return;
        if (!selectedFile.type.startsWith('audio/')) {
            setError('Please select a valid audio file.');
            return;
        }
        resetState();
        setFile(selectedFile);
        setExternalUrl('');
    };

    const handleExternalUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        resetState();
        setExternalUrl(e.target.value);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };

    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
        else if (e.type === 'dragleave') setIsDragging(false);
    };

    const resetState = () => {
        setError(null);
        setUploadProgress(0);
        setIsUploading(false);
        setResult({ url: '', embedCode: '' });
        setFile(null);
    };

    const generateFullEmbedCode = (audioUrl: string) => {
        const html = `
<!-- Audio Player Embed Start -->
<div class="audio-player-embed-container" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff; padding: 1.5rem; border-radius: 0.5rem; border: 1px solid #e5e7eb; max-width: 100%;">
    <div class="waveform"></div>
    <div class="controls" style="display: flex; align-items: center; justify-content: space-between; margin-top: 1rem;">
        <button class="play-pause-btn" aria-label="Play/Pause" style="width: 3rem; height: 3rem; display: flex; align-items: center; justify-content: center; border-radius: 9999px; background-color: #f97316; color: white; border: none; cursor: pointer; transition: background-color 0.2s;">
            <svg class="play-icon" viewBox="0 0 20 20" fill="currentColor" style="width: 1.25rem; height: 1.25rem; margin-left: 2px;"><path d="M6.3 2.841A1.5 1.5 0 004 4.118v11.764a1.5 1.5 0 002.3 1.277l9.344-5.882a1.5 1.5 0 000-2.553L6.3 2.84z"></path></svg>
            <svg class="pause-icon" style="display: none; width: 1.25rem; height: 1.25rem;" viewBox="0 0 20 20" fill="currentColor"><path d="M5.75 4.75a.75.75 0 00-1.5 0v10.5a.75.75 0 001.5 0V4.75zm8 0a.75.75 0 00-1.5 0v10.5a.75.75 0 001.5 0V4.75z"></path></svg>
        </button>
        <div class="time-display" style="font-family: monospace; font-size: 0.875rem; background-color: #f3f4f6; color: #4b5563; padding: 0.5rem 0.75rem; border-radius: 0.375rem;">00:00 / 00:00</div>
    </div>
</div>
<script src="https://unpkg.com/wavesurfer.js@7"></script>
<script>
    (function() {
        var container = document.currentScript.previousElementSibling;
        var waveformEl = container.querySelector('.waveform');
        var playPauseBtn = container.querySelector('.play-pause-btn');
        var playIcon = container.querySelector('.play-icon');
        var pauseIcon = container.querySelector('.pause-icon');
        var timeDisplay = container.querySelector('.time-display');
        var formatTime = function(seconds) { return new Date(seconds * 1000).toISOString().slice(14, 19); };
        var ws = WaveSurfer.create({ container: waveformEl, waveColor: '#e5e7eb', progressColor: '#f97316', height: 80, barWidth: 3, barGap: 2.5, barRadius: 3, url: '${audioUrl}', cursorWidth: 1, cursorColor: '#f97316' });
        playPauseBtn.onclick = function() { ws.playPause(); };
        ws.on('play', function() { playIcon.style.display = 'none'; pauseIcon.style.display = 'block'; });
        ws.on('pause', function() { playIcon.style.display = 'block'; pauseIcon.style.display = 'none'; });
        ws.on('timeupdate', function(currentTime) { var duration = ws.getDuration(); if (duration) timeDisplay.textContent = formatTime(currentTime) + ' / ' + formatTime(duration); });
        ws.on('ready', function() { var duration = ws.getDuration(); if (duration) timeDisplay.textContent = '00:00 / ' + formatTime(duration); });
    })();
</script>
<!-- Audio Player Embed End -->
        `;
        return html.trim();
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first.');
            return;
        }
        setIsUploading(true);
        setError(null);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload', true);
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) setUploadProgress((event.loaded / event.total) * 100);
        };
        xhr.onload = () => {
            setIsUploading(false);
            if (xhr.status >= 200 && xhr.status < 300) {
                const response = JSON.parse(xhr.responseText);
                if (response.success && response.encodedFilename) {
                    const streamUrl = new URL(`/api/stream/${response.encodedFilename}`, window.location.origin).href;
                    setResult({ url: streamUrl, embedCode: generateFullEmbedCode(streamUrl) });
                } else {
                    setError(response.error || 'Upload succeeded but returned invalid data.');
                }
            } else {
                try {
                    const response = JSON.parse(xhr.responseText);
                    setError(response.error || `An unknown error occurred (Status: ${xhr.status}).`);
                } catch (e) {
                    setError(`An unknown error occurred (Status: ${xhr.status}).`);
                }
            }
        };
        xhr.onerror = () => {
            setIsUploading(false);
            setError('Upload failed. Check the server connection.');
        };
        xhr.send(formData);
    };
    
    const handleUseExternalUrl = () => {
        if (!externalUrl || !externalUrl.startsWith('http')) {
            setError('Please enter a valid, full audio URL (e.g., https://.../audio.mp3).');
            return;
        }
        resetState();
        setExternalUrl(externalUrl);
        setResult({ url: externalUrl, embedCode: generateFullEmbedCode(externalUrl) });
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(result.embedCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => setError('Failed to copy to clipboard.'));
    };

    return (
        <main className="bg-slate-50 flex items-center justify-center min-h-screen font-sans p-4">
            <div className="w-full max-w-2xl">
                <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 border border-slate-200">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-slate-800">onionfarms.com for audio</h1>
                        <p className="text-slate-500 mt-2"></p>
                    </div>

                    <div 
                        onDrop={handleDrop}
                        onDragEnter={handleDragEvents}
                        onDragLeave={handleDragEvents}
                        onDragOver={handleDragEvents}
                        className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${isDragging ? 'border-orange-400 bg-orange-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'}`}
                    >
                        <input
                            type="file"
                            id="fileInput"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            accept="audio/*"
                            onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                        />
                        <div className="flex flex-col items-center justify-center pointer-events-none text-center">
                            <svg className="w-10 h-10 mb-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 15l-4-4m4 4l4-4"/></svg>
                            {file ? <p className="text-sm text-slate-600 font-semibold px-4">{file.name}</p> : <><p className="mb-2 text-sm text-slate-500"><span className="font-semibold text-slate-600">Click to upload</span> or drag and drop</p><p className="text-xs text-slate-400">MP3, WAV, OGG, etc.</p></>}
                        </div>
                    </div>
                    
                    {file && !isUploading && !result.embedCode && (
                        <div className="text-center mt-6">
                            <button onClick={handleUpload} className="bg-orange-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all shadow-md hover:shadow-lg">Upload File</button>
                        </div>
                    )}

                    <div className="my-6 flex items-center text-center"><div className="flex-grow border-t border-slate-200"></div><span className="flex-shrink mx-4 text-slate-400 text-sm font-semibold">OR</span><div className="flex-grow border-t border-slate-200"></div></div>

                    <div>
                        <label htmlFor="externalUrl" className="block mb-2 text-sm font-medium text-slate-700">Use External Audio URL</label>
                        <div className="flex items-center gap-2">
                            <input id="externalUrl" type="url" value={externalUrl} onChange={handleExternalUrlChange} placeholder="https://..." className="block p-2.5 w-full text-sm text-slate-900 bg-slate-50 rounded-lg border border-slate-300 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-400"/>
                            <button onClick={handleUseExternalUrl} className="bg-slate-700 text-white w-28 text-center py-2.5 rounded-md text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">Generate</button>
                        </div>
                    </div>

                    {isUploading && (
                         <div className="mt-6">
                            <div className="flex justify-between mb-1"><span className="text-base font-medium text-slate-700">Uploading...</span><span className="text-sm font-medium text-slate-700">{Math.round(uploadProgress)}%</span></div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-orange-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div></div>
                        </div>
                    )}

                    {error && <div className="mt-6 text-center text-sm p-3 rounded-lg bg-red-100 text-red-700 border border-red-200">{error}</div>}

                    {result.embedCode && (
                        <div className="mt-8 space-y-6 animate-fade-in">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-3">Player Preview</h3>
                                <div className="bg-white p-6 rounded-lg border border-slate-200">
                                    <div ref={waveformRef}></div>
                                    <div className="flex items-center justify-between mt-4">
                                        <button onClick={handlePlayPause} className="w-12 h-12 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                                            {isPlaying ? (
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M5.75 4.75a.75.75 0 00-1.5 0v10.5a.75.75 0 001.5 0V4.75zm8 0a.75.75 0 00-1.5 0v10.5a.75.75 0 001.5 0V4.75z"></path></svg>
                                            ) : (
                                                <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.118v11.764a1.5 1.5 0 002.3 1.277l9.344-5.882a1.5 1.5 0 000-2.553L6.3 2.84z"></path></svg>
                                            )}
                                        </button>
                                        <div className="text-sm text-slate-500 font-mono bg-slate-100 px-3 py-1.5 rounded-md">{currentTime} / {duration}</div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="outputCode" className="block mb-2 text-sm font-medium text-slate-700">Embed Code</label>
                                <div className="relative">
                                    <textarea id="outputCode" value={result.embedCode} readOnly rows={8} className="block p-2.5 w-full text-xs font-mono text-slate-700 bg-slate-50 rounded-lg border border-slate-300 focus:ring-orange-500 focus:border-orange-500"/>
                                    <button onClick={copyToClipboard} className="absolute top-2.5 right-2.5 bg-slate-700 text-white w-20 text-center py-1 rounded-md text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">{copied ? 'Copied!' : 'Copy'}</button>
                                </div>
                            </div>
                            <div className="text-center">
                                <button onClick={resetState} className="text-orange-600 hover:text-orange-700 text-sm font-medium transition-colors">Clear and start over</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style jsx global>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
            `}</style>
        </main>
    );
}

export default AudioUploaderPage;
