import type { MovimientoCaja, Venta, VentaItemCarrito, TurnoCaja } from '@/types/database';
import { supabase } from '@/lib/supabase';

export const STORAGE_KEY_MOVIMIENTOS = 'tropas_movimientos_caja';
export const STORAGE_KEY_VENTAS = 'tropas_ventas_historial';
export const STORAGE_KEY_TURNOS = 'tropas_turnos_caja';
export const STORAGE_KEY_TURNO_ACTIVO = 'tropas_turno_activo';
export const EVENTO_FINANZAS_ACTUALIZADAS = 'tropas_finanzas_actualizadas';
export const EVENTO_TURNO_ACTUALIZADO = 'tropas_turno_actualizado';

export const TURNOS_SEED: TurnoCaja[] = [
  {
    id: 'turno-seed-1',
    cajero_nombre: 'Kevin (Líder / Mostrador)',
    monto_apertura: 15000,
    monto_cierre_esperado: 125000,
    monto_cierre_declarado: 125000,
    diferencia: 0,
    estado: 'cerrado',
    observaciones: 'Arqueo exacto sin desvíos. Rendición conforme.',
    fecha_apertura: new Date(Date.now() - 28 * 3600000).toISOString(),
    fecha_cierre: new Date(Date.now() - 20 * 3600000).toISOString(),
    total_ventas_efectivo: 110000,
    total_ventas_digital: 95000,
    cantidad_ventas: 6,
  },
  {
    id: 'turno-seed-2',
    cajero_nombre: 'Juan Manuel (Turno Mañana)',
    monto_apertura: 10000,
    monto_cierre_esperado: 87800,
    monto_cierre_declarado: 87500,
    diferencia: -300,
    estado: 'cerrado',
    observaciones: 'Faltante menor por redondeo de cambio en venta de cinturón.',
    fecha_apertura: new Date(Date.now() - 52 * 3600000).toISOString(),
    fecha_cierre: new Date(Date.now() - 44 * 3600000).toISOString(),
    total_ventas_efectivo: 77800,
    total_ventas_digital: 45000,
    cantidad_ventas: 4,
  },
  {
    id: 'turno-seed-3',
    cajero_nombre: 'Máximo (Turno Tarde)',
    monto_apertura: 10000,
    monto_cierre_esperado: 142000,
    monto_cierre_declarado: 142200,
    diferencia: 200,
    estado: 'cerrado',
    observaciones: 'Sobrante mínimo de cambio propina en caja.',
    fecha_apertura: new Date(Date.now() - 76 * 3600000).toISOString(),
    fecha_cierre: new Date(Date.now() - 68 * 3600000).toISOString(),
    total_ventas_efectivo: 132000,
    total_ventas_digital: 60000,
    cantidad_ventas: 7,
  },
];

export const MOVIMIENTOS_SEED: MovimientoCaja[] = [
  {
    id: 'mov-1',
    tipo: 'ingreso',
    monto: 185000,
    concepto: 'Venta Chaleco Antibalas Nivel IIIA a personal policial',
    categoria_caja: 'Ventas Especiales',
    metodo_pago: 'transferencia',
    producto_id: null,
    cantidad: 1,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'mov-2',
    tipo: 'ingreso',
    monto: 77800,
    concepto: 'Venta 2x Borceguí Táctico Cuero (T.40 y T.42)',
    categoria_caja: 'Ventas Mostrador',
    metodo_pago: 'efectivo',
    producto_id: null,
    cantidad: 2,
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'mov-3',
    tipo: 'egreso',
    monto: 34500,
    concepto: 'Reposición insumos y flete de fábrica militar',
    categoria_caja: 'Proveedores',
    metodo_pago: 'transferencia',
    producto_id: null,
    cantidad: 1,
    created_at: new Date(Date.now() - 14 * 3600000).toISOString(),
  },
  {
    id: 'mov-4',
    tipo: 'ingreso',
    monto: 45500,
    concepto: 'Venta 1x Uniforme Táctico Ripstop Verde Oliva',
    categoria_caja: 'Ventas Mostrador',
    metodo_pago: 'tarjeta',
    producto_id: null,
    cantidad: 1,
    created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
  },
  {
    id: 'mov-5',
    tipo: 'ingreso',
    monto: 37500,
    concepto: 'Venta 3x Cinturón Táctico Militar Hebilla Rápida',
    categoria_caja: 'Ventas Mostrador',
    metodo_pago: 'efectivo',
    producto_id: null,
    cantidad: 3,
    created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
  },
  {
    id: 'mov-6',
    tipo: 'egreso',
    monto: 12000,
    concepto: 'Mantenimiento y materiales de empaque y logística',
    categoria_caja: 'Gastos Operativos',
    metodo_pago: 'efectivo',
    producto_id: null,
    cantidad: 1,
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: 'mov-7',
    tipo: 'ingreso',
    monto: 45600,
    concepto: 'Venta 2x Funda Pistolera Nivel II',
    categoria_caja: 'Ventas Especiales',
    metodo_pago: 'transferencia',
    producto_id: null,
    cantidad: 2,
    created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
  },
];

