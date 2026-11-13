import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import type { ProductoConVariantes, Categoria } from '@/types/database';
import AdminPosClient from './AdminPosClient';

export const metadata: Metadata = {
  title: 'Punto de Venta (POS) — Tropas Tunuyán',
  description: 'Terminal de ventas en mostrador, escaneo de artículos y validación de credenciales reglamentarias.',
};

export const revalidate = 0; // Datos siempre en vivo para el mostrador

// Datos iniciales de contingencia si Supabase no tiene conexión o está vacío
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
    variantes: [
      { id: 'v-1', producto_id: 'prod-1', talle: 'S', color: 'Verde Oliva', stock: 8, stock_minimo: 3, created_at: '', updated_at: '' },
      { id: 'v-2', producto_id: 'prod-1', talle: 'M', color: 'Verde Oliva', stock: 14, stock_minimo: 4, created_at: '', updated_at: '' },
      { id: 'v-3', producto_id: 'prod-1', talle: 'L', color: 'Verde Oliva', stock: 12, stock_minimo: 4, created_at: '', updated_at: '' },
      { id: 'v-4', producto_id: 'prod-1', talle: 'XL', color: 'Verde Oliva', stock: 6, stock_minimo: 3, created_at: '', updated_at: '' },
    ],
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
    variantes: [
      { id: 'v-5', producto_id: 'prod-2', talle: '40', color: 'Negro', stock: 4, stock_minimo: 2, created_at: '', updated_at: '' },
      { id: 'v-6', producto_id: 'prod-2', talle: '41', color: 'Negro', stock: 7, stock_minimo: 3, created_at: '', updated_at: '' },
      { id: 'v-7', producto_id: 'prod-2', talle: '42', color: 'Negro', stock: 10, stock_minimo: 3, created_at: '', updated_at: '' },
      { id: 'v-8', producto_id: 'prod-2', talle: '43', color: 'Negro', stock: 5, stock_minimo: 2, created_at: '', updated_at: '' },
    ],
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
    variantes: [
      { id: 'v-9', producto_id: 'prod-3', talle: 'M', color: 'Negro', stock: 3, stock_minimo: 2, created_at: '', updated_at: '' },
      { id: 'v-10', producto_id: 'prod-3', talle: 'L', color: 'Negro', stock: 5, stock_minimo: 2, created_at: '', updated_at: '' },
      { id: 'v-11', producto_id: 'prod-3', talle: 'XL', color: 'Negro', stock: 2, stock_minimo: 2, created_at: '', updated_at: '' },
    ],
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
    variantes: [
      { id: 'v-12', producto_id: 'prod-4', talle: 'Único', color: 'Negro', stock: 15, stock_minimo: 5, created_at: '', updated_at: '' },
      { id: 'v-13', producto_id: 'prod-4', talle: 'Único', color: 'Verde Oliva', stock: 9, stock_minimo: 4, created_at: '', updated_at: '' },
    ],
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
    variantes: [
      { id: 'v-14', producto_id: 'prod-5', talle: 'Diestro', color: 'Negro', stock: 8, stock_minimo: 3, created_at: '', updated_at: '' },
      { id: 'v-15', producto_id: 'prod-5', talle: 'Zurdo', color: 'Negro', stock: 3, stock_minimo: 2, created_at: '', updated_at: '' },
    ],
  },
];

async function getPosData(): Promise<{
  productos: ProductoConVariantes[];
  categorias: Categoria[];
}> {
  try {
    const [{ data: productos, error: errProd }, { data: categorias, error: errCat }] =
      await Promise.all([
        supabase
          .from('productos')
          .select('*, variantes (*), categorias (*)')
          .eq('activo', true)
          .order('nombre', { ascending: true }),
        supabase.from('categorias').select('*').order('orden', { ascending: true }),
      ]);

    const prodsValidos = !errProd && productos && productos.length > 0
      ? (productos as ProductoConVariantes[])
      : PRODUCTOS_FALLBACK;

    const catsValidas = !errCat && categorias && categorias.length > 0
      ? (categorias as Categoria[])
      : CATEGORIAS_FALLBACK;

    return {
      productos: prodsValidos,
      categorias: catsValidas,
    };
  } catch (err) {
    console.warn('Error al obtener datos en POS, usando fallback local:', err);
    return {
      productos: PRODUCTOS_FALLBACK,
      categorias: CATEGORIAS_FALLBACK,
    };
  }
}

export default async function AdminPosPage() {
  const { productos, categorias } = await getPosData();

  return (
    <AdminPosClient
      initialProductos={productos}
      categorias={categorias}
    />
  );
}

