"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, FC, Suspense } from 'react';
import type { WaveSurferOptions } from 'wavesurfer.js';
import WaveSurfer from 'wavesurfer.js';

// Re-using the same WaveSurfer hook
const useWaveSurfer = (containerRef: React.RefObject<HTMLDivElement>, audioUrl: string | null) => {
    const waveSurferRef = useRef<WaveSurfer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!containerRef.current || !audioUrl) return;

        const options: Omit<WaveSurferOptions, 'container'> = {
            waveColor: '#d1d5db',
            progressColor: '#3b82f6',
            barWidth: 3,
            barGap: 2,
            barRadius: 3,
            height: 80,
            url: audioUrl,
        };

        const ws = WaveSurfer.create({
            ...options,
            container: containerRef.current,
        });

        waveSurferRef.current = ws;

        const subscriptions = [
            ws.on('play', () => setIsPlaying(true)),
            ws.on('pause', () => setIsPlaying(false)),
            ws.on('ready', (newDuration) => setDuration(newDuration)),
            ws.on('timeupdate', (newTime) => setCurrentTime(newTime)),
        ];

        return () => {
            subscriptions.forEach(unsub => unsub());
            ws.destroy();
        };
    }, [audioUrl, containerRef]);

    const handlePlayPause = () => {
        waveSurferRef.current?.playPause();
    };
    
    const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().slice(14, 19);

    return { isPlaying, handlePlayPause, currentTime: formatTime(currentTime), duration: formatTime(duration) };
};

const TestEmbedComponent: FC = () => {
    const searchParams = useSearchParams();
    const audioUrl = searchParams.get('audioUrl');
    const waveformRef = useRef<HTMLDivElement>(null);
    const { isPlaying, handlePlayPause, currentTime, duration } = useWaveSurfer(waveformRef, audioUrl);

    if (!audioUrl) {
        return (
            <div className="text-center">
                <h1 className="text-2xl font-bold text-red-600">Error</h1>
                <p className="text-slate-600 mt-2">No audio URL was provided.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-xl">
            <h1 className="text-2xl font-bold text-slate-800 mb-4 text-center">Embedded Player Test</h1>
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div ref={waveformRef}></div>
                <div className="flex items-center justify-between mt-4">
                    <button onClick={handlePlayPause} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-700 text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                        {isPlaying ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5.75 4.75a.75.75 0 00-1.5 0v10.5a.75.75 0 001.5 0V4.75zm8 0a.75.75 0 00-1.5 0v10.5a.75.75 0 001.5 0V4.75z"></path></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.118v11.764a1.5 1.5 0 002.3 1.277l9.344-5.882a1.5 1.5 0 000-2.553L6.3 2.84z"></path></svg>
                        )}
                    </button>
                    <div className="text-sm text-slate-600 font-mono bg-slate-200 px-3 py-1.5 rounded-md">{currentTime} / {duration}</div>
                </div>
            </div>
        </div>
    );
};

// We wrap the component in Suspense because useSearchParams() requires it.
const TestEmbedPage: FC = () => {
    return (
        <main className="bg-slate-100 flex items-center justify-center min-h-screen font-sans p-4">
            <Suspense fallback={<div>Loading...</div>}>
                <TestEmbedComponent />
            </Suspense>
        </main>
    );
}

export default TestEmbedPage;
