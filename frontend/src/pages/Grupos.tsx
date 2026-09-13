import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, mensajeError } from '../api/client';
import { Fab, Pantalla } from '../components/Layout';
import { Boton, Campo, Dialogo, Spinner, Vacio, inputCls } from '../components/ui';

interface Grupo { id: number; nombre: string; total_usuarios: number }

export default function Grupos() {
  const qc = useQueryClient();
  const [editar, setEditar] = useState<Grupo | 'nuevo' | null>(null);
  const [aEliminar, setAEliminar] = useState<Grupo | null>(null);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');

  const { data: grupos, isLoading } = useQuery<Grupo[]>({
    queryKey: ['grupos'],
    queryFn: async () => (await api.get('/grupos')).data,
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ['grupos'] });

  const guardar = useMutation({
    mutationFn: async () => {
      if (editar === 'nuevo') return (await api.post('/grupos', { nombre: nombre.trim() })).data;
      return (await api.put(`/grupos/${(editar as Grupo).id}`, { nombre: nombre.trim() })).data;
    },
    onSuccess: () => {
      invalidar();
      setEditar(null);
      setError('');
    },
    onError: (e) => setError(mensajeError(e)),
  });

  const eliminar = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/grupos/${id}`)).data,
    onSuccess: () => {
      invalidar();
      setAEliminar(null);
      setError('');
    },
    onError: (e) => setError(mensajeError(e)),
  });

  return (
    <Pantalla titulo="Grupos">
      {isLoading ? (
        <Spinner />
      ) : !grupos?.length ? (
        <Vacio mensaje="Sin grupos. Crea el primero con el botón +" />
      ) : (
        <div className="space-y-2.5">
          {grupos.map((g) => (
            <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-black/20">
              <span className="text-2xl">🏷</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{g.nombre}</p>
                <p className="text-xs text-muted">{g.total_usuarios} usuarios</p>
              </div>
              <button aria-label="Renombrar" className="rounded-full p-2 active:bg-white/10" onClick={() => { setEditar(g); setNombre(g.nombre); setError(''); }}>✏️</button>
              <button aria-label="Eliminar" className="rounded-full p-2 active:bg-white/10" onClick={() => setAEliminar(g)}>🗑</button>
            </div>
          ))}
        </div>
      )}

      <Fab onClick={() => { setEditar('nuevo'); setNombre(''); setError(''); }} />

      <Dialogo
        abierto={!!editar}
        titulo={editar === 'nuevo' ? 'Nuevo grupo' : 'Renombrar grupo'}
        onCerrar={() => setEditar(null)}
      >
        <Campo label="Nombre del grupo">
          <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        {error && <p className="mb-2 text-sm text-bad">{error}</p>}
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => setEditar(null)}>Cancelar</Boton>
          <Boton className="flex-1" disabled={guardar.isPending || !nombre.trim()} onClick={() => guardar.mutate()}>
            Guardar
          </Boton>
        </div>
      </Dialogo>

      <Dialogo abierto={!!aEliminar} titulo={`¿Eliminar "${aEliminar?.nombre}"?`} onCerrar={() => setAEliminar(null)}>
        <p className="mb-4 text-sm text-muted">Los usuarios del grupo quedarán sin grupo asignado.</p>
        {error && <p className="mb-2 text-sm text-bad">{error}</p>}
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => setAEliminar(null)}>Cancelar</Boton>
          <Boton variante="peligro" className="flex-1" disabled={eliminar.isPending} onClick={() => aEliminar && eliminar.mutate(aEliminar.id)}>
            Eliminar
          </Boton>
        </div>
      </Dialogo>
    </Pantalla>
  );
}
