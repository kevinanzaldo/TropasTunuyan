import Link from 'next/link';
import Image from 'next/image';

/**
 * Página principal — redirige al catálogo público.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-militar-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-militar-600/5 rounded-full blur-[96px]" />
      </div>

      {/* Hero */}
      <div className="text-center max-w-3xl animate-fade-in flex flex-col items-center">
        {/* Logo oficial */}
        <div className="mb-6 relative group">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-militar-600/40 via-militar-500/20 to-militar-700/40 blur-lg opacity-75 group-hover:opacity-100 transition duration-500" />
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-2 border-militar-600/40 bg-black shadow-2xl shadow-militar-950 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Tropas Tunuyán - Indumentaria Militar y Fuerzas de Seguridad"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Marca */}
        <div className="mb-4 inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-militar-600/10 border border-militar-600/20">
          <div className="w-2 h-2 rounded-full bg-militar-500 animate-pulse-slow" />
          <span className="text-militar-400 text-xs sm:text-sm font-semibold tracking-wider uppercase">
            Indumentaria Militar y Fuerzas de Seguridad
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-black text-white mb-4 sm:mb-6 leading-tight">
          Tropas{' '}
          <span className="text-gradient">Tunuyán</span>
        </h1>

        <p className="text-base sm:text-xl text-slate-400 mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed px-2">
          Equipamiento e indumentaria profesional para fuerzas armadas, seguridad privada y uso táctico.
        </p>

        {/* CTAs adaptados a mobile con ancho completo y flex-row en desktop */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none">
          <Link href="/catalogo" className="btn-primary text-sm sm:text-base px-8 py-3.5 rounded-xl w-full sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" x2="21" y1="6" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            Ver Catálogo
          </Link>
          <Link href="/admin/inventario" className="btn-secondary text-sm sm:text-base px-8 py-3.5 rounded-xl w-full sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Panel Admin
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-center text-zinc-600 text-sm">
        <p>© {new Date().getFullYear()} Tropas Tunuyán — Tunuyán, Mendoza</p>
      </footer>
    </main>
  );
}
