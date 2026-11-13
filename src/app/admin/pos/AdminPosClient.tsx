'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type {
  ProductoConVariantes,
  Categoria,
  Variante,
  VentaItemCarrito,
  Venta,
  MetodoPagoTipo,
  TurnoCaja,
} from '@/types/database';
import { supabase } from '@/lib/supabase';
import { formatPrecio } from '@/lib/utils';
import {
  registrarVentaEnFinanzas,
  obtenerTurnoActivo,
  EVENTO_TURNO_ACTUALIZADO,
} from '@/lib/finanzas';
import { obtenerEmpleados, EVENTO_EMPLEADOS_ACTUALIZADOS, Empleado } from '@/lib/empleados';
import ModalVerificacionCredencial from '@/components/admin/ModalVerificacionCredencial';
import ModalCobroTactico from '@/components/admin/ModalCobroTactico';
import ModalTicketVenta from '@/components/admin/ModalTicketVenta';
import ModalAperturaTurno from '@/components/admin/ModalAperturaTurno';
import ModalArqueoCiego from '@/components/admin/ModalArqueoCiego';

interface Props {
  initialProductos: ProductoConVariantes[];
  categorias: Categoria[];
}

const DEFAULT_IMAGES: Record<string, string> = {
  'Uniforme Táctico Ripstop': '/productos/uniforme.png',
  'Borceguí Táctico Cuero': '/productos/borcegui.png',
  'Chaleco Antibalas Nivel IIIA': '/productos/chaleco.png',
  'Cinturón Táctico Militar': '/productos/cinturon.png',
  'Funda Pistolera Nivel II': '/productos/funda.png',
};

