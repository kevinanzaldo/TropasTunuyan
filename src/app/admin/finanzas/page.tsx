import { supabase } from '@/lib/supabase';
import type { ProductoConVariantes, MovimientoCaja, Categoria } from '@/types/database';
import AdminFinanzasClient from './AdminFinanzasClient';

export const revalidate = 0; // Datos siempre frescos para el control financiero

const CATEGORIAS_FALLBACK: Categoria[] = [
  { id: 'cat-1', nombre: 'Uniformes', descripcion: 'Uniformes tácticos', orden: 1, created_at: '' },
  { id: 'cat-2', nombre: 'Calzado', descripcion: 'Borceguíes y calzado', orden: 2, created_at: '' },
  { id: 'cat-3', nombre: 'Protección', descripcion: 'Chalecos y placas', orden: 3, created_at: '' },
  { id: 'cat-4', nombre: 'Accesorios', descripcion: 'Cinturones y fundas', orden: 4, created_at: '' },
  { id: 'cat-5', nombre: 'Insignias y Grados', descripcion: 'Escudos y jerarquías', orden: 5, created_at: '' },
];

const PRODUCTOS_FALLBACK: ProductoConVariantes[] = [
  {
    id: 'prod-1',
    nombre: 'Uniforme Táctico Ripstop',
    descripcion: 'Uniforme completo antidesgarro verde oliva reglamentario.',
    precio: 45500,
    costo: 29500,
    porcentaje_ganancia: 54,
    exige_credencial: false,
    categoria_id: 'cat-1',
    imagen_url: '/productos/uniforme.png',
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    categorias: CATEGORIAS_FALLBACK[0],
    variantes: [],
  },
  {
    id: 'prod-2',
    nombre: 'Borceguí Táctico Cuero',
    descripcion: 'Borceguí de cuero vacuno con suela antideslizante para todo terreno.',
    precio: 38900,
    costo: 24500,
    porcentaje_ganancia: 58,
    exige_credencial: false,
    categoria_id: 'cat-2',
    imagen_url: '/productos/borcegui.png',
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    categorias: CATEGORIAS_FALLBACK[1],
    variantes: [],
  },
  {
    id: 'prod-3',
    nombre: 'Chaleco Antibalas Nivel IIIA',
    descripcion: 'Chaleco balístico certificado Nivel IIIA. Uso restringido exclusivo.',
    precio: 185000,
    costo: 130000,
    porcentaje_ganancia: 42,
    exige_credencial: true,
    categoria_id: 'cat-3',
    imagen_url: '/productos/chaleco.png',
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    categorias: CATEGORIAS_FALLBACK[2],
    variantes: [],
  },
  {
    id: 'prod-4',
    nombre: 'Cinturón Táctico Militar',
    descripcion: 'Cinturón de nylon de alta resistencia con hebilla de liberación rápida.',
    precio: 12500,
    costo: 7200,
    porcentaje_ganancia: 73,
    exige_credencial: false,
    categoria_id: 'cat-4',
    imagen_url: '/productos/cinturon.png',
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    categorias: CATEGORIAS_FALLBACK[3],
    variantes: [],
  },
  {
    id: 'prod-5',
    nombre: 'Funda Pistolera Nivel II',
    descripcion: 'Funda de polímero inyectado con retención automática para pistola 9mm.',
    precio: 22800,
    costo: 14000,
    porcentaje_ganancia: 62,
    exige_credencial: true,
    categoria_id: 'cat-4',
    imagen_url: '/productos/funda.png',
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    categorias: CATEGORIAS_FALLBACK[3],
    variantes: [],
  },
];

async function getFinanzasData(): Promise<{
  productos: ProductoConVariantes[];
  movimientos: MovimientoCaja[];
}> {
  // 1. Obtener productos para relacionar ventas, costos y catálogo
  let productos: ProductoConVariantes[] = [];
  try {
    const { data: prods, error } = await supabase
      .from('productos')
      .select('*, variantes (*), categorias (*)')
      .order('nombre', { ascending: true });

    if (!error && prods && prods.length > 0) {
      productos = prods as ProductoConVariantes[];
    } else {
      productos = PRODUCTOS_FALLBACK;
    }
  } catch {
    productos = PRODUCTOS_FALLBACK;
  }

  // 2. Intentar obtener movimientos de caja desde Supabase
  let movimientos: MovimientoCaja[] = [];
  try {
    const { data: movData, error } = await supabase
      .from('movimientos_caja')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && movData && movData.length > 0) {
      movimientos = movData as MovimientoCaja[];
    }
  } catch (err) {
    console.warn('Tabla movimientos_caja no accesible en Supabase:', err);
  }

  return {
    productos,
    movimientos,
  };
}

export default async function AdminFinanzasPage() {
  const { productos, movimientos } = await getFinanzasData();

  return (
    <AdminFinanzasClient
      initialProductos={productos}
      initialMovimientos={movimientos}
    />
  );
}
