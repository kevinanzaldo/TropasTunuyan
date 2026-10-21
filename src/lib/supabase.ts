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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey);

