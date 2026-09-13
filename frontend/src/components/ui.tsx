import { ReactNode, useEffect } from 'react';
import type { EstadoCarton } from '@bingo/common';

// ── Colores de estado (paleta navy + teal, estilo App_Atletic) ───
export const COLOR_ESTADO: Record<string, { texto: string; fondo: string }> = {
  disponible: { texto: 'text-ok', fondo: 'bg-ok/15' },
  vendido: { texto: 'text-bad', fondo: 'bg-bad/15' },
  reservado: { texto: 'text-warn', fondo: 'bg-warn/15' },
};

export function EstadoChip({ estado }: { estado: EstadoCarton | string }) {
  const c = COLOR_ESTADO[estado] ?? { texto: 'text-muted', fondo: 'bg-muted/15' };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${c.texto} ${c.fondo}`}>
      {estado}
    </span>
  );
}

// Badge sólido de estado, para superponer sobre la imagen del cartón.
const COLOR_ESTADO_SOLIDO: Record<string, string> = {
  disponible: 'bg-ok text-[#00110d]',
  vendido: 'bg-bad text-[#3a0d0b]',
  reservado: 'bg-warn text-[#3a1f00]',
};

export function EstadoBadge({ estado }: { estado: EstadoCarton | string }) {
  const c = COLOR_ESTADO_SOLIDO[estado] ?? 'bg-muted text-[#0d1b2a]';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase shadow-sm shadow-black/30 ${c}`}>
      {estado}
    </span>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex justify-center py-8 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
    </div>
  );
}

export function Boton({
  children,
  onClick,
  variante = 'primario',
  disabled,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variante?: 'primario' | 'secundario' | 'peligro' | 'verde' | 'ambar';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const estilos = {
    primario: 'bg-brand text-[#04241f] active:bg-brand-dark',
    secundario: 'bg-surface2 text-white active:bg-line',
    peligro: 'bg-bad text-white active:bg-bad/80',
    verde: 'bg-ok text-white active:bg-ok/80',
    ambar: 'bg-warn text-[#3a2600] active:bg-warn/80',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-40 ${estilos[variante]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Dialogo({
  abierto,
  titulo,
  children,
  onCerrar,
}: {
  abierto: boolean;
  titulo: string;
  children: ReactNode;
  onCerrar: () => void;
}) {
  useEffect(() => {
    if (!abierto) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [abierto, onCerrar]);

  if (!abierto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onCerrar}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-white">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

export function Campo({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-base text-white placeholder:text-hint outline-none focus:border-brand focus:ring-2 focus:ring-brand/25';

export function Vacio({ mensaje }: { mensaje: string }) {
  return <p className="py-12 text-center text-sm text-muted">{mensaje}</p>;
}
