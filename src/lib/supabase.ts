/**
 * Cliente de Supabase para Tropas Tunuyán.
 *
 * Utiliza las variables de entorno NEXT_PUBLIC_SUPABASE_URL y
 * NEXT_PUBLIC_SUPABASE_ANON_KEY definidas en .env.local.
 *
 * Este cliente es seguro para uso en Server Components y Client Components,
 * ya que solo expone la clave anónima (lectura pública).
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Verificá el archivo .env.local.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
