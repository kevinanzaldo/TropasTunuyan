'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    // Verificar preferencia guardada o clase actual en <html>
    const saved = localStorage.getItem('tropas-theme');
    const prefersDark = saved ? saved === 'dark' : true; // Por defecto modo oscuro (identidad de marca)

    setIsDark(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('tropas-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('tropas-theme', 'light');
    }
  };

  if (!mounted) {
    // Renderizado seguro en SSR para evitar hidratación disonante
    return (
      <div className="w-8 h-8 rounded-lg bg-zinc-800/40 border border-zinc-700/40 animate-pulse" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="relative p-2 rounded-lg bg-amber-50/80 hover:bg-amber-100/90 dark:bg-zinc-900/90 dark:hover:bg-zinc-800 border border-amber-300/70 dark:border-zinc-800 transition-all duration-200 shadow-sm flex items-center justify-center group"
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label="Alternar modo claro / oscuro"
    >
      {isDark ? (
        /* Sol (en modo oscuro, para pasar a claro) */
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        /* Luna amarilla brillante (en modo claro, para pasar a oscuro) */
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-500 fill-amber-400 drop-shadow-xs group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor" stroke="#d97706" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