export default function AdminPosClient({ initialProductos, categorias }: Props) {
  // Catálogo y estado de productos (con stock dinámico)
  const [productos, setProductos] = useState<ProductoConVariantes[]>(initialProductos);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Lista dinámica de empleados / cajeros
  const [empleados, setEmpleados] = useState<Empleado[]>(() => obtenerEmpleados());

  const listaVendedores = useMemo(() => {
    const activos = empleados.filter((e) => e.activo);
    if (activos.length === 0) return ['Mostrador General'];
    return activos.map((e) => `${e.nombre} (${e.rol})`);
  }, [empleados]);

  // Vendedor activo
  const [vendedorActivo, setVendedorActivo] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const guardado = localStorage.getItem('tropas_pos_cajero');
      if (guardado) return guardado;
    }
    const iniciales = obtenerEmpleados().filter((e) => e.activo);
    return iniciales.length > 0 ? `${iniciales[0].nombre} (${iniciales[0].rol})` : 'Mostrador General';
  });

  useEffect(() => {
    const handler = () => {
      const nuevos = obtenerEmpleados();
      setEmpleados(nuevos);
    };
    window.addEventListener(EVENTO_EMPLEADOS_ACTUALIZADOS, handler);
    return () => window.removeEventListener(EVENTO_EMPLEADOS_ACTUALIZADOS, handler);
  }, []);

  // Carrito de ventas
  const [carrito, setCarrito] = useState<VentaItemCarrito[]>([]);

  // Modal selector de variante si el producto tiene varias
  const [productoParaVariante, setProductoParaVariante] = useState<ProductoConVariantes | null>(null);

  // Estados de control de credencial obligatoria (HU 3.2)
  const [modalCredencialAbierto, setModalCredencialAbierto] = useState(false);
  const [credencialInfo, setCredencialInfo] = useState<{
    fuerzaInstitucion: string;
    legajo: string;
    verificada: boolean;
  } | null>(null);

  // Estados de Cobro y Ticket
  const [modalCobroAbierto, setModalCobroAbierto] = useState(false);
  const [modalTicketAbierto, setModalTicketAbierto] = useState(false);
  const [ultimaVentaRegistrada, setUltimaVentaRegistrada] = useState<Venta | null>(null);
  const [ultimoVuelto, setUltimoVuelto] = useState(0);

  // Estados de Turno y Arqueo Ciego (HU 3.3)
  const [turnoActivo, setTurnoActivo] = useState<TurnoCaja | null>(null);
  const [modalAperturaAbierto, setModalAperturaAbierto] = useState(false);
  const [modalArqueoAbierto, setModalArqueoAbierto] = useState(false);

  // Notificaciones Toast
  const [toast, setToast] = useState<{ texto: string; tipo: 'exito' | 'error' | 'alerta' } | null>(null);

  const mostrarToast = (texto: string, tipo: 'exito' | 'error' | 'alerta' = 'exito') => {
    setToast({ texto, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const inputBusquedaRef = useRef<HTMLInputElement>(null);

  // Persistir cajero seleccionado
  const handleCambiarVendedor = (nombre: string) => {
    setVendedorActivo(nombre);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tropas_pos_cajero', nombre);
    }
  };

  // Sincronizar turno activo al montar y al recibir eventos de turno
  useEffect(() => {
    const cargarTurno = () => {
      const act = obtenerTurnoActivo();
      setTurnoActivo(act);
      if (act && act.cajero_nombre) {
        setVendedorActivo(act.cajero_nombre);
      }
    };

    cargarTurno();
    window.addEventListener(EVENTO_TURNO_ACTUALIZADO, cargarTurno);
    window.addEventListener('storage', cargarTurno);

    return () => {
      window.removeEventListener(EVENTO_TURNO_ACTUALIZADO, cargarTurno);
      window.removeEventListener('storage', cargarTurno);
    };
  }, []);

  // Atajo de teclado para enfocar buscador con la tecla F2 o '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' || (e.key === '/' && (e.target as HTMLElement)?.tagName !== 'INPUT')) {
        e.preventDefault();
        inputBusquedaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Filtrado de productos ───
  const productosFiltrados = useMemo(() => {
    let res = [...productos];
    if (categoriaSeleccionada) {
      res = res.filter((p) => p.categoria_id === categoriaSeleccionada);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      res = res.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.descripcion?.toLowerCase().includes(q) ||
          p.variantes?.some((v) => v.talle.toLowerCase().includes(q) || v.color.toLowerCase().includes(q))
      );
    }
    return res;
  }, [productos, categoriaSeleccionada, busqueda]);

  // Verificar si el carrito actual contiene artículos restringidos
  const itemsRestringidos = useMemo(() => {
    return carrito.filter((it) => it.exige_credencial);
  }, [carrito]);

  const exigeCredencialEnCarrito = itemsRestringidos.length > 0;
  const credencialValida = !exigeCredencialEnCarrito || (credencialInfo?.verificada ?? false);

  // ─── Agregar Ítem al Carrito ───
  const agregarVarianteAlCarrito = (producto: ProductoConVariantes, variante: Variante) => {
    if (variante.stock <= 0) {
      mostrarToast(`Sin stock para ${producto.nombre} (${variante.talle}/${variante.color})`, 'alerta');
      return;
    }

    setCarrito((prev) => {
      const existente = prev.find((it) => it.variante_id === variante.id);
      if (existente) {
        if (existente.cantidad >= variante.stock) {
          mostrarToast(`Alcanzó el stock físico máximo disponible (${variante.stock} u.)`, 'alerta');
          return prev;
        }
        return prev.map((it) =>
          it.variante_id === variante.id
            ? { ...it, cantidad: it.cantidad + 1, subtotal: (it.cantidad + 1) * it.precio }
            : it
        );
      }

      const nuevo: VentaItemCarrito = {
        variante_id: variante.id,
        producto_id: producto.id,
        nombre: producto.nombre,
        talle: variante.talle,
        color: variante.color,
        precio: producto.precio,
        cantidad: 1,
        subtotal: producto.precio,
        exige_credencial: producto.exige_credencial,
        imagen_url: producto.imagen_url || DEFAULT_IMAGES[producto.nombre] || null,
        stock_disponible: variante.stock,
      };

      return [...prev, nuevo];
    });

    mostrarToast(`Agregado: ${producto.nombre} (${variante.talle})`);
    setProductoParaVariante(null);
  };

  const handleClickProducto = (prod: ProductoConVariantes) => {
    if (!prod.variantes || prod.variantes.length === 0) {
      mostrarToast('Este producto no tiene talles ni variantes configuradas', 'alerta');
      return;
    }

    // Si tiene exactamente 1 variante, agregarla directo
    if (prod.variantes.length === 1) {
      agregarVarianteAlCarrito(prod, prod.variantes[0]);
    } else {
      // Abrir selector de talle/variante
      setProductoParaVariante(prod);
    }
  };

  // Modificar cantidad en carrito
  const actualizarCantidad = (varianteId: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((it) => {
          if (it.variante_id !== varianteId) return it;
          const nuevaCant = it.cantidad + delta;
          if (nuevaCant <= 0) return null;
          if (nuevaCant > it.stock_disponible) {
            mostrarToast(`Stock máximo disponible: ${it.stock_disponible} unidades`, 'alerta');
            return it;
          }
          return {
            ...it,
            cantidad: nuevaCant,
            subtotal: nuevaCant * it.precio,
          };
        })
        .filter(Boolean) as VentaItemCarrito[]
    );
  };

  const eliminarDelCarrito = (varianteId: string) => {
    setCarrito((prev) => prev.filter((it) => it.variante_id !== varianteId));
  };

  const vaciarCarrito = () => {
    if (carrito.length === 0) return;
    if (confirm('¿Vaciar mostrador y cancelar pedido actual?')) {
      setCarrito([]);
      setCredencialInfo(null);
    }
  };

  // Cálculos de Totales
  const totalArticulos = carrito.reduce((sum, it) => sum + it.cantidad, 0);
  const totalVenta = carrito.reduce((sum, it) => sum + it.subtotal, 0);

  // ─── Proceso de Cobro ───
  const handleIniciarCobro = () => {
    if (carrito.length === 0) {
      mostrarToast('El carrito está vacío. Agregue productos para cobrar.', 'alerta');
      return;
    }

    // Si no hay turno abierto, abrir modal de apertura de turno con fondo inicial (HU 3.3)
    if (!turnoActivo) {
      mostrarToast('Abra su turno con el fondo de cambio antes de cobrar', 'alerta');
      setModalAperturaAbierto(true);
      return;
    }

    // Si exige credencial y no está validada, obligar a validarla primero
    if (exigeCredencialEnCarrito && (!credencialInfo || !credencialInfo.verificada)) {
      setModalCredencialAbierto(true);
      return;
    }

    // Si ya está acreditada o no requiere credencial, abrir modal de cobro
    setModalCobroAbierto(true);
  };

  // ─── Confirmación y Cierre de Venta ───
  const handleConfirmarVentaFinal = async ({
    metodoPago,
    montoEfectivo,
    montoDigital,
    nroComprobanteDigital,
    vuelto,
  }: {
    metodoPago: MetodoPagoTipo;
    montoEfectivo: number;
    montoDigital: number;
    nroComprobanteDigital: string;
    vuelto: number;
  }) => {
    setModalCobroAbierto(false);
    setUltimoVuelto(vuelto);

    // 1. Generar número de ticket único con timestamp
    const hoyStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const numeroTicket = `TT-${hoyStr}-${randNum}`;

    const ventaData: Venta = {
      id: `venta-${Date.now()}`,
      numero_ticket: numeroTicket,
      cajero_nombre: vendedorActivo,
      turno_id: turnoActivo?.id || null,
      total: totalVenta,
      metodo_pago: metodoPago,
      monto_efectivo: montoEfectivo,
      monto_digital: montoDigital,
      nro_comprobante_digital: nroComprobanteDigital || null,
      exigio_credencial: exigeCredencialEnCarrito,
      fuerza_institucion: credencialInfo?.fuerzaInstitucion || null,
      credencial_verificada: credencialInfo?.verificada || false,
      legajo_comprador: credencialInfo?.legajo || null,
      created_at: new Date().toISOString(),
    };

    // 2. Descontar Stock atómico en estado local
    setProductos((prevProds) =>
      prevProds.map((prod) => ({
        ...prod,
        variantes: (prod.variantes || []).map((v) => {
          const itemVendido = carrito.find((it) => it.variante_id === v.id);
          if (itemVendido) {
            return {
              ...v,
              stock: Math.max(0, v.stock - itemVendido.cantidad),
            };
          }
          return v;
        }),
      }))
    );

    // 3. Registrar venta y movimiento financiero en Finanzas & Caja (sincronizado)
    await registrarVentaEnFinanzas(ventaData, carrito);

    // 4. Descontar stock en Supabase (asíncrono, con fallback seguro)
    try {
      for (const item of carrito) {
        const prod = productos.find((p) => p.id === item.producto_id);
        const v = prod?.variantes?.find((varItem) => varItem.id === item.variante_id);
        if (v) {
          const nuevoStock = Math.max(0, v.stock - item.cantidad);
          await supabase.from('variantes').update({ stock: nuevoStock }).eq('id', item.variante_id);
        }
      }
    } catch {
      // Ignorar si no hay conexión; se mantiene el registro offline
    }

    // 5. Preparar y abrir Modal de Ticket
    setUltimaVentaRegistrada(ventaData);
    setModalTicketAbierto(true);
    mostrarToast(`¡Venta ${numeroTicket} confirmada y registrada en Caja!`);
  };

  const handleNuevaVenta = () => {
    setModalTicketAbierto(false);
    setCarrito([]);
    setCredencialInfo(null);
    setUltimaVentaRegistrada(null);
    setUltimoVuelto(0);
    inputBusquedaRef.current?.focus();
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-semibold transition-all animate-slide-up ${
            toast.tipo === 'error'
              ? 'bg-red-950 border border-red-700 text-red-200'
              : toast.tipo === 'alerta'
              ? 'bg-amber-950 border border-amber-700 text-amber-200'
              : 'bg-emerald-950 border border-emerald-700 text-emerald-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-current" />
          {toast.texto}
        </div>
      )}

      {/* ─── BARRA DE ESTADO SUPERIOR DEL MOSTRADOR ─── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-militar-600/10 dark:bg-militar-500/20 border border-militar-600/30 flex items-center justify-center text-militar-600 dark:text-militar-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h12" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-militar-700 dark:text-militar-400">
                Punto de Venta Mostrador (POS)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-black text-zinc-900 dark:text-white">
              Caja & Atención Rápida
            </h1>
          </div>
        </div>

        {/* Selector de Cajero / Vendedor Activo */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium hidden sm:inline">Cajero:</span>
            <select
              value={vendedorActivo}
              onChange={(e) => handleCambiarVendedor(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-militar-500"
            >
              {listaVendedores.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <Link
              href="/admin/turnos"
              className="p-1.5 text-zinc-400 hover:text-militar-600 dark:hover:text-militar-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Gestionar Turnos y Empleados"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </Link>
          </div>

          {/* Control de Turno y Arqueo Ciego (HU 3.3) */}
          <div className="flex items-center gap-2">
            {turnoActivo ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Turno Abierto
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Fondo: {formatPrecio(turnoActivo.monto_apertura)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setModalArqueoAbierto(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                  title="Cerrar turno con conteo ciego de billetes"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Arqueo Ciego
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setModalAperturaAbierto(true)}
                className="px-3 py-1.5 rounded-xl bg-militar-600 hover:bg-militar-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <span>+</span>
                Abrir Turno
              </button>
            )}

            <Link
              href="/admin/finanzas"
              className="btn-secondary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" x2="12" y1="2" y2="22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Caja
            </Link>
          </div>
        </div>
      </div>

      {/* ─── CUERPO PRINCIPAL DEL POS: 2 COLUMNAS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLUMNA IZQUIERDA (7 cols): Catálogo & Buscador */}
        <div className="lg:col-span-7 space-y-4">
          {/* Buscador Rápido con soporte Lector de Código de Barras */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputBusquedaRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && productosFiltrados.length === 1) {
                    handleClickProducto(productosFiltrados[0]);
                    setBusqueda('');
                  }
                }}
                placeholder="Escanear código de barras o buscar por nombre (Atajo: F2)..."
                className="w-full pl-11 pr-24 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-militar-500 focus:outline-none transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-400 border border-zinc-300 dark:border-zinc-700 px-1.5 py-0.5 rounded">
                ENTER p/ agregar
              </span>
            </div>

            {/* Filtros por Categoría */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setCategoriaSeleccionada(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  categoriaSeleccionada === null
                    ? 'bg-militar-600 text-white shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                Todos ({productos.length})
              </button>
              {categorias.map((cat) => {
                const count = productos.filter((p) => p.categoria_id === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoriaSeleccionada(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      categoriaSeleccionada === cat.id
                        ? 'bg-militar-600 text-white shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                    }`}
                  >
                    {cat.nombre} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid de Productos Disponibles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {productosFiltrados.map((prod) => {
              const stockTotal = prod.variantes?.reduce((s, v) => s + v.stock, 0) || 0;
              const sinStock = stockTotal === 0;
              const imagenSrc = prod.imagen_url || DEFAULT_IMAGES[prod.nombre];

              return (
                <div
                  key={prod.id}
                  onClick={() => !sinStock && handleClickProducto(prod)}
                  className={`bg-white dark:bg-zinc-900 border rounded-2xl p-3 flex flex-col justify-between transition-all select-none ${
                    sinStock
                      ? 'opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-800'
                      : 'cursor-pointer hover:border-militar-500 hover:shadow-lg dark:hover:shadow-militar-950/40 border-zinc-200 dark:border-zinc-800 active:scale-98'
                  }`}
                >
                  <div>
                    {/* Imagen miniatura */}
                    <div className="relative w-full h-28 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-800 mb-2 flex items-center justify-center">
                      {imagenSrc ? (
                        <Image
                          src={imagenSrc}
                          alt={prod.nombre}
                          fill
                          className="object-contain p-1"
                        />
                      ) : (
                        <span className="text-2xl">📦</span>
                      )}

                      {/* Badge Credencial si exige */}
                      {prod.exige_credencial && (
                        <span className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow">
                          CREDENCIAL
                        </span>
                      )}

                      {/* Badge Stock */}
                      <span
                        className={`absolute bottom-1.5 right-1.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          sinStock
                            ? 'bg-red-500 text-white'
                            : stockTotal <= 5
                            ? 'bg-amber-500 text-black'
                            : 'bg-zinc-900/80 text-white backdrop-blur-sm'
                        }`}
                      >
                        {sinStock ? 'Agotado' : `${stockTotal} u.`}
                      </span>
                    </div>

                    <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white line-clamp-1">
                      {prod.nombre}
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      {prod.variantes?.length || 0} variante(s)
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="font-display font-black text-xs sm:text-sm text-militar-700 dark:text-militar-400">
                      {formatPrecio(prod.precio)}
                    </span>
                    <button
                      type="button"
                      disabled={sinStock}
                      className="w-7 h-7 rounded-lg bg-militar-600 hover:bg-militar-700 text-white flex items-center justify-center text-xs font-bold shadow-sm transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {productosFiltrados.length === 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center text-zinc-500">
              <span className="text-3xl block mb-2">🔍</span>
              No se encontraron artículos con el criterio de búsqueda.
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA (5 cols): Carrito de Venta y Checkout */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 sticky top-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-base">🛒</span>
              <h2 className="font-display font-bold text-base text-zinc-900 dark:text-white">
                Ticket de Mostrador
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500">
                {totalArticulos} ítem(s)
              </span>
              {carrito.length > 0 && (
                <button
                  type="button"
                  onClick={vaciarCarrito}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
                  title="Vaciar carrito"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* LISTA DE ÍTEMS EN CARRITO */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {carrito.map((item) => (
              <div
                key={item.variante_id}
                className={`p-3 rounded-xl border transition-all ${
                  item.exige_credencial
                    ? 'border-red-300 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      {item.exige_credencial && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-600 text-white">
                          RESTRINGIDO
                        </span>
                      )}
                      <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {item.nombre}
                      </h4>
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                      Talle: <strong>{item.talle}</strong> | Color: {item.color} · c/u {formatPrecio(item.precio)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => eliminarDelCarrito(item.variante_id)}
                    className="text-zinc-400 hover:text-red-500 p-1"
                    title="Quitar"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                  {/* Selector de cantidad */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => actualizarCantidad(item.variante_id, -1)}
                      className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 text-zinc-800 dark:text-zinc-200 font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold w-6 text-center">
                      {item.cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => actualizarCantidad(item.variante_id, 1)}
                      className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 text-zinc-800 dark:text-zinc-200 font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-display font-black text-sm text-zinc-900 dark:text-white">
                    {formatPrecio(item.subtotal)}
                  </span>
                </div>
              </div>
            ))}

            {carrito.length === 0 && (
              <div className="py-12 text-center text-zinc-400 space-y-2">
                <span className="text-3xl block">🏷️</span>
                <p className="text-xs">No hay productos en el mostrador.</p>
                <p className="text-[11px] text-zinc-500">
                  Escaneá un código de barras o hacé clic en un artículo a la izquierda.
                </p>
              </div>
            )}
          </div>

          {/* ─── ALERTA DE CREDENCIAL OBLIGATORIA (HU 3.2) ─── */}
          {exigeCredencialEnCarrito && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                credencialInfo?.verificada
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800/50 text-red-900 dark:text-red-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-base">{credencialInfo?.verificada ? '🛡️' : '⚠️'}</span>
                  <div>
                    <strong className="block leading-snug">
                      {credencialInfo?.verificada
                        ? 'Credencial Oficial Acreditada'
                        : 'Control de Credencial Obligatorio'}
                    </strong>
                    <span className="text-[11px] opacity-90 block">
                      {credencialInfo?.verificada
                        ? `Institución: ${credencialInfo.fuerzaInstitucion} ${
                            credencialInfo.legajo ? `(${credencialInfo.legajo})` : ''
                          }`
                        : 'El pedido incluye artículos restringidos. Requiere verificar credencial antes de cobrar.'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalCredencialAbierto(true)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    credencialInfo?.verificada
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {credencialInfo?.verificada ? 'Cambiar' : 'Verificar'}
                </button>
              </div>
            </div>
          )}

          {/* ─── RESUMEN DE TOTAL Y CHECKOUT ─── */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Total Venta:
              </span>
              <span className="text-2xl sm:text-3xl font-display font-black text-emerald-600 dark:text-emerald-400">
                {formatPrecio(totalVenta)}
              </span>
            </div>

            {/* BOTÓN PRINCIPAL DE COBRO */}
            <button
              type="button"
              onClick={handleIniciarCobro}
              disabled={carrito.length === 0}
              className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 ${
                carrito.length === 0
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed shadow-none'
                  : !credencialValida
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/30 active:scale-98'
              }`}
            >
              {!credencialValida ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Verificar Credencial p/ Habilitar Cobro
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Cobrar Venta ({formatPrecio(totalVenta)})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL SELECTOR DE VARIANTE (TALLES/COLORES) ─── */}
      {productoParaVariante && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-militar-600 dark:text-militar-400 font-bold">
                  Seleccionar Variante de Talle
                </span>
                <h3 className="font-display font-bold text-lg text-zinc-900 dark:text-white mt-0.5">
                  {productoParaVariante.nombre}
                </h3>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {formatPrecio(productoParaVariante.precio)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setProductoParaVariante(null)}
                className="text-zinc-400 hover:text-zinc-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {productoParaVariante.variantes.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={v.stock <= 0}
                  onClick={() => agregarVarianteAlCarrito(productoParaVariante, v)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all ${
                    v.stock <= 0
                      ? 'border-zinc-200 dark:border-zinc-800 opacity-40 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/50'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-militar-500 hover:bg-militar-50 dark:hover:bg-militar-950/30'
                  }`}
                >
                  <div className="text-left">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      Talle: {v.talle}
                    </span>
                    <span className="text-zinc-500 block text-[11px]">
                      Color: {v.color}
                    </span>
                  </div>
                  <span
                    className={`font-mono px-2 py-0.5 rounded text-[11px] font-bold ${
                      v.stock <= 0
                        ? 'bg-red-100 dark:bg-red-950 text-red-600'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {v.stock <= 0 ? 'Sin stock' : `${v.stock} disponibles`}
                  </span>
                </button>
              ))}
            </div>

            <div className="text-right pt-2">
              <button
                type="button"
                onClick={() => setProductoParaVariante(null)}
                className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL VERIFICACIÓN DE CREDENCIAL OBLIGATORIA (HU 3.2) ─── */}
      <ModalVerificacionCredencial
        abierto={modalCredencialAbierto}
        onClose={() => setModalCredencialAbierto(false)}
        itemsRestringidos={itemsRestringidos}
        credencialPrevia={credencialInfo}
        onConfirmar={(datos) => {
          setCredencialInfo(datos);
          setModalCredencialAbierto(false);
          mostrarToast(`Credencial verificada para ${datos.fuerzaInstitucion}`);
          // Abrir directamente modal de cobro si ya cumplió
          setModalCobroAbierto(true);
        }}
      />

      {/* ─── MODAL COBRO TÁCTICO & MEDIOS DE PAGO (ALIAS MP) ─── */}
      <ModalCobroTactico
        abierto={modalCobroAbierto}
        onClose={() => setModalCobroAbierto(false)}
        total={totalVenta}
        items={carrito}
        credencialVerificada={credencialValida}
        fuerzaInstitucion={credencialInfo?.fuerzaInstitucion}
        onConfirmarVenta={handleConfirmarVentaFinal}
      />

      {/* ─── MODAL TICKET INTERNO TÉRMICO (HU 4.1) ─── */}
      <ModalTicketVenta
        abierto={modalTicketAbierto}
        venta={ultimaVentaRegistrada}
        items={carrito}
        vuelto={ultimoVuelto}
        onNuevaVenta={handleNuevaVenta}
      />

      {/* ─── MODAL APERTURA DE TURNO DE CAJA (HU 3.3) ─── */}
      <ModalAperturaTurno
        abierto={modalAperturaAbierto}
        onClose={() => setModalAperturaAbierto(false)}
        cajeroActual={vendedorActivo}
        onTurnoAbierto={(turno) => {
          setTurnoActivo(turno);
          setModalAperturaAbierto(false);
          mostrarToast(
            `Turno #${turno.numero_turno} abierto correctamente. Fondo inicial: ${formatPrecio(turno.monto_apertura)}`
          );
        }}
      />

      {/* ─── MODAL ARQUEO CIEGO Y CIERRE DE TURNO (HU 3.3) ─── */}
      {turnoActivo && (
        <ModalArqueoCiego
          abierto={modalArqueoAbierto}
          onClose={() => setModalArqueoAbierto(false)}
          turnoActivo={turnoActivo}
          onTurnoCerrado={(turnoFinal) => {
            setTurnoActivo(null);
            setModalArqueoAbierto(false);
            const diffMsg =
              turnoFinal.diferencia === 0
                ? 'Caja exacta ($0 de desviación)'
                : turnoFinal.diferencia > 0
                ? `Sobrante: +${formatPrecio(turnoFinal.diferencia)}`
                : `Faltante: -${formatPrecio(Math.abs(turnoFinal.diferencia))}`;
            mostrarToast(`Turno #${turnoFinal.numero_turno} cerrado. ${diffMsg}`);
          }}
        />
      )}
    </div>
  );
}

