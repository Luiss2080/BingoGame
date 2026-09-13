/** Permisos configurables por el admin para el rol vendedor. */
export const PERMISOS = ['subir_pdf', 'vender', 'reservar', 'liberar'] as const;

export type Permiso = (typeof PERMISOS)[number];

export const PERMISO_LABELS: Record<Permiso, string> = {
  subir_pdf: 'Subir PDFs',
  vender: 'Vender cartones',
  reservar: 'Reservar cartones',
  liberar: 'Liberar cartones',
};

/** Defaults del rol vendedor; el admin siempre tiene todos en true. */
export const DEFAULTS_VENDEDOR: Record<Permiso, boolean> = {
  subir_pdf: false,
  vender: true,
  reservar: true,
  liberar: true,
};

export const ROLES = ['admin', 'vendedor'] as const;
export type Rol = (typeof ROLES)[number];

export const ESTADOS_CARTON = ['disponible', 'vendido', 'reservado'] as const;
export type EstadoCarton = (typeof ESTADOS_CARTON)[number];

export const ESTADOS_PDF = [
  'pendiente',
  'procesando',
  'completado',
  'completado_con_errores',
  'error',
] as const;
export type EstadoPdf = (typeof ESTADOS_PDF)[number];
