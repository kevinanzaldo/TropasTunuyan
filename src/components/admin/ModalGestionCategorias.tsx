'use client';

import { useState } from 'react';
import type { Categoria, ProductoConVariantes } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface ModalGestionCategoriasProps {
  categorias: Categoria[];
  productos: ProductoConVariantes[];
  onClose: () => void;
  onCategoriasChange: (nuevasCategorias: Categoria[]) => void;
  onToast: (texto: string, tipo?: 'exito' | 'error') => void;
}

export default function ModalGestionCategorias({
  categorias,
  productos,
  onClose,
  onCategoriasChange,
  onToast,
}: ModalGestionCategoriasProps) {
  const [lista, setLista] = useState<Categoria[]>(categorias);
  const [nombreNueva, setNombreNueva] = useState('');
  const [descNueva, setDescNueva] = useState('');
  const [ordenNuevo, setOrdenNuevo] = useState(lista.length + 1);
  const [guardando, setGuardando] = useState(false);

  // Edición inline de una categoría
  const [categoriaEditandoId, setCategoriaEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Contar productos por categoría
  const getCantidadProductos = (catId: string) => {
    return productos.filter((p) => p.categoria_id === catId).length;
  };

  // Crear nueva categoría
  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNueva.trim()) return;

    setGuardando(true);
    const { data, error } = await supabase
      .from('categorias')
      .insert({
        nombre: nombreNueva.trim(),
        descripcion: descNueva.trim() || null,
        orden: Number(ordenNuevo) || lista.length + 1,
      })
      .select('*')
      .single();

    setGuardando(false);

    if (error) {
      onToast(`Error al crear categoría: ${error.message}`, 'error');
    } else if (data) {
      const actualizadas = [...lista, data as Categoria].sort((a, b) => a.orden - b.orden);
      setLista(actualizadas);
      onCategoriasChange(actualizadas);
      setNombreNueva('');
      setDescNueva('');
      setOrdenNuevo(actualizadas.length + 1);
      onToast(`Categoría "${data.nombre}" creada con éxito`);
    }
  };

  // Iniciar edición
  const iniciarEdicion = (cat: Categoria) => {
    setCategoriaEditandoId(cat.id);
    setEditNombre(cat.nombre);
    setEditDesc(cat.descripcion || '');
  };

  // Guardar edición
  const handleGuardarEdicion = async (catId: string) => {
    if (!editNombre.trim()) return;

    setGuardando(true);
    const { data, error } = await supabase
      .from('categorias')
      .update({
        nombre: editNombre.trim(),
        descripcion: editDesc.trim() || null,
      })
      .eq('id', catId)
      .select('*')
      .single();

    setGuardando(false);

    if (error) {
      onToast(`Error al actualizar categoría: ${error.message}`, 'error');
    } else if (data) {
      const actualizadas = lista.map((c) => (c.id === catId ? (data as Categoria) : c));
      setLista(actualizadas);
      onCategoriasChange(actualizadas);
      setCategoriaEditandoId(null);
      onToast(`Categoría "${data.nombre}" actualizada`);
    }
  };

  // Eliminar categoría
  const handleEliminarCategoria = async (cat: Categoria) => {
    const cantProds = getCantidadProductos(cat.id);
    const advertencia =
      cantProds > 0
        ? `Esta categoría contiene ${cantProds} producto(s). Al eliminarla, quedarán sin categoría asignada.`
        : '';

    if (!confirm(`¿Estás seguro de eliminar la categoría "${cat.nombre}"?\n${advertencia}`)) {
      return;
    }

    setGuardando(true);
    const { error } = await supabase.from('categorias').delete().eq('id', cat.id);
    setGuardando(false);

    if (error) {
      onToast(`Error al eliminar: ${error.message}`, 'error');
    } else {
      const actualizadas = lista.filter((c) => c.id !== cat.id);
      setLista(actualizadas);
      onCategoriasChange(actualizadas);
      onToast(`Categoría "${cat.nombre}" eliminada`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-lg font-display font-bold text-zinc-900 dark:text-white">
              Gestión de Categorías Personalizadas
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Creá, editá o eliminá secciones del catálogo táctico
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        {/* Formulario de Alta Rápida de Categoría */}
        <form onSubmit={handleCrearCategoria} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-militar-500" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Nueva Categoría
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Nombre de la Categoría *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Mochilas & Bolsos Tácticos"
                value={nombreNueva}
                onChange={(e) => setNombreNueva(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-militar-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                N° Orden
              </label>
              <input
                type="number"
                min="1"
                value={ordenNuevo}
                onChange={(e) => setOrdenNuevo(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-militar-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Descripción operativa (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Sistema MOLLE, carga pesada y estanqueidad para campaña..."
              value={descNueva}
              onChange={(e) => setDescNueva(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-militar-500"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={guardando || !nombreNueva.trim()}
              className="btn-primary text-xs px-4 py-2"
            >
              {guardando ? 'Guardando...' : '+ Crear Categoría'}
            </button>
          </div>
        </form>

        {/* Lista de Categorías Existentes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-500 px-1">
            <span>Categorías Actuales ({lista.length})</span>
            <span>Artículos Asociados</span>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/30">
            {lista.map((cat) => {
              const cant = getCantidadProductos(cat.id);
              const estaEditando = categoriaEditandoId === cat.id;

              return (
                <div key={cat.id} className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  {estaEditando ? (
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded font-bold text-zinc-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Descripción..."
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded text-zinc-600 dark:text-zinc-300"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleGuardarEdicion(cat.id)}
                          className="px-2.5 py-1 text-xs rounded bg-militar-600 text-white font-semibold"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoriaEditandoId(null)}
                          className="px-2.5 py-1 text-xs rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                          #{cat.orden}
                        </span>
                        <span className="font-semibold text-sm text-zinc-900 dark:text-white">
                          {cat.nombre}
                        </span>
                      </div>
                      {cat.descripcion && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 pl-7">
                          {cat.descripcion}
                        </p>
                      )}
                    </div>
                  )}

                  {!estaEditando && (
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        {cant} prod.
                      </span>
                      <button
                        type="button"
                        onClick={() => iniciarEdicion(cat)}
                        className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-medium px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminarCategoria(cat)}
                        className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
