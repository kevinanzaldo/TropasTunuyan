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
  const [rolUsuario, setRolUsuario] = useState<'admin' | 'vendedor'>('admin');
  const [emailUsuario, setEmailUsuario] = useState<string>('tropastunuyan@gmail.com');

  useEffect(() => {
    // Si estamos en la página de login, no validar auth
    if (pathname === '/admin/login') {
      setAutenticado(true);
      return;
    }

    const sesion = localStorage.getItem('tropas_admin_auth');
    if (sesion === 'authenticated') {
      setAutenticado(true);
      const rol = (localStorage.getItem('tropas_admin_role') as 'admin' | 'vendedor') || 'admin';
      const mail = localStorage.getItem('tropas_admin_email') || 'tropastunuyan@gmail.com';
      setRolUsuario(rol);
      setEmailUsuario(mail);

      // Protección de Vistas según rol (HU 1.1):
      // El perfil vendedor sólo puede operar el POS y consultar catálogo
      if (
        rol === 'vendedor' &&
        (pathname.startsWith('/admin/finanzas') || pathname.startsWith('/admin/inventario'))
      ) {
        router.replace('/admin/pos');
      }
    } else {
      setAutenticado(false);
      router.replace('/admin/login');
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('tropas_admin_auth');
    localStorage.removeItem('tropas_admin_email');
    localStorage.removeItem('tropas_admin_role');
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
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900 transition-colors sticky top-0 h-screen overflow-hidden flex-shrink-0">
        {/* Logo */}
        <div className="flex-shrink-0 p-5 border-b border-zinc-200 dark:border-zinc-900">
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

        {/* Navegación según Rol (HU 1.1) */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <Link
            href="/admin/pos"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              pathname.startsWith('/admin/pos')
                ? 'text-militar-700 dark:text-militar-400 bg-militar-50 dark:bg-militar-600/10 border border-militar-200 dark:border-militar-600/20 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h12" />
            </svg>
            <span>Punto de Venta (POS)</span>
          </Link>

          {rolUsuario === 'admin' ? (
            <>
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
                <span>Inventario & Stock</span>
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
                <span>Caja & Finanzas</span>
              </Link>

              <Link
                href="/admin/turnos"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  pathname.startsWith('/admin/turnos')
                    ? 'text-militar-700 dark:text-militar-400 bg-militar-50 dark:bg-militar-600/10 border border-militar-200 dark:border-militar-600/20 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Turnos & Personal</span>
              </Link>
            </>
          ) : (
            <div className="pt-2 px-3 text-[11px] font-mono text-zinc-400 italic">
              🔒 Gestión de inventario, finanzas y personal restringidos al administrador
            </div>
          )}

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
            <span>Ver Catálogo</span>
          </Link>
        </nav>

        {/* Footer sidebar con Usuario según Rol, ThemeToggle y Botón de Cerrar Sesión SIEMPRE VISIBLE */}
        <div className="flex-shrink-0 p-4 border-t border-zinc-200 dark:border-zinc-900 space-y-3 bg-white dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold shadow-sm ${
                  rolUsuario === 'admin'
                    ? 'bg-militar-100 dark:bg-militar-950 text-militar-800 dark:text-militar-400 border-militar-300 dark:border-militar-800'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                }`}
              >
                {rolUsuario === 'admin' ? 'A' : 'V'}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-300 truncate">
                  {rolUsuario === 'admin' ? 'Admin' : 'Vendedor'}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">
                  {rolUsuario === 'admin' ? 'Administrador' : 'Cajero POS'}
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <button
            onClick={handleLogout}
            type="button"
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
            title="Cerrar sesión de administrador o vendedor"
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <header className="lg:hidden sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800/80 px-3.5 h-14 flex items-center justify-between transition-colors shadow-xs">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-zinc-300 dark:border-militar-600/30 bg-black flex-shrink-0 shadow-xs">
              <Image
                src="/logo.png"
                alt="Logo Tropas Tunuyán"
                fill
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="font-display font-black text-zinc-900 dark:text-white text-xs sm:text-sm truncate block leading-tight">
                Tropas Tunuyán
              </span>
              <span className="text-[9px] font-mono uppercase tracking-wider text-militar-600 dark:text-militar-400 font-bold block">
                {rolUsuario === 'admin' ? '🛡️ Admin' : '👤 Cajero'}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Link
              href="/catalogo"
              target="_blank"
              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Ver Catálogo Público"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" x2="21" y1="6" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </Link>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
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

        {/* Barra de Navegación Inferior Móvil (Bottom Navigation Bar) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
          <Link
            href="/admin/pos"
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              pathname.startsWith('/admin/pos')
                ? 'text-militar-600 dark:text-militar-400 font-bold bg-militar-50 dark:bg-militar-950/50'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span className="text-[10px] mt-0.5 tracking-tight">POS</span>
          </Link>

          {rolUsuario === 'admin' ? (
            <>
              <Link
                href="/admin/inventario"
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                  pathname.startsWith('/admin/inventario')
                    ? 'text-militar-600 dark:text-militar-400 font-bold bg-militar-50 dark:bg-militar-950/50'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
                <span className="text-[10px] mt-0.5 tracking-tight">Stock</span>
              </Link>

              <Link
                href="/admin/finanzas"
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                  pathname.startsWith('/admin/finanzas')
                    ? 'text-militar-600 dark:text-militar-400 font-bold bg-militar-50 dark:bg-militar-950/50'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" x2="12" y1="2" y2="22" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span className="text-[10px] mt-0.5 tracking-tight">Caja</span>
              </Link>

              <Link
                href="/admin/turnos"
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                  pathname.startsWith('/admin/turnos')
                    ? 'text-militar-600 dark:text-militar-400 font-bold bg-militar-50 dark:bg-militar-950/50'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <span className="text-[10px] mt-0.5 tracking-tight">Turnos</span>
              </Link>
            </>
          ) : (
            <Link
              href="/catalogo"
              target="_blank"
              className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" x2="21" y1="6" y2="6" />
              </svg>
              <span className="text-[10px] mt-0.5 tracking-tight">Catálogo</span>
            </Link>
          )}
        </nav>

        <main className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
