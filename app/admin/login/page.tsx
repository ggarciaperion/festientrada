'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res  = await fetch('/api/admin/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    });
    const data = await res.json();

    if (data.ok) {
      router.replace('/admin');
    } else {
      setError(data.error ?? 'Contraseña incorrecta');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07071a] flex items-center justify-center p-4">
      <div className="w-full max-w-xs">

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="text-white font-bold text-lg">Panel Administrativo</h1>
          <p className="text-slate-500 text-sm mt-1">Perion Entertainment</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              required
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3
                         text-white placeholder-slate-600 text-sm
                         focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.07]
                         transition"
            />
          </div>

          {error && (
            <p className="text-rose-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40
                       text-black font-bold text-sm rounded-xl py-3 transition active:scale-95"
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
