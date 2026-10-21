import CatalogoHeader from '@/components/CatalogoHeader';
import Image from 'next/image';

/**
 * Layout para las páginas públicas del catálogo.
 * Incluye el header fijo con navegación.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <CatalogoHeader />
      <main className="flex-1">{children}</main>

      {/* Footer público adaptativo */}
      <footer className="border-t border-zinc-200 dark:border-zinc-900 bg-white/90 dark:bg-zinc-950/70 py-10 mt-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-zinc-200 dark:border-zinc-900">
            {/* Columna Marca */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="relative w-8 h-8 rounded-md overflow-hidden border border-zinc-300 dark:border-militar-600/30 bg-black flex-shrink-0 shadow-sm">
                  <Image
                    src="/logo.png"
                    alt="Tropas Tunuyán"
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="font-display font-bold text-zinc-900 dark:text-white text-base">
                  Tropas Tunuyán
                </span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">
                Especialistas en indumentaria militar, borceguíes tácticos, chalecos balísticos y accesorios reglamentarios para fuerzas de seguridad y personal civil.
              </p>
            </div>

            {/* Columna Regulación */}
            <div>
              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wider mb-2">
                Aviso Legal y Venta Regulada
              </h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
                La comercialización de material balístico y complementos oficiales está regulada por la normativa vigente. Los artículos con requisito de credencial exigen presentación de credencial oficial previo a la entrega.
              </p>
            </div>

            {/* Columna Contacto & Ubicación */}
            <div>
              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wider mb-2">
                Ubicación & Contacto
              </h4>
              <p className="text-zinc-600 dark:text-zinc-400 text-xs flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-militar-600 dark:text-militar-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>Tunuyán, Valle de Uco, Mendoza, Argentina</span>
              </p>
              <p className="text-zinc-500 text-xs mt-1">
                Atención personalizada para dependencias policiales, penitenciarias y empresas de seguridad.
              </p>
            </div>
          </div>

          {/* Barra inferior */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-500">
            <p>
              © {new Date().getFullYear()} Tropas Tunuyán — Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="https://wa.me/5492622000000"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                WhatsApp Oficial
              </a>
              {/* Acceso discreto para administración */}
              <a
                href="/admin/inventario"
                className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors inline-flex items-center gap-1 text-[11px]"
                title="Acceso exclusivo para personal administrativo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Acceso Personal
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
