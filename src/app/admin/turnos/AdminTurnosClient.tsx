'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { TurnoCaja } from '@/types/database';
import {
  obtenerTurnoActivo,
  obtenerHistorialTurnos,
  EVENTO_TURNO_ACTUALIZADO,
} from '@/lib/finanzas';
import {
  obtenerEmpleados,
  guardarEmpleado,
  eliminarEmpleado,
  toggleEstadoEmpleado,
  EVENTO_EMPLEADOS_ACTUALIZADOS,
  type Empleado,
} from '@/lib/empleados';
import { formatPrecio } from '@/lib/utils';
import ModalAperturaTurno from '@/components/admin/ModalAperturaTurno';
import ModalArqueoCiego from '@/components/admin/ModalArqueoCiego';

export default function AdminTurnosClient() {
  // Pestaña activa: 'empleados' o 'turnos'
  const [pestana, setPestana] = useState<'empleados' | 'turnos'>('empleados');

  // Estados de Empleados
  const [empleados, setEmpleados] = useState<Empleado[]>(() => obtenerEmpleados());
  const [modalEmpleadoAbierto, setModalEmpleadoAbierto] = useState(false);
  const [empleadoEnEdicion, setEmpleadoEnEdicion] = useState<Empleado | null>(null);
  const [nombreForm, setNombreForm] = useState('');
  const [rolForm, setRolForm] = useState('');
  const [telefonoForm, setTelefonoForm] = useState('');
  const [activoForm, setActivoForm] = useState(true);

  // Estados de Turnos
  const [turnoActivo, setTurnoActivo] = useState<TurnoCaja | null>(() => obtenerTurnoActivo());
  const [historialTurnos, setHistorialTurnos] = useState<TurnoCaja[]>(() => obtenerHistorialTurnos());
  const [modalAperturaAbierto, setModalAperturaAbierto] = useState(false);
  const [modalArqueoAbierto, setModalArqueoAbierto] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ texto: string; tipo: 'exito' | 'error' } | null>(null);

  const mostrarToast = (texto: string, tipo: 'exito' | 'error' = 'exito') => {
    setToast({ texto, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  // Sincronización en vivo
  useEffect(() => {
    const handlerTurno = () => {
      setTurnoActivo(obtenerTurnoActivo());
      setHistorialTurnos(obtenerHistorialTurnos());
    };
    const handlerEmpleados = () => {
      setEmpleados(obtenerEmpleados());
    };

    window.addEventListener(EVENTO_TURNO_ACTUALIZADO, handlerTurno);
    window.addEventListener(EVENTO_EMPLEADOS_ACTUALIZADOS, handlerEmpleados);

    return () => {
      window.removeEventListener(EVENTO_TURNO_ACTUALIZADO, handlerTurno);
      window.removeEventListener(EVENTO_EMPLEADOS_ACTUALIZADOS, handlerEmpleados);
    };
  }, []);

  // Handlers Empleados
  const abrirModalNuevo = () => {
    setEmpleadoEnEdicion(null);
    setNombreForm('');
    setRolForm('Vendedor Mostrador');
    setTelefonoForm('');
    setActivoForm(true);
    setModalEmpleadoAbierto(true);
  };

  const abrirModalEditar = (emp: Empleado) => {
    setEmpleadoEnEdicion(emp);
    setNombreForm(emp.nombre);
    setRolForm(emp.rol);
    setTelefonoForm(emp.telefono || '');
    setActivoForm(emp.activo);
    setModalEmpleadoAbierto(true);
  };

  const handleGuardarEmpleado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreForm.trim()) {
      mostrarToast('El nombre es obligatorio', 'error');
      return;
    }

    const res = guardarEmpleado({
      id: empleadoEnEdicion?.id,
      nombre: nombreForm,
      rol: rolForm,
      telefono: telefonoForm,
      activo: activoForm,
    });

    setEmpleados(res);
    setModalEmpleadoAbierto(false);
    mostrarToast(empleadoEnEdicion ? 'Empleado actualizado' : 'Empleado agregado');
  };

  const handleEliminarEmpleado = (id: string, nombre: string) => {
    if (confirm(`¿Seguro que deseas eliminar a "${nombre}"?`)) {
      const res = eliminarEmpleado(id);
      setEmpleados(res);
      mostrarToast(`"${nombre}" eliminado`);
    }
  };

  const handleToggleEstado = (id: string) => {
    const res = toggleEstadoEmpleado(id);
    setEmpleados(res);
  };

  // Copiar acta de turno del historial
  const handleCopiarActaTurnoHistorial = (t: TurnoCaja) => {
    const fechaStr = new Date(t.fecha_cierre || t.fecha_apertura).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const desvio = t.diferencia || 0;
    let estadoStr = '✅ CAJA EXACTA (0 DESVÍO)';
    if (desvio > 0) estadoStr = `🟢 SOBRANTE (+ ${formatPrecio(desvio)})`;
    if (desvio < 0) estadoStr = `🔴 FALTANTE (- ${formatPrecio(Math.abs(desvio))})`;

    let msg = `*TROPAS TUNUYÁN — ACTA DE TURNO HISTÓRICA*\n`;
    msg += `*Fecha Cierre:* ${fechaStr}\n`;
    msg += `*Cajero:* ${t.cajero_nombre}\n`;
    msg += `*Fondo Apertura:* ${formatPrecio(t.monto_apertura)}\n`;
    msg += `*Efectivo Declarado:* ${formatPrecio(t.monto_cierre_declarado || 0)}\n`;
    msg += `*Efectivo Esperado:* ${formatPrecio(t.monto_cierre_esperado || 0)}\n`;
    msg += `*Resultado:* ${estadoStr}\n`;
    if (t.observaciones) msg += `*Notas:* ${t.observaciones}\n`;

    navigator.clipboard.writeText(msg);
    mostrarToast('Acta copiada al portapapeles');
  };

  const empleadosActivosCount = empleados.filter((e) => e.activo).length;

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-semibold transition-all animate-slide-up ${
            toast.tipo === 'error'
              ? 'bg-red-950 border border-red-700 text-red-200'
              : 'bg-emerald-950 border border-emerald-700 text-emerald-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-current" />
          {toast.texto}
        </div>
      )}

      {/* ─── Encabezado ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-militar-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-militar-600 dark:text-militar-400">
              Personal & Control de Turnos
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-zinc-900 dark:text-white tracking-tight">
            Gestión de Turnos y Empleados
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Administración del equipo de ventas, asignación de turnos y fiscalización de arqueos de caja.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/pos"
            className="btn-secondary text-xs sm:text-sm px-4 py-2.5 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Ir al POS
          </Link>
          {pestana === 'empleados' && (
            <button
              onClick={abrirModalNuevo}
              className="btn-primary text-xs sm:text-sm px-4 py-2.5 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Nuevo Empleado
            </button>
          )}
        </div>
      </div>

      {/* ─── Pestañas Superiores ─── */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-8">
        <button
          onClick={() => setPestana('empleados')}
          className={`pb-3 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-colors ${
            pestana === 'empleados'
              ? 'border-militar-600 text-militar-700 dark:text-militar-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Personal / Vendedores</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 font-mono">
            {empleadosActivosCount} activos
          </span>
        </button>

        <button
          onClick={() => setPestana('turnos')}
          className={`pb-3 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-colors ${
            pestana === 'turnos'
              ? 'border-militar-600 text-militar-700 dark:text-militar-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Control de Turnos & Arqueos</span>
          {turnoActivo && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              1 en curso
            </span>
          )}
        </button>
      </div>

      {/* ─── CONTENIDO PESTAÑA: EMPLEADOS ─── */}
      {pestana === 'empleados' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {empleados.map((emp) => (
              <div
                key={emp.id}
                className={`card p-5 border transition-all ${
                  emp.activo
                    ? 'border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm'
                    : 'border-zinc-200/60 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/20 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                        emp.activo
                          ? 'bg-militar-100 dark:bg-militar-950 text-militar-800 dark:text-militar-400 border border-militar-300 dark:border-militar-800'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {emp.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-zinc-900 dark:text-white leading-tight">
                        {emp.nombre}
                      </h3>
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 mt-0.5">
                        {emp.rol}
                      </span>
                    </div>
                  </div>

                  {/* Estado Activo / Inactivo */}
                  <button
                    onClick={() => handleToggleEstado(emp.id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                      emp.activo
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                        : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-500'
                    }`}
                    title={emp.activo ? 'Clic para desactivar' : 'Clic para activar'}
                  >
                    {emp.activo ? '● Activo' : '○ Inactivo'}
                  </button>
                </div>

                {emp.telefono && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>{emp.telefono}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                  <span className="text-[11px] text-zinc-400">
                    Aparece en POS: {emp.activo ? 'Sí' : 'No'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => abrirModalEditar(emp)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminarEmpleado(emp.id, emp.nombre)}
                      className="px-2 py-1 text-xs font-semibold rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Eliminar empleado"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── CONTENIDO PESTAÑA: TURNOS & ARQUEOS ─── */}
      {pestana === 'turnos' && (
        <div className="space-y-8">
          {/* Tarjeta de Turno Actual Activo */}
          <div className="card p-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    turnoActivo ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                  }`}
                />
                <div>
                  <h2 className="text-lg font-display font-black text-zinc-900 dark:text-white">
                    {turnoActivo ? 'Turno en Operación Actual' : 'No Hay Turno Abierto'}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    {turnoActivo
                      ? `Responsable a cargo: ${turnoActivo.cajero_nombre}`
                      : 'El punto de venta requiere abrir turno para auditar ingresos en efectivo.'}
                  </p>
                </div>
              </div>

              <div>
                {turnoActivo ? (
                  <button
                    onClick={() => setModalArqueoAbierto(true)}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-colors"
                  >
                    <span>🔒</span>
                    Realizar Arqueo Ciego y Cerrar Turno
                  </button>
                ) : (
                  <button
                    onClick={() => setModalAperturaAbierto(true)}
                    className="btn-primary text-xs sm:text-sm px-4 py-2.5 flex items-center gap-2"
                  >
                    <span>⚡</span>
                    Abrir Nuevo Turno
                  </button>
                )}
              </div>
            </div>

            {turnoActivo && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                <div>
                  <span className="text-zinc-500 block">Fondo Inicial:</span>
                  <span className="text-base font-mono font-bold text-zinc-900 dark:text-white">
                    {formatPrecio(turnoActivo.monto_apertura)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Hora Apertura:</span>
                  <span className="text-base font-mono font-bold text-zinc-900 dark:text-white">
                    {new Date(turnoActivo.fecha_apertura).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    hs
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Ventas Efectivo:</span>
                  <span className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatPrecio(turnoActivo.total_ventas_efectivo || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Cobros Digitales:</span>
                  <span className="text-base font-mono font-bold text-sky-600 dark:text-sky-400">
                    +{formatPrecio(turnoActivo.total_ventas_digital || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Historial de Turnos Anteriores */}
          <div className="space-y-4">
            <h2 className="text-lg font-display font-black text-zinc-900 dark:text-white">
              Historial de Turnos y Auditorías
            </h2>

            {historialTurnos.length === 0 ? (
              <div className="card p-8 text-center text-zinc-500 text-sm">
                No hay turnos cerrados en el historial aún.
              </div>
            ) : (
              <div className="card overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="p-3.5">Fecha y Horario</th>
                        <th className="p-3.5">Cajero / Turno</th>
                        <th className="p-3.5">Fondo Inicial</th>
                        <th className="p-3.5">Declarado (Gaveta)</th>
                        <th className="p-3.5">Esperado</th>
                        <th className="p-3.5">Desvío Auditoría</th>
                        <th className="p-3.5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {historialTurnos.map((t) => {
                        const desvio = t.diferencia || 0;
                        return (
                          <tr
                            key={t.id}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            <td className="p-3.5 font-mono text-[11px]">
                              {new Date(t.fecha_apertura).toLocaleDateString('es-AR')}{' '}
                              <span className="text-zinc-400">
                                {new Date(t.fecha_apertura).toLocaleTimeString('es-AR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-zinc-900 dark:text-white">
                              {t.cajero_nombre}
                            </td>
                            <td className="p-3.5 font-mono">
                              {formatPrecio(t.monto_apertura)}
                            </td>
                            <td className="p-3.5 font-mono font-bold text-amber-600 dark:text-amber-400">
                              {formatPrecio(t.monto_cierre_declarado || 0)}
                            </td>
                            <td className="p-3.5 font-mono text-zinc-500">
                              {formatPrecio(t.monto_cierre_esperado || 0)}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                  desvio === 0
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300'
                                    : desvio > 0
                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-300'
                                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-300'
                                }`}
                              >
                                {desvio === 0
                                  ? 'Exacto ($0)'
                                  : desvio > 0
                                  ? `+${formatPrecio(desvio)}`
                                  : `-${formatPrecio(Math.abs(desvio))}`}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => handleCopiarActaTurnoHistorial(t)}
                                className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold transition-colors"
                                title="Copiar acta oficial de arqueo"
                              >
                                Copiar Acta
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL CREAR / EDITAR EMPLEADO ─── */}
      {modalEmpleadoAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalEmpleadoAbierto(false);
          }}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-zinc-900 text-white p-5 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-display font-black text-white">
                {empleadoEnEdicion ? 'Editar Empleado' : 'Nuevo Empleado / Cajero'}
              </h2>
              <button
                type="button"
                onClick={() => setModalEmpleadoAbierto(false)}
                className="text-zinc-400 hover:text-white p-1 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarEmpleado} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={nombreForm}
                  onChange={(e) => setNombreForm(e.target.value)}
                  placeholder="Ej: Facundo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-militar-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1">
                  Rol / Turno Habitual *
                </label>
                <input
                  type="text"
                  required
                  value={rolForm}
                  onChange={(e) => setRolForm(e.target.value)}
                  placeholder="Ej: Turno Mañana / Mostrador"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-militar-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1">
                  Teléfono / WhatsApp (Opcional)
                </label>
                <input
                  type="text"
                  value={telefonoForm}
                  onChange={(e) => setTelefonoForm(e.target.value)}
                  placeholder="Ej: +54 9 2622 12-3456"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-militar-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={activoForm}
                    onChange={(e) => setActivoForm(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-militar-600 focus:ring-militar-500"
                  />
                  <span>Empleado Activo (habilitado para operar ventas en POS)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalEmpleadoAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary px-5 py-2 text-xs font-bold"
                >
                  Guardar Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Apertura Turno */}
      {modalAperturaAbierto && (
        <ModalAperturaTurno
          abierto={modalAperturaAbierto}
          onClose={() => setModalAperturaAbierto(false)}
          cajeroActual={empleadosActivosCount > 0 ? `${empleados[0].nombre} (${empleados[0].rol})` : 'Mostrador'}
          onTurnoAbierto={(t) => {
            setTurnoActivo(t);
            setModalAperturaAbierto(false);
            mostrarToast('Turno abierto con éxito');
          }}
        />
      )}

      {/* Modal Arqueo Ciego */}
      {modalArqueoAbierto && turnoActivo && (
        <ModalArqueoCiego
          abierto={modalArqueoAbierto}
          onClose={() => setModalArqueoAbierto(false)}
          turnoActivo={turnoActivo}
          onTurnoCerrado={(tFinal) => {
            setTurnoActivo(null);
            setHistorialTurnos(obtenerHistorialTurnos());
            setModalArqueoAbierto(false);
            mostrarToast('Turno cerrado y auditado');
          }}
        />
      )}
    </div>
  );
}
