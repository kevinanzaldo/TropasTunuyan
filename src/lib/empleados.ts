'use client';

export interface Empleado {
  id: string;
  nombre: string;
  rol: string;
  activo: boolean;
  telefono?: string;
  fecha_alta: string;
}

export const STORAGE_KEY_EMPLEADOS = 'tropas_empleados_lista';
export const EVENTO_EMPLEADOS_ACTUALIZADOS = 'tropas_empleados_actualizados';

export const EMPLEADOS_INICIALES: Empleado[] = [
  {
    id: 'emp-1',
    nombre: 'Kevin',
    rol: 'Líder / Mostrador',
    activo: true,
    telefono: '+54 9 2622 55-0101',
    fecha_alta: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'emp-2',
    nombre: 'Juan Manuel',
    rol: 'Turno Mañana',
    activo: true,
    telefono: '+54 9 2622 55-0102',
    fecha_alta: '2026-02-01T08:00:00.000Z',
  },
  {
    id: 'emp-3',
    nombre: 'Máximo',
    rol: 'Turno Tarde',
    activo: true,
    telefono: '+54 9 2622 55-0103',
    fecha_alta: '2026-03-10T14:00:00.000Z',
  },
  {
    id: 'emp-4',
    nombre: 'Francisco',
    rol: 'Turno Tarde',
    activo: true,
    telefono: '+54 9 2622 55-0104',
    fecha_alta: '2026-04-05T14:00:00.000Z',
  },
  {
    id: 'emp-5',
    nombre: 'Pablo',
    rol: 'Fin de Semana',
    activo: true,
    telefono: '+54 9 2622 55-0105',
    fecha_alta: '2026-05-12T09:00:00.000Z',
  },
];

/**
 * Obtiene la lista de empleados guardada en localStorage o la lista por defecto
 */
export function obtenerEmpleados(): Empleado[] {
  if (typeof window === 'undefined') return EMPLEADOS_INICIALES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMPLEADOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_EMPLEADOS, JSON.stringify(EMPLEADOS_INICIALES));
      return EMPLEADOS_INICIALES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : EMPLEADOS_INICIALES;
  } catch (err) {
    console.warn('Error leyendo empleados locales:', err);
    return EMPLEADOS_INICIALES;
  }
}

/**
 * Guarda o actualiza un empleado
 */
export function guardarEmpleado(emp: Partial<Empleado> & { nombre: string }): Empleado[] {
  if (typeof window === 'undefined') return EMPLEADOS_INICIALES;
  const lista = obtenerEmpleados();

  let nuevaLista: Empleado[];
  if (emp.id) {
    // Edición
    nuevaLista = lista.map((e) =>
      e.id === emp.id
        ? {
            ...e,
            nombre: emp.nombre.trim(),
            rol: emp.rol ? emp.rol.trim() : e.rol,
            activo: emp.activo !== undefined ? emp.activo : e.activo,
            telefono: emp.telefono !== undefined ? emp.telefono.trim() : e.telefono,
          }
        : e
    );
  } else {
    // Creación
    const nuevo: Empleado = {
      id: `emp-${Date.now()}`,
      nombre: emp.nombre.trim(),
      rol: emp.rol ? emp.rol.trim() : 'Vendedor Mostrador',
      activo: emp.activo !== undefined ? emp.activo : true,
      telefono: emp.telefono ? emp.telefono.trim() : '',
      fecha_alta: new Date().toISOString(),
    };
    nuevaLista = [...lista, nuevo];
  }

  localStorage.setItem(STORAGE_KEY_EMPLEADOS, JSON.stringify(nuevaLista));
  window.dispatchEvent(new CustomEvent(EVENTO_EMPLEADOS_ACTUALIZADOS, { detail: nuevaLista }));
  return nuevaLista;
}

/**
 * Elimina un empleado
 */
export function eliminarEmpleado(id: string): Empleado[] {
  if (typeof window === 'undefined') return EMPLEADOS_INICIALES;
  const lista = obtenerEmpleados();
  const nuevaLista = lista.filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY_EMPLEADOS, JSON.stringify(nuevaLista));
  window.dispatchEvent(new CustomEvent(EVENTO_EMPLEADOS_ACTUALIZADOS, { detail: nuevaLista }));
  return nuevaLista;
}

/**
 * Alterna el estado activo / inactivo de un empleado
 */
export function toggleEstadoEmpleado(id: string): Empleado[] {
  if (typeof window === 'undefined') return EMPLEADOS_INICIALES;
  const lista = obtenerEmpleados();
  const nuevaLista = lista.map((e) => (e.id === id ? { ...e, activo: !e.activo } : e));
  localStorage.setItem(STORAGE_KEY_EMPLEADOS, JSON.stringify(nuevaLista));
  window.dispatchEvent(new CustomEvent(EVENTO_EMPLEADOS_ACTUALIZADOS, { detail: nuevaLista }));
  return nuevaLista;
}
