import { z } from 'zod';
import { ESTADOS_CARTON, PERMISOS, ROLES } from './permisos';

// ── Auth ─────────────────────────────────────────────────────
export const loginSchema = z.object({
  username: z.string().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
});
export type LoginDto = z.infer<typeof loginSchema>;

// ── Usuarios ─────────────────────────────────────────────────
export const crearUsuarioSchema = z.object({
  username: z.string().min(3, 'Mínimo 3 caracteres').max(80),
  password: z.string().min(4, 'Mínimo 4 caracteres'),
  rol: z.enum(ROLES).default('vendedor'),
  grupo_id: z.number().int().positive().nullish(),
});
export type CrearUsuarioDto = z.infer<typeof crearUsuarioSchema>;

export const editarUsuarioSchema = z.object({
  password: z.string().min(4).optional().or(z.literal('')),
  rol: z.enum(ROLES).optional(),
  activo: z.boolean().optional(),
  grupo_id: z.number().int().positive().nullish(),
});
export type EditarUsuarioDto = z.infer<typeof editarUsuarioSchema>;

// ── Grupos ───────────────────────────────────────────────────
export const grupoSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(200),
});
export type GrupoDto = z.infer<typeof grupoSchema>;

// ── Banners ──────────────────────────────────────────────────
export const renombrarBannerSchema = z.object({
  nombre: z.string().min(1).max(200),
});

// ── Permisos ─────────────────────────────────────────────────
export const setPermisoSchema = z.object({
  habilitado: z.boolean(),
});
export const permisoParamSchema = z.enum(PERMISOS);

// ── Cartones ─────────────────────────────────────────────────
export const venderSchema = z.object({
  comprador: z.string().min(1, 'Comprador requerido').max(200),
  telefono: z.string().max(50).optional().default(''),
  precio: z.coerce.number().nonnegative().optional(),
  notas: z.string().max(2000).optional().default(''),
});
export type VenderDto = z.infer<typeof venderSchema>;

export const reservarSchema = z.object({
  comprador: z.string().max(200).optional().default(''),
  telefono: z.string().max(50).optional().default(''),
});
export type ReservarDto = z.infer<typeof reservarSchema>;

export const listarCartonesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  estado: z.enum(ESTADOS_CARTON).optional().or(z.literal('')),
  q: z.string().max(50).optional().default(''),
  usuario_id: z.coerce.number().int().positive().optional(),
  grupo_id: z.coerce.number().int().positive().optional(),
});
export type ListarCartonesDto = z.infer<typeof listarCartonesSchema>;

// ── PDFs ─────────────────────────────────────────────────────
export const pdfCompletarSchema = z.object({
  upload_id: z.string().uuid(),
  // banner_id: undefined/null → banner default; 0 → sin banner; n → banner n
  banner_id: z.number().int().nonnegative().nullish(),
  grupo_id: z.number().int().positive().nullish(),
  usuarios_ids: z.array(z.number().int().positive()).optional(),
  usuario_id: z.number().int().positive().nullish(),
});
export type PdfCompletarDto = z.infer<typeof pdfCompletarSchema>;
