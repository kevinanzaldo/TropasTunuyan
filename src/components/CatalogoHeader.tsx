import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from './ThemeToggle';

/**
 * Header del catálogo público con navegación y marca.
 */
export default function CatalogoHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800/60 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo y Nombre */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-lg overflow-hidden border border-zinc-200 dark:border-militar-600/30 group-hover:border-militar-500 transition-colors bg-black flex-shrink-0 shadow-md">
              <Image
                src="/logo.png"
                alt="Logo Tropas Tunuyán"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="truncate">
              <span className="font-display font-bold text-zinc-900 dark:text-white text-base sm:text-lg leading-none tracking-wide block truncate">
                Tropas Tunuyán
              </span>
              <span className="hidden sm:block text-[10px] text-zinc-500 dark:text-zinc-400 font-medium tracking-wider uppercase mt-0.5">
                Indumentaria Militar & Seguridad
              </span>
            </div>
          </Link>

          {/* Navegación y Acciones Responsive */}
          <nav className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* Botón Catálogo (visible en sm+) */}
            <Link
              href="/catalogo"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-militar-700 dark:text-militar-400 bg-militar-50 dark:bg-militar-600/10 border border-militar-200 dark:border-militar-600/30 hover:bg-militar-100 dark:hover:bg-militar-600/20 transition-colors"
            >
              Catálogo
            </Link>

            {/* Botón WhatsApp: Compacto en móviles, completo en desktop */}
            <a
              href="https://wa.me/5492622000000?text=Hola%20Tropas%20Tunuy%C3%A1n,%20quisiera%20hacer%20una%20consulta%20sobre%20su%20equipamiento"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all shadow-xs"
              title="Atención directa por WhatsApp para efectivos"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              <span className="hidden sm:inline">Atención Efectivos</span>
              <span className="sm:hidden text-[11px] font-bold">WhatsApp</span>
            </a>

            {/* Botón Admin: Discreto y adaptado a mobile */}
            <Link
              href="/admin/inventario"
              className="inline-flex items-center gap-1 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900/80 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors shadow-2xs"
              title="Acceso al panel administrativo y control de inventario"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="hidden md:inline">Admin</span>
            </Link>

            {/* Alternador de Tema */}
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
