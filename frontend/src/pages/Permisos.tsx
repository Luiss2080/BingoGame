import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PERMISOS, PERMISO_LABELS, type Permiso } from '@bingo/common';
import { api, mensajeError } from '../api/client';
import { Pantalla } from '../components/Layout';
import { Spinner } from '../components/ui';

export default function Permisos() {
  const qc = useQueryClient();
  const [mensaje, setMensaje] = useState('');

  const { data, isLoading } = useQuery<{ permisos: Record<Permiso, boolean> }>({
    queryKey: ['permisos'],
    queryFn: async () => (await api.get('/permisos')).data,
  });

  const cambiar = useMutation({
    mutationFn: async ({ permiso, habilitado }: { permiso: Permiso; habilitado: boolean }) =>
      (await api.put(`/permisos/${permiso}`, { habilitado })).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['permisos'] });
      setMensaje(`"${PERMISO_LABELS[v.permiso]}" ${v.habilitado ? 'activado' : 'desactivado'} ✓`);
    },
    onError: (e) => setMensaje(mensajeError(e)),
  });

  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(''), 2000);
    return () => clearTimeout(t);
  }, [mensaje]);

  return (
    <Pantalla titulo="Permisos de vendedores">
      <p className="mb-4 text-sm text-muted">
        Controla qué pueden hacer los usuarios con rol <b>vendedor</b>. Los admins
        siempre tienen todos los permisos.
      </p>

      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className="space-y-2.5">
          {PERMISOS.map((p) => (
            <label
              key={p}
              className="flex cursor-pointer items-center justify-between rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-black/20"
            >
              <span className="font-semibold text-white">{PERMISO_LABELS[p]}</span>
              <input
                type="checkbox"
                className="h-6 w-11 appearance-none rounded-full bg-line transition-colors checked:bg-brand
                  before:block before:h-5 before:w-5 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full
                  before:bg-white before:transition-transform checked:before:translate-x-[1.375rem]"
                checked={data.permisos[p]}
                disabled={cambiar.isPending}
                onChange={(e) => cambiar.mutate({ permiso: p, habilitado: e.target.checked })}
              />
            </label>
          ))}
        </div>
      )}

      {mensaje && (
        <p className="mt-4 rounded-xl bg-brand/10 p-3 text-center text-sm font-medium text-brand">
          {mensaje}
        </p>
      )}
    </Pantalla>
  );
}
