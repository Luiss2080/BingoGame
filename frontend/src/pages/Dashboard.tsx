import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, mensajeError } from '../api/client';
import { useAuth } from '../stores/auth.store';
import { dinero } from '../lib/format';
import { Boton, Dialogo, Spinner } from '../components/ui';
import { BotonInstalarApp } from '../components/InstallPrompt';
import { VentasChart } from '../components/VentasChart';
import { motion, Variants } from 'framer-motion';

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
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      className="rounded-2xl border border-white/10 bg-surface/50 backdrop-blur-md p-5 shadow-lg shadow-black/10 transition-colors hover:bg-surface2/60"
    >
      <p className={`text-3xl font-extrabold tracking-tight ${color}`}>{valor}</p>
      <p className="mt-1 text-sm font-medium text-muted">{label}</p>
    </motion.div>
  );
  return to ? <Link to={to}>{contenido}</Link> : contenido;
}

function BotonMenu({ to, label }: { to: string; label: string }) {
  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
      <Link
        to={to}
        className="flex items-center gap-4 rounded-2xl border border-white/5 bg-surface/40 backdrop-blur-md p-4 shadow-md transition-colors hover:border-brand/30 hover:bg-surface2/60 active:bg-surface2"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10">
          <span className="h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_8px_rgba(0,242,254,0.8)]" />
        </div>
        <span className="font-semibold text-white tracking-wide">{label}</span>
        <span className="ml-auto text-xl leading-none text-muted transition-transform group-hover:translate-x-1">›</span>
      </Link>
    </motion.div>
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

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-10">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-bg/80 backdrop-blur-xl px-5 pb-5 pt-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-brand">
          Panel {esAdmin() ? 'Admin' : 'Vendedor'}
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="truncate text-2xl font-extrabold text-white">Bienvenido, {user?.username}</h1>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setConfirmar('logout')}
            aria-label="Cuenta / cerrar sesión"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-xl font-black text-[#090e17] shadow-lg shadow-brand/20"
          >
            {user?.username?.[0]?.toUpperCase() ?? '?'}
          </motion.button>
        </div>
      </header>

      <main className="space-y-6 px-4 pt-6">
        {isLoading || !data ? (
          <Spinner />
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {esAdmin() && data.ventas_por_hora && (
              <motion.div variants={itemVariants}>
                <VentasChart data={data.ventas_por_hora} />
              </motion.div>
            )}
            
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
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
            </motion.div>

            {esAdmin() && data.ranking_vendedores.length > 0 && (
              <motion.div variants={itemVariants} className="rounded-2xl border border-white/5 bg-surface/40 backdrop-blur-md p-5 shadow-lg">
                <h3 className="mb-4 text-base font-extrabold text-white">Top 10 Vendedores</h3>
                <div className="space-y-3">
                  {data.ranking_vendedores.map((v, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-warn text-[#3a2600] shadow-[0_0_10px_rgba(245,158,11,0.5)]' : i === 1 ? 'bg-slate-300 text-slate-800' : i === 2 ? 'bg-amber-700 text-amber-100' : 'bg-surface2/80 text-muted'}`}>
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-white tracking-wide">{v.username}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-brand">{dinero(v.recaudado)}</p>
                        <p className="text-xs font-medium text-muted">{v.vendidos} cartones</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div variants={itemVariants}>
              <p className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-muted">Módulos Principales</p>
              <div className="space-y-3">
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
            </motion.div>
          </motion.div>
        )}

        {esAdmin() && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3 rounded-2xl border border-dashed border-white/20 bg-surface/30 backdrop-blur-sm p-4 mt-8"
          >
            <p className="text-xs font-black uppercase tracking-widest text-muted">Zona Administrativa Peligrosa</p>
            <Boton variante="secundario" className="w-full text-left justify-start gap-2" onClick={() => window.open('/api/admin/queues', '_blank')}>
              <span>⏱️</span> Monitor de Colas (BullMQ)
            </Boton>
            <div className="flex gap-3">
              <Boton variante="primario" className="flex-1 px-2 py-3" onClick={() => descargarReporte('excel')}>
                📊 Excel
              </Boton>
              <Boton variante="primario" className="flex-1 px-2 py-3" onClick={() => descargarReporte('pdf')}>
                📄 PDF
              </Boton>
            </div>
            <Boton variante="secundario" className="w-full" onClick={() => setConfirmar('regenerar')}>
              🖼 Regenerar imágenes
            </Boton>
            <Boton variante="peligro" className="w-full" onClick={() => setConfirmar('reset')}>
              🗑 Limpiar BD (cartones y PDFs)
            </Boton>
            {mensajeAdmin && <p className="text-sm font-medium text-brand">{mensajeAdmin}</p>}
          </motion.div>
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
