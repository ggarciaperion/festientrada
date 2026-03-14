'use client';

import { useEffect, useRef, useState } from 'react';

// Play order: 2.mp3 first, then 1.mp3, then loop
const TRACKS   = ['/music/2.mp3', '/music/1.mp3'];
const BASE_VOL = 0.28;   // subtle background volume
const FADE_MS  = 4000;   // 4 s crossfade overlap

export default function AudioPlayer() {
  const [on, setOn] = useState(false);

  const curAudio = useRef<HTMLAudioElement | null>(null);
  const curIdx   = useRef(0);
  const started  = useRef(false);
  const fading   = useRef(false);

  // ── Crossfade: fade out current, fade in next track ────────
  function crossfade() {
    if (fading.current || !curAudio.current) return;
    fading.current = true;

    const oldAudio = curAudio.current;
    const nextIdx  = (curIdx.current + 1) % TRACKS.length;
    const newAudio = new Audio(TRACKS[nextIdx]);
    newAudio.volume = 0;
    newAudio.play().catch(() => {});

    const ticks   = FADE_MS / 60;
    const stepVol = BASE_VOL / ticks;
    let   i       = 0;

    const timer = setInterval(() => {
      i++;
      oldAudio.volume = Math.max(0, BASE_VOL - i * stepVol);
      newAudio.volume = Math.min(BASE_VOL, i * stepVol);
      if (i >= ticks) {
        clearInterval(timer);
        oldAudio.pause();
        newAudio.volume  = BASE_VOL;
        curAudio.current = newAudio;
        curIdx.current   = nextIdx;
        fading.current   = false;
        watchEnd(newAudio);
      }
    }, 60);
  }

  // ── Watch timeupdate; trigger crossfade FADE_MS before end ─
  function watchEnd(audio: HTMLAudioElement) {
    const check = () => {
      if (!audio.duration || fading.current) return;
      if (audio.duration - audio.currentTime <= FADE_MS / 1000 + 0.2) {
        audio.removeEventListener('timeupdate', check);
        crossfade();
      }
    };
    audio.addEventListener('timeupdate', check);
  }

  // ── Start playback (only once) ──────────────────────────────
  function startMusic() {
    if (started.current) return;
    started.current = true;

    const audio = new Audio(TRACKS[0]);
    audio.volume      = BASE_VOL;
    curAudio.current  = audio;
    curIdx.current    = 0;

    audio.play()
      .then(() => { setOn(true); watchEnd(audio); })
      .catch(() => { started.current = false; });
  }

  // ── Start on first user interaction (bypass autoplay policy)
  useEffect(() => {
    const go = () => startMusic();
    document.addEventListener('click',      go, { once: true });
    document.addEventListener('touchstart', go, { once: true, passive: true });
    document.addEventListener('scroll',     go, { once: true, passive: true });
    document.addEventListener('keydown',    go, { once: true });
    return () => {
      document.removeEventListener('click',      go);
      document.removeEventListener('touchstart', go);
      document.removeEventListener('scroll',     go);
      document.removeEventListener('keydown',    go);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toggle button ───────────────────────────────────────────
  function toggle() {
    if (on) {
      curAudio.current?.pause();
      fading.current  = false;
      started.current = false;
      setOn(false);
    } else {
      started.current = false;
      startMusic();
    }
  }

  return (
    <button
      onClick={toggle}
      title={on ? 'Pausar música' : 'Reproducir música'}
      className={`fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full flex items-center justify-center
        border transition-all duration-300 shadow-lg backdrop-blur-md
        ${on
          ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30'
          : 'bg-white/5 border-white/15 text-slate-500 hover:bg-white/10 hover:text-slate-300'
        }`}
    >
      {on ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <line x1="23" y1="9" x2="17" y2="15"/>
          <line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
      )}
    </button>
  );
}
