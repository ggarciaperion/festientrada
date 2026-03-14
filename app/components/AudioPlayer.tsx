'use client';

import { useEffect, useRef, useState } from 'react';

// Play order: track 0 first (2.mp3), then track 1 (1.mp3), then loop back
const TRACKS    = ['/music/2.mp3', '/music/1.mp3'];
const VOLUME    = 0.28;   // subtle background volume
const FADE_S    = 4;      // crossfade duration in seconds
const TICK_MS   = 60;     // volume update interval

export default function AudioPlayer() {
  const [playing, setPlaying] = useState(false);
  const [tried,   setTried]   = useState(false);

  // Two audio elements for crossfade — A and B alternate
  const aRef   = useRef<HTMLAudioElement | null>(null);
  const bRef   = useRef<HTMLAudioElement | null>(null);
  const trackA = useRef(0); // index in TRACKS for element A
  const trackB = useRef(1); // index in TRACKS for element B
  const timer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const fading = useRef(false);

  // Initialize audio elements once
  useEffect(() => {
    const a = new Audio(TRACKS[0]);
    const b = new Audio(TRACKS[1]);
    a.volume = 0;
    b.volume = 0;
    a.preload = 'auto';
    b.preload = 'auto';
    aRef.current = a;
    bRef.current = b;
    trackA.current = 0;
    trackB.current = 1;

    return () => {
      a.pause(); b.pause();
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  // Try autoplay on mount (silently — browsers may block it)
  useEffect(() => {
    if (tried) return;
    setTried(true);
    startPlayback().catch(() => { /* blocked — user must click */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fade current (A) out, fade next (B) in, then swap
  const crossfadeTo = (
    current: HTMLAudioElement,
    next:    HTMLAudioElement,
    nextTrackIdx: number,
    onSwapDone: () => void,
  ) => {
    if (fading.current) return;
    fading.current = true;

    next.src    = TRACKS[nextTrackIdx];
    next.volume = 0;
    next.currentTime = 0;
    next.play().catch(() => {});

    const steps     = (FADE_S * 1000) / TICK_MS;
    const stepSize  = VOLUME / steps;
    let   step      = 0;

    const id = setInterval(() => {
      step++;
      current.volume = Math.max(0, VOLUME - step * stepSize);
      next.volume    = Math.min(VOLUME, step * stepSize);
      if (step >= steps) {
        clearInterval(id);
        current.pause();
        current.volume = 0;
        next.volume    = VOLUME;
        fading.current = false;
        onSwapDone();
      }
    }, TICK_MS);
  };

  const startPlayback = async () => {
    const a = aRef.current!;
    a.src         = TRACKS[0];
    a.currentTime = 0;
    a.volume      = VOLUME;
    await a.play();
    setPlaying(true);

    // Watch A's timeupdate to trigger crossfade to B
    const watchA = () => {
      if (!aRef.current) return;
      const remaining = a.duration - a.currentTime;
      if (remaining <= FADE_S && !fading.current) {
        a.removeEventListener('timeupdate', watchA);
        crossfadeTo(a, bRef.current!, trackB.current, () => {
          // Swap roles: B is now current, A becomes next
          const tmp = trackA.current;
          trackA.current = trackB.current;
          trackB.current = (trackA.current + 1) % TRACKS.length;
          watchCurrent(bRef.current!, aRef.current!);
        });
      }
    };
    a.addEventListener('timeupdate', watchA);
  };

  const watchCurrent = (current: HTMLAudioElement, next: HTMLAudioElement) => {
    const handler = () => {
      if (!current) return;
      const remaining = current.duration - current.currentTime;
      if (remaining <= FADE_S && !fading.current) {
        current.removeEventListener('timeupdate', handler);
        const nextIdx = (trackA.current + 1) % TRACKS.length;
        trackB.current = nextIdx;
        crossfadeTo(current, next, nextIdx, () => {
          trackA.current = nextIdx;
          trackB.current = (nextIdx + 1) % TRACKS.length;
          watchCurrent(next, current);
        });
      }
    };
    current.addEventListener('timeupdate', handler);
  };

  const toggle = async () => {
    if (playing) {
      aRef.current?.pause();
      bRef.current?.pause();
      if (timer.current) clearInterval(timer.current);
      fading.current = false;
      setPlaying(false);
    } else {
      await startPlayback().catch(() => {});
    }
  };

  return (
    <button
      onClick={toggle}
      title={playing ? 'Pausar música' : 'Reproducir música'}
      className={`fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full flex items-center justify-center
        border transition-all duration-300 shadow-lg backdrop-blur-md
        ${playing
          ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30'
          : 'bg-white/5 border-white/15 text-slate-500 hover:bg-white/10 hover:text-slate-300'}`}
    >
      {playing ? (
        // Speaker with waves
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
      ) : (
        // Speaker muted
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <line x1="23" y1="9" x2="17" y2="15"/>
          <line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
      )}
    </button>
  );
}
