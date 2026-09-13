import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, mensajeError } from '../api/client';
import { Pantalla } from '../components/Layout';
import { Boton, Campo, Spinner, Vacio, inputCls } from '../components/ui';
import { subirPdfPorChunks } from '../lib/uploadChunked';
import { useAuth } from '../stores/auth.store';

interface EstadoPdf {
  estado: string;
  cartones_creados: number;
  total_paginas: number;
  errores: number;
  nombre_archivo: string;
  mensaje_error?: string;
}

type Fase = 'seleccion' | 'subiendo' | 'procesando' | 'listo' | 'error';

export default function SubirPdf() {
  const { esAdmin } = useAuth();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [bannerId, setBannerId] = useState<number | null>(null); // null = default
  const [grupoId, setGrupoId] = useState(0); // 0 = sin grupo
  const [usuariosSel, setUsuariosSel] = useState<Set<number>>(new Set());
  const [todos, setTodos] = useState(true);
  const [fase, setFase] = useState<Fase>('seleccion');
  const [progreso, setProgreso] = useState(0);
  const [pdfId, setPdfId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: banners } = useQuery<{ id: number; nombre: string }[]>({
    queryKey: ['banners'],
    queryFn: async () => (await api.get('/banners')).data,
  });
  const { data: grupos } = useQuery<{ id: number; nombre: string }[]>({
    queryKey: ['grupos'],
    queryFn: async () => (await api.get('/grupos')).data,
    enabled: esAdmin(),
  });
  const { data: usuariosGrupo } = useQuery<{ id: number; username: string }[]>({
    queryKey: ['grupo-usuarios', grupoId],
    queryFn: async () => (await api.get(`/grupos/${grupoId}/usuarios`)).data,
    enabled: esAdmin() && grupoId > 0,
  });

  // Polling de procesamiento cada 2s
  const { data: estadoPdf } = useQuery<EstadoPdf>({
    queryKey: ['pdf-estado', pdfId],
    queryFn: async () => (await api.get(`/pdfs/${pdfId}/estado`)).data,
    enabled: fase === 'procesando' && pdfId !== null,
    refetchInterval: 2000,
  });
  useEffect(() => {
    if (!estadoPdf || fase !== 'procesando') return;
    if (estadoPdf.estado === 'completado' || estadoPdf.estado === 'completado_con_errores') {
      setFase('listo');
    } else if (estadoPdf.estado === 'error') {
      setError(estadoPdf.mensaje_error ?? 'Error procesando el PDF');
      setFase('error');
    }
  }, [estadoPdf, fase]);

  async function subir() {
    if (!archivo) return;
    setFase('subiendo');
    setError('');
    try {
      const id = await subirPdfPorChunks(
        archivo,
        {
          banner_id: bannerId,
          grupo_id: esAdmin() && grupoId > 0 ? grupoId : null,
          usuarios_ids:
            esAdmin() && grupoId > 0 && !todos ? Array.from(usuariosSel) : [],
        },
        setProgreso,
      );
      setPdfId(id);
      setFase('procesando');
    } catch (e) {
      setError(mensajeError(e));
      setFase('error');
    }
  }

  function reiniciar() {
    setArchivo(null);
    setFase('seleccion');
    setProgreso(0);
    setPdfId(null);
    setError('');
  }

  return (
    <Pantalla titulo="Subir PDF">
      {fase === 'seleccion' && (
        <div className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-brand/40 bg-surface p-8 text-center active:bg-surface2"
          >
            {archivo ? (
              <>
                <p className="font-semibold text-white">📄 {archivo.name}</p>
                <p className="text-sm text-muted">
                  {(archivo.size / 1024 / 1024).toFixed(1)} MB — toca para cambiar
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl">📄</p>
                <p className="font-semibold text-brand">Seleccionar PDF</p>
              </>
            )}
          </button>

          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-black/20">
            <Campo label="Banner del cartón">
              <select
                className={inputCls}
                value={bannerId === null ? 'default' : bannerId}
                onChange={(e) =>
                  setBannerId(e.target.value === 'default' ? null : Number(e.target.value))
                }
              >
                <option value="default">Banner por defecto</option>
                <option value={0}>Sin banner (PDF original)</option>
                {banners?.map((b) => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </Campo>
          </div>

          {esAdmin() && (
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-black/20">
              <Campo label="Asignar a grupo">
                <select
                  className={inputCls}
                  value={grupoId}
                  onChange={(e) => {
                    setGrupoId(Number(e.target.value));
                    setTodos(true);
                    setUsuariosSel(new Set());
                  }}
                >
                  <option value={0}>Sin grupo asignado</option>
                  {grupos?.map((g) => (
                    <option key={g.id} value={g.id}>{g.nombre}</option>
                  ))}
                </select>
              </Campo>

              {grupoId > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted">
                    Repartir cartones entre:
                  </p>
                  <label className="mb-1 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={todos}
                      onChange={(e) => setTodos(e.target.checked)}
                      className="h-4 w-4 accent-brand"
                    />
                    <b>Todos los usuarios del grupo</b>
                  </label>
                  {!todos &&
                    (usuariosGrupo?.length ? (
                      usuariosGrupo.map((u) => (
                        <label key={u.id} className="flex items-center gap-2 py-0.5 text-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-brand"
                            checked={usuariosSel.has(u.id)}
                            onChange={(e) => {
                              const s = new Set(usuariosSel);
                              if (e.target.checked) s.add(u.id);
                              else s.delete(u.id);
                              setUsuariosSel(s);
                            }}
                          />
                          {u.username}
                        </label>
                      ))
                    ) : (
                      <Vacio mensaje="El grupo no tiene usuarios" />
                    ))}
                </div>
              )}
            </div>
          )}

          <Boton className="w-full" disabled={!archivo} onClick={subir}>
            Subir y procesar
          </Boton>
        </div>
      )}

      {fase === 'subiendo' && (
        <Progreso
          titulo={`Subiendo ${archivo?.name}…`}
          fraccion={progreso}
          detalle={`${Math.round(progreso * 100)}%`}
        />
      )}

      {fase === 'procesando' && (
        <Progreso
          titulo="Procesando cartones…"
          fraccion={
            estadoPdf && estadoPdf.total_paginas > 0
              ? estadoPdf.cartones_creados / estadoPdf.total_paginas
              : 0
          }
          detalle={
            estadoPdf && estadoPdf.total_paginas > 0
              ? `${estadoPdf.cartones_creados} / ${estadoPdf.total_paginas} cartones`
              : 'Iniciando…'
          }
          pulso
        />
      )}

      {fase === 'listo' && estadoPdf && (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center shadow-sm shadow-black/20">
          <p className="text-4xl">✅</p>
          <h2 className="mt-2 text-lg font-bold text-white">PDF procesado</h2>
          <p className="mt-1 text-sm text-muted">{estadoPdf.nombre_archivo}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div><p className="text-xl font-bold text-white">{estadoPdf.total_paginas}</p><p className="text-xs text-muted">Páginas</p></div>
            <div><p className="text-xl font-bold text-ok">{estadoPdf.cartones_creados}</p><p className="text-xs text-muted">Cartones</p></div>
            <div><p className="text-xl font-bold text-bad">{estadoPdf.errores}</p><p className="text-xs text-muted">Errores</p></div>
          </div>
          <div className="mt-5 flex gap-2">
            <Boton variante="secundario" className="flex-1" onClick={reiniciar}>Subir otro</Boton>
            <Link to="/cartones" className="flex-1">
              <Boton className="w-full">Ver cartones</Boton>
            </Link>
          </div>
        </div>
      )}

      {fase === 'error' && (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center shadow-sm shadow-black/20">
          <p className="text-4xl">❌</p>
          <h2 className="mt-2 text-lg font-bold text-white">Error</h2>
          <p className="mt-1 text-sm text-bad">{error}</p>
          <Boton className="mt-5 w-full" onClick={reiniciar}>Reintentar</Boton>
        </div>
      )}
    </Pantalla>
  );
}

function Progreso({ titulo, fraccion, detalle, pulso }: {
  titulo: string;
  fraccion: number;
  detalle: string;
  pulso?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm shadow-black/20">
      <p className={`mb-3 font-semibold text-white ${pulso ? 'animate-pulse' : ''}`}>{titulo}</p>
      <div className="h-3 overflow-hidden rounded-full bg-surface2">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500"
          style={{ width: `${Math.max(4, fraccion * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-muted">{detalle}</p>
      <Spinner className="py-3" />
      <p className="text-center text-xs text-hint">
        Puedes salir de esta pantalla; el procesamiento continúa en el servidor.
      </p>
    </div>
  );
}
