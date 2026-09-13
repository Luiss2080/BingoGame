import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, mensajeError } from '../api/client';
import { Pantalla } from '../components/Layout';
import { Boton, Dialogo, Spinner, Vacio } from '../components/ui';
import { fecha } from '../lib/format';

interface Pdf {
  id: number;
  nombre_archivo: string;
  fecha_procesado: string;
  total_paginas: number;
  paginas_ok: number;
  estado: string;
  total_cartones: number;
}

const ESTILO_ESTADO: Record<string, { texto: string; clase: string }> = {
  procesando: { texto: '● Procesando', clase: 'text-ok animate-pulse' },
  completado: { texto: '✓ Completado', clase: 'text-brand' },
  completado_con_errores: { texto: '⚠ Con errores', clase: 'text-warn' },
  error: { texto: '✗ Error', clase: 'text-bad' },
};

export default function Pdfs() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [aEliminar, setAEliminar] = useState<Pdf | null>(null);
  const [error, setError] = useState('');

  const { data: pdfs, isLoading } = useQuery<Pdf[]>({
    queryKey: ['pdfs'],
    queryFn: async () => (await api.get('/pdfs')).data,
    // Auto-refresh cada 2s mientras haya PDFs procesando (paridad con la app)
    refetchInterval: (query) =>
      query.state.data?.some((p) => p.estado === 'procesando') ? 2000 : false,
  });

  const eliminar = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/pdfs/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdfs'] });
      qc.invalidateQueries({ queryKey: ['cartones'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setAEliminar(null);
    },
    onError: (e) => setError(mensajeError(e)),
  });

  return (
    <Pantalla titulo="PDFs procesados">
      {isLoading ? (
        <Spinner />
      ) : !pdfs?.length ? (
        <Vacio mensaje="Aún no has subido PDFs" />
      ) : (
        <div className="space-y-2.5">
          {pdfs.map((p) => {
            const estilo = ESTILO_ESTADO[p.estado] ?? { texto: p.estado, clase: 'text-muted' };
            const conteo =
              p.estado === 'procesando' && p.total_paginas > 0
                ? `${p.paginas_ok} / ${p.total_paginas} cartones`
                : `${p.total_cartones || p.paginas_ok} cartones`;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-black/20 active:bg-surface2"
                onClick={() => navigate('/cartones')}
              >
                <span className="text-2xl">📄</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{p.nombre_archivo}</p>
                  <p className="text-xs text-muted">
                    {conteo} · {fecha(p.fecha_procesado)}
                  </p>
                  <p className={`text-xs font-semibold ${estilo.clase}`}>{estilo.texto}</p>
                </div>
                <button
                  aria-label="Eliminar PDF"
                  className="rounded-full p-2 text-lg active:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAEliminar(p);
                  }}
                >
                  🗑
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Dialogo
        abierto={!!aEliminar}
        titulo="¿Eliminar PDF?"
        onCerrar={() => setAEliminar(null)}
      >
        <p className="mb-4 text-sm text-muted">
          Se eliminarán <b>{aEliminar?.nombre_archivo}</b> y sus{' '}
          <b>{aEliminar?.total_cartones ?? 0} cartones</b>.
        </p>
        {error && <p className="mb-2 text-sm text-bad">{error}</p>}
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => setAEliminar(null)}>
            Cancelar
          </Boton>
          <Boton
            variante="peligro"
            className="flex-1"
            disabled={eliminar.isPending}
            onClick={() => aEliminar && eliminar.mutate(aEliminar.id)}
          >
            Eliminar
          </Boton>
        </div>
      </Dialogo>
    </Pantalla>
  );
}
