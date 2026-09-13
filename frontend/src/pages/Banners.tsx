import { FormEvent, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, mensajeError } from '../api/client';
import { Fab, Pantalla } from '../components/Layout';
import { Boton, Campo, Dialogo, Spinner, Vacio, inputCls } from '../components/ui';

interface Banner { id: number; nombre: string }

export default function Banners() {
  const qc = useQueryClient();
  const [crear, setCrear] = useState(false);
  const [renombrar, setRenombrar] = useState<Banner | null>(null);
  const [aEliminar, setAEliminar] = useState<Banner | null>(null);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');

  const { data: banners, isLoading } = useQuery<Banner[]>({
    queryKey: ['banners'],
    queryFn: async () => (await api.get('/banners')).data,
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ['banners'] });

  const mutRenombrar = useMutation({
    mutationFn: async () =>
      (await api.put(`/banners/${renombrar!.id}`, { nombre: nombre.trim() })).data,
    onSuccess: () => {
      invalidar();
      setRenombrar(null);
    },
    onError: (e) => setError(mensajeError(e)),
  });

  const mutEliminar = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/banners/${id}`)).data,
    onSuccess: () => {
      invalidar();
      setAEliminar(null);
    },
    onError: (e) => setError(mensajeError(e)),
  });

  return (
    <Pantalla titulo="Banners">
      {isLoading ? (
        <Spinner />
      ) : !banners?.length ? (
        <Vacio mensaje="Sin banners. Crea el primero con el botón +" />
      ) : (
        <div className="space-y-2.5">
          {banners.map((b) => (
            <div key={b.id} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm shadow-black/20">
              <img
                src={`/api/banners/${b.id}/imagen`}
                alt={b.nombre}
                className="max-h-32 w-full object-cover"
                loading="lazy"
              />
              <div className="flex items-center gap-2 p-3">
                <p className="min-w-0 flex-1 truncate font-semibold text-white">{b.nombre}</p>
                <button aria-label="Renombrar" className="rounded-full p-2 active:bg-white/10" onClick={() => { setRenombrar(b); setNombre(b.nombre); setError(''); }}>✏️</button>
                <button aria-label="Eliminar" className="rounded-full p-2 active:bg-white/10" onClick={() => setAEliminar(b)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Fab onClick={() => setCrear(true)} />

      {crear && (
        <DialogoCrearBanner
          onCerrar={() => setCrear(false)}
          onCreado={() => {
            invalidar();
            setCrear(false);
          }}
        />
      )}

      <Dialogo abierto={!!renombrar} titulo="Renombrar banner" onCerrar={() => setRenombrar(null)}>
        <Campo label="Nombre">
          <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        {error && <p className="mb-2 text-sm text-bad">{error}</p>}
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => setRenombrar(null)}>Cancelar</Boton>
          <Boton className="flex-1" disabled={mutRenombrar.isPending || !nombre.trim()} onClick={() => mutRenombrar.mutate()}>Guardar</Boton>
        </div>
      </Dialogo>

      <Dialogo abierto={!!aEliminar} titulo={`¿Eliminar "${aEliminar?.nombre}"?`} onCerrar={() => setAEliminar(null)}>
        <p className="mb-4 text-sm text-muted">Los cartones ya generados con este banner no cambian.</p>
        {error && <p className="mb-2 text-sm text-bad">{error}</p>}
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => setAEliminar(null)}>Cancelar</Boton>
          <Boton variante="peligro" className="flex-1" disabled={mutEliminar.isPending} onClick={() => aEliminar && mutEliminar.mutate(aEliminar.id)}>Eliminar</Boton>
        </div>
      </Dialogo>
    </Pantalla>
  );
}

function DialogoCrearBanner({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: () => void }) {
  const [nombre, setNombre] = useState('');
  const [imagen, setImagen] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return setError('Nombre requerido');
    if (!imagen) return setError('Selecciona una imagen JPG o PNG');
    setCargando(true);
    setError('');
    try {
      const form = new FormData();
      form.append('nombre', nombre.trim());
      form.append('imagen', imagen);
      await api.post('/banners', form);
      onCreado();
    } catch (e2) {
      setError(mensajeError(e2));
    } finally {
      setCargando(false);
    }
  }

  return (
    <Dialogo abierto titulo="Nuevo banner" onCerrar={onCerrar}>
      <form onSubmit={onSubmit}>
        <Campo label="Nombre del banner">
          <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setImagen(f);
            setPreview(f ? URL.createObjectURL(f) : '');
          }}
        />
        <Boton variante="secundario" className="mb-3 w-full" onClick={() => inputRef.current?.click()}>
          {imagen ? 'Imagen seleccionada ✓' : 'Elegir imagen (JPG/PNG)'}
        </Boton>
        {preview && <img src={preview} alt="Vista previa" className="mb-3 max-h-32 w-full rounded-xl object-cover" />}
        {error && <p className="mb-2 text-sm text-bad">{error}</p>}
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" className="flex-1" disabled={cargando}>Crear</Boton>
        </div>
      </form>
    </Dialogo>
  );
}
