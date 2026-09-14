import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Pantalla } from '../components/Layout';

import { Dialogo, EstadoBadge, Spinner, Vacio, Boton } from '../components/ui';
import { dinero } from '../lib/format';
import { motion } from 'framer-motion';

interface Carton {
  id: number;
  numero: string;
  estado: string;
  comprador: string | null;
  precio: number | null;
  lockedBy?: string | null;
}
interface PaginaCartones {
  cartones: Carton[];
  total: number;
  page: number;
  total_paginas: number;
}

const FILTROS = [
  { valor: '', label: 'Todos' },
  { valor: 'disponible', label: 'Disponibles' },
  { valor: 'vendido', label: 'Vendidos' },
  { valor: 'reservado', label: 'Reservados' },
] as const;

import { useRealtimeCartones } from '../hooks/useRealtimeCartones';
import { useAuth } from '../stores/auth.store';

export default function Cartones() {
  const [params, setParams] = useSearchParams();
  const estado = params.get('estado') ?? '';
  const [q, setQ] = useState(params.get('q') ?? '');
  const [qDebounced, setQDebounced] = useState(q);
  const [verNoDisponible, setVerNoDisponible] = useState(false);
  const sentinela = useRef<HTMLDivElement>(null);

  const { emitTap } = useRealtimeCartones();
  const usuarioActual = useAuth((s) => s.user?.id);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<PaginaCartones>({
      queryKey: ['cartones', estado, qDebounced],
      queryFn: async ({ pageParam }) => {
        const res = await api.get('/cartones', {
          params: { page: pageParam, estado, q: qDebounced },
        });
        return res.data;
      },
      initialPageParam: 1,
      getNextPageParam: (ultima) =>
        ultima.page < ultima.total_paginas ? ultima.page + 1 : undefined,
    });

  const cartones = data?.pages.flatMap((p) => p.cartones) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  // Búsqueda global: si el listado da 0 con búsqueda activa, consultar quién tiene el número
  const { data: busquedaGlobal } = useQuery({
    queryKey: ['buscar-numero', qDebounced],
    queryFn: async () => (await api.get('/buscar-numero', { params: { q: qDebounced } })).data,
    enabled: !!qDebounced && !isLoading && cartones.length === 0,
  });
  useEffect(() => {
    if (busquedaGlobal && busquedaGlobal.encontrado && !busquedaGlobal.disponible) {
      setVerNoDisponible(true);
    }
  }, [busquedaGlobal]);

  // Scroll infinito
  useEffect(() => {
    const el = sentinela.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Pantalla titulo="Cartones">
      <input
        className="mb-3 w-full rounded-full border border-line bg-surface2 px-4 py-2.5 text-base text-white placeholder:text-hint outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
        placeholder="Buscar por número, comprador o teléfono…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        inputMode="search"
      />

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => {
              const p = new URLSearchParams(params);
              if (f.valor) p.set('estado', f.valor);
              else p.delete('estado');
              setParams(p, { replace: true });
            }}
            className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-bold tracking-wide transition-all duration-300 ${
              estado === f.valor ? 'bg-gradient-to-r from-brand to-brand-dark text-[#090e17] shadow-[0_0_15px_rgba(0,242,254,0.3)]' : 'border border-white/10 bg-surface/40 backdrop-blur-md text-muted hover:bg-surface2 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="mb-2 text-sm text-muted">{total} cartones</p>

      {isLoading ? (
        <Spinner />
      ) : cartones.length === 0 ? (
        <Vacio mensaje={qDebounced ? 'Sin resultados' : 'No hay cartones'} />
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
          className="grid grid-cols-2 gap-4"
        >
          {cartones.map((c) => {
            const isLockedByOther = c.lockedBy && String(c.lockedBy) !== String(usuarioActual);
            
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={!isLockedByOther ? { y: -4, scale: 1.03 } : {}}
                whileTap={!isLockedByOther ? { scale: 0.95 } : {}}
                className={`transition-all duration-300 ${
                  isLockedByOther ? 'opacity-50 grayscale select-none pointer-events-none' : ''
                }`}
                style={{ contentVisibility: 'auto' }}
              >
                <Link
                  to={`/cartones/${c.id}`}
                  onClick={() => {
                    if (!isLockedByOther) emitTap(c.id);
                  }}
                  className="block overflow-hidden rounded-2xl border border-white/10 bg-surface/50 backdrop-blur-md shadow-lg shadow-black/20 hover:border-brand/40 relative"
                >
                  {isLockedByOther && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white">
                      <span className="text-3xl">🔒</span>
                      <span className="mt-2 text-xs font-black uppercase tracking-widest text-brand">En uso</span>
                    </div>
                  )}
                  <div className="relative aspect-[4/3] bg-bg/50">
                    <img
                      src={`/api/cartones/${c.id}/imagen?v=${c.estado}`}
                      alt={`Cartón ${c.numero}`}
                      loading="lazy"
                      className="h-full w-full object-cover object-top"
                    />
                    <span className="absolute right-2 top-2">
                      <EstadoBadge estado={c.estado} />
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="truncate text-xl font-extrabold text-white">#{c.numero}</p>
                    <p className="mt-1 truncate text-xs font-medium text-muted">
                      {c.comprador || 'Sin asignar'}
                      {c.precio != null && c.precio > 0 ? ` · ${dinero(c.precio)}` : ''}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <div ref={sentinela} className="h-8" />
      {isFetchingNextPage && <Spinner className="py-2" />}

      <Dialogo
        abierto={verNoDisponible}
        titulo="Cartón no disponible"
        onCerrar={() => setVerNoDisponible(false)}
      >
        {busquedaGlobal && (
          <div className="space-y-2 text-sm text-muted">
            <p>
              El número <b>{qDebounced}</b> ya está{' '}
              <b>{busquedaGlobal.estado === 'vendido' ? 'vendido' : 'reservado'}</b>.
            </p>
            <p>Vendedor: <b>{busquedaGlobal.vendedor}</b></p>
            {busquedaGlobal.grupo && <p>Grupo: <b>{busquedaGlobal.grupo}</b></p>}
          </div>
        )}
        <Boton className="mt-4 w-full" onClick={() => setVerNoDisponible(false)}>
          Entendido
        </Boton>
      </Dialogo>
    </Pantalla>
  );
}
