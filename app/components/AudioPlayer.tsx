'use client';

import { useEffect, useRef, useState } from 'react';

const TRACKS   = ['/music/2.mp3', '/music/1.mp3'];
const BASE_VOL = 0.28;
const FADE_MS  = 4000; // 4 s crossfade

export default function AudioPlayer() {
  const [on,    setOn]    = useState(false);
  const [modal, setModal] = useState(false);

  const curAudio = useRef<HTMLAudioElement | null>(null);
  const curIdx   = useRef(0);
  const started  = useRef(false);
  const fading   = useRef(false);
  const pool     = useRef<HTMLAudioElement[]>([]); // pre-unlocked on iOS

  // Show modal 1.5 s after page loads
  useEffect(() => {
    const t = setTimeout(() => setModal(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // ── Crossfade: fade out current → fade in next ─────────────
  function crossfade() {
    if (fading.current || !curAudio.current) return;
    fading.current = true;

    const old      = curAudio.current;
    const nextIdx  = (curIdx.current + 1) % TRACKS.length;
    // Reuse the element already unlocked during the user gesture (iOS policy)
    const next     = pool.current[nextIdx] ?? new Audio(TRACKS[nextIdx]);
    next.currentTime = 0;
    next.volume      = 0;
    next.play().catch(() => {});

    const ticks    = FADE_MS / 60;
    const step     = BASE_VOL / ticks;
    let   i        = 0;

    const timer = setInterval(() => {
      i++;
      old.volume  = Math.max(0, BASE_VOL - i * step);
      next.volume = Math.min(BASE_VOL, i * step);
      if (i >= ticks) {
        clearInterval(timer);
        old.pause();
        next.volume      = BASE_VOL;
        curAudio.current = next;
        curIdx.current   = nextIdx;
        fading.current   = false;
        watchEnd(next);
      }
    }, 60);
  }

  // ── Trigger crossfade when track is near its end ────────────
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

  // ── Start playback (guarded — only once at a time) ──────────
  function startMusic() {
    if (started.current) return;
    started.current = true;

    // Create ALL elements inside this user-gesture so iOS unlocks them all
    const audios = TRACKS.map(src => new Audio(src));
    pool.current = audios;

    const audio      = audios[0];
    audio.volume     = BASE_VOL;
    curAudio.current = audio;
    curIdx.current   = 0;

    // Touch-play every subsequent track (muted) so iOS marks them as
    // "activated by user gesture" — then immediately pause & rewind.
    // Using `muted` instead of `volume = 0` guarantees silence on all
    // mobile browsers before the async pause fires.
    audios.slice(1).forEach(a => {
      a.muted = true;
      a.play().then(() => { a.pause(); a.muted = false; a.currentTime = 0; }).catch(() => {});
    });

    audio.play()
      .then(() => { setOn(true); watchEnd(audio); })
      .catch(() => { started.current = false; });
  }

  // ── Toggle button handler ────────────────────────────────────
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
    <>
      {/* ── Subtle sound prompt modal ──────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 pb-24 sm:pb-4 pointer-events-none">
          <div className="pointer-events-auto bg-[#0d0d1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 w-full max-w-[290px] shadow-2xl animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-none">Música del festival</p>
                <p className="text-slate-500 text-xs mt-1">¿Activar música de fondo?</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setModal(false); startMusic(); }}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-black transition"
              >
                Sí, activar
              </button>
              <button
                onClick={() => setModal(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 border border-white/10 transition"
              >
                No, gracias
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating toggle button ──────────────────────────── */}
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
    </>
  );
}