/**
 * Sincroniza y fusiona movimientos de Supabase con los de localStorage
 */
export function sincronizarMovimientos(initialSupabase?: MovimientoCaja[]): MovimientoCaja[] {
  const locales = obtenerMovimientosLocales();
  const mapa = new Map<string, MovimientoCaja>();

  // 1. Agregar movimientos de Supabase si existen
  if (initialSupabase && initialSupabase.length > 0) {
    initialSupabase.forEach((m) => mapa.set(m.id, m));
  }

  // 2. Agregar/sobreescribir con movimientos locales (tienen las ventas más recientes)
  locales.forEach((m) => mapa.set(m.id, m));

  const resultado = Array.from(mapa.values());
  resultado.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return resultado;
}

/**
 * Obtiene los movimientos combinando Supabase y localStorage
 */
export function obtenerMovimientosLocales(): MovimientoCaja[] {
  if (typeof window === 'undefined') return MOVIMIENTOS_SEED;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_MOVIMIENTOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error al leer movimientos de localStorage:', err);
  }

  // Si no había guardados, inicializar con MOVIMIENTOS_SEED
  try {
    localStorage.setItem(STORAGE_KEY_MOVIMIENTOS, JSON.stringify(MOVIMIENTOS_SEED));
  } catch {
    // Ignorar
  }
  return MOVIMIENTOS_SEED;
}

/**
 * Guarda y propaga una lista completa de movimientos
 */
export function guardarListaMovimientos(movs: MovimientoCaja[]) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY_MOVIMIENTOS, JSON.stringify(movs));
    window.dispatchEvent(new Event(EVENTO_FINANZAS_ACTUALIZADAS));
  } catch (err) {
    console.error('Error al guardar lista de movimientos:', err);
  }
}

/**
 * Registra un movimiento individual en localStorage y Supabase
 */
export async function registrarMovimiento(mov: MovimientoCaja): Promise<void> {
  if (typeof window !== 'undefined') {
    const actual = obtenerMovimientosLocales();
    const nuevos = [mov, ...actual.filter((m) => m.id !== mov.id)];
    guardarListaMovimientos(nuevos);
  }

  // Intentar persistir en Supabase (omitiendo id para que PostgreSQL genere UUID automático)
  try {
    const esUuidValido = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    await supabase.from('movimientos_caja').insert([
      {
        tipo: mov.tipo,
        monto: mov.monto,
        concepto: mov.concepto,
        categoria_caja: mov.categoria_caja,
        metodo_pago: mov.metodo_pago,
        producto_id: esUuidValido(mov.producto_id) ? mov.producto_id : null,
        cantidad: mov.cantidad,
      },
    ]);
  } catch (err) {
    console.warn('Persistencia en Supabase diferida (modo offline):', err);
  }
}

/**
 * Registra una venta completada en el POS:
 * 1. Guarda el registro de venta en el historial
 * 2. Genera y guarda el movimiento de ingreso de caja correspondiente
 * 3. Notifica a toda la aplicación para actualizar balances y rankings en tiempo real
 */
