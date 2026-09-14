import { ReactNode, useEffect } from 'react';
import type { EstadoCarton } from '@bingo/common';
import { motion, AnimatePresence } from 'framer-motion';

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
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="h-10 w-10 rounded-full border-[3px] border-surface2 border-t-brand shadow-[0_0_15px_rgba(0,242,254,0.3)]" 
      />
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
    primario: 'bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-[#090e17] shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:shadow-[0_0_25px_rgba(0,242,254,0.5)]',
    secundario: 'bg-surface2/60 backdrop-blur-md border border-white/5 text-white hover:bg-surface2',
    peligro: 'bg-gradient-to-r from-bad to-[#c53030] text-white shadow-lg shadow-bad/20',
    verde: 'bg-gradient-to-r from-ok to-[#047857] text-white shadow-lg shadow-ok/20',
    ambar: 'bg-gradient-to-r from-warn to-[#b45309] text-white shadow-lg shadow-warn/20',
  };
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-3 text-sm font-bold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${estilos[variante]} ${className}`}
    >
      {children}
    </motion.button>
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

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 backdrop-blur-sm sm:items-center"
          onClick={onCerrar}
        >
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-surface/80 backdrop-blur-xl p-6 sm:rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-6 text-xl font-extrabold tracking-tight text-white">{titulo}</h2>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
  'w-full rounded-xl border border-white/10 bg-surface2/50 backdrop-blur-sm px-4 py-3 text-base text-white placeholder:text-muted/60 outline-none transition-all duration-300 hover:border-brand/50 focus:border-brand focus:bg-surface2 focus:ring-4 focus:ring-brand/20 shadow-inner';

export function Vacio({ mensaje }: { mensaje: string }) {
  return <p className="py-12 text-center text-sm text-muted">{mensaje}</p>;
}
