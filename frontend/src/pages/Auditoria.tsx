import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, mensajeError } from '../api/client';
import { Spinner } from '../components/ui';

interface AuditLog {
  id: number;
  entidad: string;
  entidadId: number;
  accion: string;
  usuario: {
    username: string;
  };
  fecha: string;
  estadoAnterior?: any;
  estadoNuevo?: any;
}

export function Auditoria() {
  const { data, isLoading, error } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await api.get('/admin/audit-logs');
      return res.data;
    },
  });

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-4 text-bad">{mensajeError(error)}</div>;

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-bg pb-10">
      <header className="border-b border-line bg-surface px-5 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="text-muted hover:text-white">
          ← Volver
        </Link>
        <h1 className="text-xl font-bold text-white">Registro de Auditoría</h1>
      </header>

      <main className="p-5">
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm text-white">
            <thead className="border-b border-line bg-surface2 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Entidad (ID)</th>
                <th className="px-4 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {data?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted">
                    No hay registros de auditoría.
                  </td>
                </tr>
              )}
              {data?.map((log) => (
                <tr key={log.id} className="border-b border-line hover:bg-surface2/50">
                  <td className="px-4 py-3 text-xs text-muted">
                    {new Date(log.fecha).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-brand">
                    {log.usuario?.username || 'Sistema'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-1 text-xs font-bold ${log.accion === 'VENDER' ? 'bg-bad/20 text-bad' : log.accion === 'LIBERAR' ? 'bg-ok/20 text-ok' : 'bg-warn/20 text-warn'}`}>
                      {log.accion}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {log.entidad} #{log.entidadId}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted max-w-xs truncate">
                    {log.estadoNuevo ? JSON.stringify(log.estadoNuevo) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