export async function registrarVentaEnFinanzas(
  venta: Venta,
  items: VentaItemCarrito[]
): Promise<MovimientoCaja> {
  const detalleConcepto = items
    .map((it) => `${it.cantidad}x ${it.nombre} (${it.talle})`)
    .join(', ');

  const totalUnidades = items.reduce((acc, it) => acc + it.cantidad, 0);

  // Mapear método de pago para el libro de caja
  let metodoCaja: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro' = 'efectivo';
  if (venta.metodo_pago === 'transferencia_alias') {
    metodoCaja = 'transferencia';
  } else if (venta.metodo_pago === 'tarjeta_postnet') {
    metodoCaja = 'tarjeta';
  } else if (venta.metodo_pago === 'combinado') {
    metodoCaja = 'otro';
  }

  const nuevoMovimiento: MovimientoCaja = {
    id: `mov-vta-${Date.now()}`,
    tipo: 'ingreso',
    monto: venta.total,
    concepto: `Venta Mostrador ${venta.numero_ticket} — ${detalleConcepto}`,
    categoria_caja: 'Ventas Mostrador',
    metodo_pago: metodoCaja,
    producto_id: items[0]?.producto_id || null,
    cantidad: totalUnidades,
    created_at: venta.created_at || new Date().toISOString(),
  };

  // 1. Guardar en histórico de ventas (con detalle de ítems)
  if (typeof window !== 'undefined') {
    try {
      const historialRaw = localStorage.getItem(STORAGE_KEY_VENTAS);
      const historial = historialRaw ? JSON.parse(historialRaw) : [];
      historial.unshift({
        ...venta,
        items,
      });
      localStorage.setItem(STORAGE_KEY_VENTAS, JSON.stringify(historial));
    } catch (e) {
      console.warn('Error al guardar en historial de ventas:', e);
    }
  }

  // 2. Registrar movimiento financiero
  await registrarMovimiento(nuevoMovimiento);

  return nuevoMovimiento;
}

/**
 * Obtiene el historial completo de ventas registradas por el POS
 */
export function obtenerVentasHistorial(): (Venta & { items: VentaItemCarrito[] })[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VENTAS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error al leer historial de ventas:', e);
  }
  return [];
}

/**
 * Actualiza los números de comprobante o transacción digital de ventas del turno
 */
export function actualizarComprobantesVentas(
  comprobantesMap: Record<string, string>
) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VENTAS);
    if (!raw) return;
    const ventas: (Venta & { items: VentaItemCarrito[] })[] = JSON.parse(raw);
    let modificado = false;

    const actualizadas = ventas.map((v) => {
      if (comprobantesMap[v.id] !== undefined) {
        modificado = true;
        return {
          ...v,
          nro_comprobante_digital: comprobantesMap[v.id]?.trim() || null,
        };
      }
      return v;
    });

    if (modificado) {
      localStorage.setItem(STORAGE_KEY_VENTAS, JSON.stringify(actualizadas));
    }
  } catch (e) {
    console.error('Error al actualizar comprobantes de ventas:', e);
  }
}

/* ─────────────────────────────────────────────────────────────
   GESTIÓN DE TURNOS Y ARQUEO CIEGO DE CAJA (HU 3.3)
   ───────────────────────────────────────────────────────────── */

/**
 * Obtiene el historial de todos los turnos registrados
 */
export function obtenerHistorialTurnos(): TurnoCaja[] {
  if (typeof window === 'undefined') return TURNOS_SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TURNOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error al leer turnos de localStorage:', e);
  }

  // Si no había guardados, inicializar con los de semilla
  try {
    localStorage.setItem(STORAGE_KEY_TURNOS, JSON.stringify(TURNOS_SEED));
  } catch {
    // Ignorar
  }
  return TURNOS_SEED;
}

/**
 * Obtiene el turno de caja actualmente abierto en este mostrador
 */
export function obtenerTurnoActivo(): TurnoCaja | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TURNO_ACTIVO);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.estado === 'abierto') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error al leer turno activo:', e);
  }
  return null;
}

/**
 * Abre un nuevo turno de caja con el fondo inicial
 */
export async function abrirTurno(
  cajeroNombre: string,
  montoApertura: number
): Promise<TurnoCaja> {
  const nuevoTurno: TurnoCaja = {
    id: `turno-${Date.now()}`,
    cajero_nombre: cajeroNombre,
    monto_apertura: montoApertura,
    monto_cierre_declarado: null,
    monto_cierre_esperado: null,
    diferencia: null,
    estado: 'abierto',
    fecha_apertura: new Date().toISOString(),
    total_ventas_efectivo: 0,
    total_ventas_digital: 0,
    cantidad_ventas: 0,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_TURNO_ACTIVO, JSON.stringify(nuevoTurno));

      const historial = obtenerHistorialTurnos();
      const actualizados = [nuevoTurno, ...historial.filter((t) => t.id !== nuevoTurno.id)];
      localStorage.setItem(STORAGE_KEY_TURNOS, JSON.stringify(actualizados));

      window.dispatchEvent(new Event(EVENTO_TURNO_ACTUALIZADO));
    } catch (e) {
      console.warn('Error al guardar apertura de turno en local:', e);
    }
  }

  // Intentar persistir en Supabase
  try {
    await supabase.from('turnos_caja').insert([
      {
        cajero_nombre: nuevoTurno.cajero_nombre,
        monto_apertura: nuevoTurno.monto_apertura,
        estado: 'abierto',
        fecha_apertura: nuevoTurno.fecha_apertura,
      },
    ]);
  } catch (err) {
    console.warn('Persistencia de apertura en Supabase diferida:', err);
  }

  return nuevoTurno;
}

