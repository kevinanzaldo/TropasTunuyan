'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '@/components/ThemeToggle';

/**
 * Layout del panel de administración con autenticación protegida.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  useEffect(() => {
    // Si estamos en la página de login, no validar auth
    if (pathname === '/admin/login') {
      setAutenticado(true);
      return;
    }

    const sesion = localStorage.getItem('tropas_admin_auth');
    if (sesion === 'authenticated') {
      setAutenticado(true);
    } else {
      setAutenticado(false);
      router.replace('/admin/login');
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('tropas_admin_auth');
    localStorage.removeItem('tropas_admin_email');
    router.replace('/admin/login');
  };

  // En la vista de login, renderizar únicamente la pantalla de login sin sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Mientras valida el estado de sesión
  if (autenticado === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-militar-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500">
            Verificando credenciales operativas...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900 transition-colors">
        {/* Logo */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-900">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-300 dark:border-militar-600/30 bg-black flex-shrink-0 shadow-md">
              <Image
                src="/logo.png"
                alt="Logo Tropas Tunuyán"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <span className="font-display font-bold text-zinc-900 dark:text-white text-base leading-none block">
                Tropas Tunuyán
              </span>
              <span className="text-[10px] text-zinc-500 font-medium tracking-wider uppercase">
                Panel Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-3 space-y-1.5">
          <Link
            href="/admin/inventario"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              pathname.startsWith('/admin/inventario')
                ? 'text-militar-700 dark:text-militar-400 bg-militar-50 dark:bg-militar-600/10 border border-militar-200 dark:border-militar-600/20 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            Inventario & Stock
          </Link>

          <Link
            href="/admin/finanzas"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              pathname.startsWith('/admin/finanzas')
                ? 'text-militar-700 dark:text-militar-400 bg-militar-50 dark:bg-militar-600/10 border border-militar-200 dark:border-militar-600/20 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" x2="12" y1="2" y2="22" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Caja & Finanzas
          </Link>

          <Link
            href="/catalogo"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            target="_blank"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" x2="21" y1="6" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            Ver Catálogo
          </Link>
        </nav>

        {/* Footer sidebar con Usuario, ThemeToggle y Botón de Cerrar Sesión */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-900 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-militar-100 dark:bg-militar-950 text-militar-800 dark:text-militar-400 border border-militar-300 dark:border-militar-800 flex items-center justify-center text-xs font-bold shadow-sm">
                A
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-300">Admin</div>
                <div className="text-xs text-zinc-500">Administrador</div>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <button
            onClick={handleLogout}
            type="button"
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
            title="Cerrar sesión de administrador"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
        {/* Header mobile */}
        <header className="lg:hidden sticky top-0 z-50 bg-white/90 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800/60 px-4 h-14 flex items-center justify-between transition-colors">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-md overflow-hidden border border-zinc-300 dark:border-militar-600/30 bg-black flex-shrink-0 shadow-sm">
              <Image
                src="/logo.png"
                alt="Logo Tropas Tunuyán"
                fill
                className="object-cover"
              />
            </div>
            <span className="font-display font-bold text-zinc-900 dark:text-white text-sm">
              Tropas Tunuyán
            </span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/admin/inventario"
              className={`text-xs font-semibold px-2 py-1 rounded-md transition-colors ${
                pathname.startsWith('/admin/inventario')
                  ? 'bg-militar-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Stock
            </Link>
            <Link
              href="/admin/finanzas"
              className={`text-xs font-semibold px-2 py-1 rounded-md transition-colors ${
                pathname.startsWith('/admin/finanzas')
                  ? 'bg-militar-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Caja
            </Link>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
              title="Cerrar sesión"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
