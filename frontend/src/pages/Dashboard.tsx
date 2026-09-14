import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, mensajeError } from '../api/client';
import { useAuth } from '../stores/auth.store';
import { dinero } from '../lib/format';
import { Boton, Dialogo, Spinner } from '../components/ui';
import { BotonInstalarApp } from '../components/InstallPrompt';
import { VentasChart } from '../components/VentasChart';

interface DashboardData {
  cartones: {
    total: number;
    disponibles: number;
    disponibles_unicos: number;
    vendidos: number;
    reservados: number;
  };
  financiero?: {
    total_recaudado: number;
  };
  ranking_vendedores: {
    username: string;
    vendidos: number;
    recaudado: number;
  }[];
  ultimos_pdfs: any[];
  estadisticas_pdf?: {
    total: number;
    exitosos: number;
    ratio_exito: number;
  };
  ventas_por_hora?: {
    hora: string;
    cantidad: number;
    ingresos: number;
  }[];
}

function Tarjeta({ valor, label, color = 'text-white', to }: {
  valor: string | number;
  label: string;
  color?: string;
  to?: string;
}) {
  const contenido = (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-black/20 active:border-brand/50">
      <p className={`text-2xl font-bold ${color}`}>{valor}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{contenido}</Link> : contenido;
}

function BotonMenu({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-black/20 active:border-brand/50 active:bg-surface2"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
      <span className="font-medium text-white">{label}</span>
      <span className="ml-auto text-lg leading-none text-muted">›</span>
    </Link>
  );
}

export default function Dashboard() {
  const { user, esAdmin, tienePermiso, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmar, setConfirmar] = useState<null | 'logout' | 'reset' | 'regenerar'>(null);
  const [mensajeAdmin, setMensajeAdmin] = useState('');

  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard')).data,
    refetchOnWindowFocus: true,
  });

  async function accionAdmin(ruta: string) {
    try {
      const res = await api.post(ruta, {});
      setMensajeAdmin(res.data.mensaje ?? 'Listo');
      refetch();
    } catch (e) {
      setMensajeAdmin(mensajeError(e));
    }
    setConfirmar(null);
  }

  async function descargarReporte(tipo: 'excel' | 'pdf') {
    try {
      const token = localStorage.getItem('bingo_token');
      const response = await fetch(`/api/reportes/${tipo}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Error al generar el reporte');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = tipo === 'excel' ? `Reporte_Ventas_${Date.now()}.xlsx` : `Corte_Caja_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      setMensajeAdmin(e instanceof Error ? e.message : 'Error desconocido');
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-bg pb-10">
      <header className="border-b border-line bg-surface px-5 pb-5 pt-6">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          Panel {esAdmin() ? 'Admin' : 'Vendedor'}
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="truncate text-xl font-bold text-white">Bienvenido, {user?.username}</h1>
          <button
            onClick={() => setConfirmar('logout')}
            aria-label="Cuenta / cerrar sesión"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-[#00110d] active:scale-95"
          >
            {user?.username?.[0]?.toUpperCase() ?? '?'}
          </button>
        </div>
      </header>

      <main className="space-y-5 px-4 pt-4">
        {isLoading || !data ? (
          <Spinner />
        ) : (
          <>
            {esAdmin() && data.ventas_por_hora && (
              <VentasChart data={data.ventas_por_hora} />
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <Tarjeta valor={data.cartones.total} label="Total cartones" to="/cartones" />
              <Tarjeta valor={data.cartones.disponibles} label="Disponibles" color="text-ok" to="/cartones?estado=disponible" />
              <Tarjeta valor={data.cartones.vendidos} label="Vendidos" color="text-bad" to="/cartones?estado=vendido" />
              <Tarjeta valor={data.cartones.reservados} label="Reservados" color="text-warn" to="/cartones?estado=reservado" />
              {data.financiero && (
                <Tarjeta valor={dinero(data.financiero.total_recaudado)} label="Ingresos" color="text-brand" />
              )}
              {data.estadisticas_pdf && (
                <Tarjeta valor={`${data.estadisticas_pdf.ratio_exito.toFixed(1)}%`} label="Éxito PDFs" color="text-white" to={tienePermiso('subir_pdf') ? '/pdfs' : undefined} />
              )}
            </div>

            {esAdmin() && data.ranking_vendedores.length > 0 && (
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-black/20">
                <h3 className="mb-3 text-sm font-bold text-white">Top 10 Vendedores</h3>
                <div className="space-y-2">
                  {data.ranking_vendedores.map((v, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-line pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface2 text-xs font-bold text-muted">{i + 1}</span>
                        <span className="text-sm font-medium text-white">{v.username}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-brand">{dinero(v.recaudado)}</p>
                        <p className="text-xs text-muted">{v.vendidos} cartones</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div>
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">Módulos</p>
          <div className="space-y-2.5">
            <BotonMenu to="/cartones" label="Ver cartones / Buscar" />
            {tienePermiso('subir_pdf') && (
              <>
                <BotonMenu to="/subir-pdf" label="Subir PDF" />
                <BotonMenu to="/pdfs" label="Ver PDFs" />
              </>
            )}
            {esAdmin() && (
              <>
                <BotonMenu to="/usuarios" label="Usuarios" />
                <BotonMenu to="/grupos" label="Grupos" />
                <BotonMenu to="/banners" label="Banners" />
                <BotonMenu to="/permisos" label="Permisos" />
                <BotonMenu to="/auditoria" label="Registro de Auditoría" />
              </>
            )}
            <BotonInstalarApp />
          </div>
        </div>

        {esAdmin() && (
          <div className="space-y-2.5 rounded-2xl border border-dashed border-line p-3">
            <p className="text-xs font-semibold uppercase text-muted">Zona admin</p>
            <Boton variante="secundario" className="w-full" onClick={() => window.open('/api/admin/queues', '_blank')}>
              ⏱️ Monitor de Colas (BullMQ)
            </Boton>
            <div className="flex gap-2">
              <Boton variante="primario" className="flex-1 text-sm px-2 py-3" onClick={() => descargarReporte('excel')}>
                📊 Excel
              </Boton>
              <Boton variante="primario" className="flex-1 text-sm px-2 py-3" onClick={() => descargarReporte('pdf')}>
                📄 PDF
              </Boton>
            </div>
            <Boton variante="secundario" className="w-full" onClick={() => setConfirmar('regenerar')}>
              🖼 Regenerar imágenes
            </Boton>
            <Boton variante="peligro" className="w-full" onClick={() => setConfirmar('reset')}>
              🗑 Limpiar BD (cartones y PDFs)
            </Boton>
            {mensajeAdmin && <p className="text-sm text-muted">{mensajeAdmin}</p>}
          </div>
        )}
      </main>

      <Dialogo
        abierto={confirmar === 'logout'}
        titulo="¿Cerrar sesión?"
        onCerrar={() => setConfirmar(null)}
      >
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => setConfirmar(null)}>
            Cancelar
          </Boton>
          <Boton
            variante="peligro"
            className="flex-1"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            Salir
          </Boton>
        </div>
      </Dialogo>

      <Dialogo
        abierto={confirmar === 'reset'}
        titulo="⚠️ Borrar TODOS los cartones y PDFs"
        onCerrar={() => setConfirmar(null)}
      >
        <p className="mb-4 text-sm text-muted">
          Se eliminarán todos los cartones, PDFs y sus imágenes. Usuarios, grupos y
          banners se conservan. Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => setConfirmar(null)}>
            Cancelar
          </Boton>
          <Boton variante="peligro" className="flex-1" onClick={() => accionAdmin('/admin/reset-cartones')}>
            Borrar todo
          </Boton>
        </div>
      </Dialogo>

      <Dialogo
        abierto={confirmar === 'regenerar'}
        titulo="Regenerar imágenes de cartones"
        onCerrar={() => setConfirmar(null)}
      >
        <p className="mb-4 text-sm text-muted">
          Se re-generarán todas las imágenes en segundo plano con el diseño actual.
        </p>
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => setConfirmar(null)}>
            Cancelar
          </Boton>
          <Boton className="flex-1" onClick={() => accionAdmin('/admin/regenerar-imagenes')}>
            Regenerar
          </Boton>
        </div>
      </Dialogo>
    </div>
  );
}
