import { supabase } from './supabase';

export interface UploadResult {
  url: string | null;
  error: string | null;
}

/**
 * Convierte un File local a una Data URL Base64 para previsualización inmediata.
 */
export function generarPreviewLocal(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Sube un archivo de imagen de producto.
 * Estrategia inteligente multi-nivel:
 * 1. Intenta en Supabase Storage (bucket 'productos').
 * 2. Si el bucket no existe en Supabase ('Bucket not found'), sube automáticamente al servidor local (/api/upload).
 * 3. Si todo lo anterior falla, usa Base64 Data URL como respaldo infalible.
 */
export async function subirImagenProducto(file: File): Promise<UploadResult> {
  try {
    // 1. Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return { url: null, error: 'El archivo seleccionado no es una imagen válida.' };
    }

    // 2. Validar tamaño máximo (10MB)
    const MAX_SIZE_MB = 10;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return { url: null, error: `La imagen excede el límite de ${MAX_SIZE_MB}MB.` };
    }

    // Sanitizar nombre y extensión
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const nombreLimpio = file.name
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    const path = `${Date.now()}-${nombreLimpio}.${extension}`;

    // ─── Nivel 1: Intento con Supabase Storage ───
    try {
      const { data: supaData, error: supaError } = await supabase.storage
        .from('productos')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (!supaError && supaData?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('productos')
          .getPublicUrl(supaData.path);

        return {
          url: publicUrlData.publicUrl,
          error: null,
        };
      }
    } catch {
      // Continuar al siguiente nivel
    }

    // ─── Nivel 2: Subida al Servidor Local (/api/upload) ───
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          return {
            url: data.url,
            error: null,
          };
        }
      }
    } catch {
      // Continuar al siguiente nivel
    }

    // ─── Nivel 3: Respaldo Data URL (Base64) ───
    const base64Url = await generarPreviewLocal(file);
    return {
      url: base64Url,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error inesperado al procesar la imagen';
    return { url: null, error: msg };
  }
}
