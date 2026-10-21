'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Si ya tiene sesión activa, redirigir directo al inventario
  useEffect(() => {
    const sesion = localStorage.getItem('tropas_admin_auth');
    if (sesion === 'authenticated') {
      router.replace('/admin/inventario');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setCargando(true);

    try {
      // 1. Intento con Supabase Auth si está configurado un usuario en Supabase
      const { data: supaData, error: supaError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (!supaError && supaData?.session) {
        localStorage.setItem('tropas_admin_auth', 'authenticated');
        localStorage.setItem('tropas_admin_email', email.trim());
        router.push('/admin/inventario');
        return;
      }

      // 2. Credenciales maestras del sistema (admin@tropastunuyan.com / admin123)
      // Permite ingreso inmediato sin requerir configuración manual previa de usuarios en Supabase Auth
      const esAdminPorDefecto =
        (email.trim().toLowerCase() === 'admin@tropastunuyan.com' && password === 'admin123') ||
        (email.trim().toLowerCase() === 'admin' && password === 'admin123') ||
        (email.trim().toLowerCase() === 'kevin' && password === 'admin123');

      if (esAdminPorDefecto) {
        localStorage.setItem('tropas_admin_auth', 'authenticated');
        localStorage.setItem('tropas_admin_email', email.trim());
        router.push('/admin/inventario');
        return;
      }

      setErrorMsg('Credenciales inválidas. Verificá tu correo y contraseña.');
    } catch {
      setErrorMsg('Ocurrió un error al procesar el ingreso. Intentá nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  const autocompletarDemo = () => {
    setEmail('admin@tropastunuyan.com');
    setPassword('admin123');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-zinc-100 dark:bg-zinc-950 bg-tactical-grid transition-colors relative">
      {/* Botón flotante para cambiar tema */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <Link
          href="/catalogo"
          className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-3 py-1.5 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 transition-colors shadow-sm"
        >
          ← Catálogo
        </Link>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Tarjeta de Login */}
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          {/* Cabecera / Marca */}
          <div className="text-center mb-6">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-zinc-300 dark:border-militar-600/40 bg-black mx-auto mb-3 shadow-md">
              <Image
                src="/logo.png"
                alt="Tropas Tunuyán"
                fill
                className="object-cover"
                priority
              />
            </div>
            <h1 className="text-2xl font-display font-extrabold text-zinc-900 dark:text-white tracking-wide">
              Acceso a Administración
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Terminal segura de control de inventario y pedidos
            </p>
          </div>

          {/* Mensaje de Error */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <input
                  type="email"
                  required
                  placeholder="admin@tropastunuyan.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-militar-600 focus:ring-1 focus:ring-militar-600 transition-colors shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-militar-600 focus:ring-1 focus:ring-militar-600 transition-colors shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  title={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {mostrarPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={cargando}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-militar-600 hover:bg-militar-500 active:bg-militar-700 shadow-md shadow-militar-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cargando ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verificando credenciales...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" x2="3" y1="12" y2="12" />
                    </svg>
                    <span>Ingresar al Panel Operativo</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Ayuda de acceso demo */}
          <div className="mt-6 pt-5 border-t border-zinc-200 dark:border-zinc-800 text-center">
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
              Credenciales habilitadas para administración:
            </p>
            <button
              type="button"
              onClick={autocompletarDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-militar-700 dark:text-militar-400 bg-militar-50 dark:bg-militar-600/10 border border-militar-200 dark:border-militar-600/30 hover:bg-militar-100 dark:hover:bg-militar-600/20 transition-colors"
            >
              <span>admin@tropastunuyan.com</span>
              <span className="text-zinc-400">/</span>
              <span>admin123</span>
              <span className="ml-1 text-[10px] text-zinc-500 underline">Autocompletar</span>
            </button>
          </div>
        </div>

        {/* Footer discreto */}
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-500 mt-6">
          © {new Date().getFullYear()} Tropas Tunuyán — Uso oficial restringido
        </p>
      </div>
    </div>
  );
}