/**
 * Realiza el ARQUEO CIEGO y cierre del turno actual:
 * 1. El cajero ingresa lo contado SIN conocer el saldo del sistema
 * 2. El sistema calcula las ventas del turno y el saldo esperado
 * 3. Se genera la diferencia auditada (sobrante / faltante)
 */
export async function cerrarTurnoCiego(
  montoDeclarado: number,
  observaciones?: string
): Promise<{ turno: TurnoCaja; desvio: number; esperado: number }> {
  const turnoActivo = obtenerTurnoActivo();
  const cajero = turnoActivo?.cajero_nombre || 'Cajero Mostrador';
  const apertura = turnoActivo?.monto_apertura || 0;
  const fechaApertura = turnoActivo?.fecha_apertura || new Date().toISOString();

  // 1. Obtener todas las ventas pertenecientes a este turno
  const todasVentas = obtenerVentasHistorial();
  const ventasTurno = todasVentas.filter((v) => {
    if (turnoActivo?.id && v.turno_id === turnoActivo.id) return true;
    // Si no tiene turno_id explícito, comparar timestamp posterior a la apertura
    return new Date(v.created_at).getTime() >= new Date(fechaApertura).getTime();
  });

  // 2. Totalizar ingresos en efectivo y digitales del turno
  let ventasEfectivo = 0;
  let ventasDigital = 0;

  ventasTurno.forEach((v) => {
    if (v.metodo_pago === 'efectivo') {
      ventasEfectivo += Number(v.total || 0);
    } else if (v.metodo_pago === 'combinado') {
      ventasEfectivo += Number(v.monto_efectivo || 0);
      ventasDigital += Number(v.monto_digital || 0);
    } else {
      ventasDigital += Number(v.total || 0);
    }
  });

  // 3. Saldo esperado en el cajón = Fondo Inicial + Ventas en Efectivo
  const esperado = apertura + ventasEfectivo;
  const desvio = montoDeclarado - esperado;

  const turnoCerrado: TurnoCaja = {
    id: turnoActivo?.id || `turno-${Date.now()}`,
    cajero_nombre: cajero,
    monto_apertura: apertura,
    monto_cierre_esperado: esperado,
    monto_cierre_declarado: montoDeclarado,
    diferencia: desvio,
    estado: 'cerrado',
    observaciones: observaciones?.trim() || null,
    fecha_apertura: fechaApertura,
    fecha_cierre: new Date().toISOString(),
    total_ventas_efectivo: ventasEfectivo,
    total_ventas_digital: ventasDigital,
    cantidad_ventas: ventasTurno.length,
  };

  // 4. Actualizar en localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_TURNO_ACTIVO);

      const historial = obtenerHistorialTurnos();
      const actualizados = [turnoCerrado, ...historial.filter((t) => t.id !== turnoCerrado.id)];
      localStorage.setItem(STORAGE_KEY_TURNOS, JSON.stringify(actualizados));

      window.dispatchEvent(new Event(EVENTO_TURNO_ACTUALIZADO));
      window.dispatchEvent(new Event(EVENTO_FINANZAS_ACTUALIZADAS));
    } catch (e) {
      console.warn('Error al guardar cierre de turno en local:', e);
    }
  }

  // 5. Intentar persistir en Supabase
  try {
    await supabase.from('turnos_caja').insert([
      {
        cajero_nombre: turnoCerrado.cajero_nombre,
        monto_apertura: turnoCerrado.monto_apertura,
        monto_cierre_esperado: turnoCerrado.monto_cierre_esperado,
        monto_cierre_declarado: turnoCerrado.monto_cierre_declarado,
        diferencia: turnoCerrado.diferencia,
        estado: 'cerrado',
        observaciones: turnoCerrado.observaciones,
        fecha_apertura: turnoCerrado.fecha_apertura,
        fecha_cierre: turnoCerrado.fecha_cierre,
      },
    ]);
  } catch (err) {
    console.warn('Persistencia de cierre en Supabase diferida:', err);
  }

  return {
    turno: turnoCerrado,
    desvio,
    esperado,
  };
}
