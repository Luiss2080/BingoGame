/**
 * Migración de datos del sistema Flask (SQLite) al nuevo PostgreSQL.
 *
 * Uso:
 *   SQLITE_PATH=/ruta/bingo.db \
 *   DATABASE_URL=postgresql://bingo:pass@host:5432/bingo \
 *   OLD_DATA_DIR=/ruta/backend \
 *   pnpm --filter migrate-sqlite migrate
 *
 * - Preserva los IDs y resetea las secuencias (para no romper FKs ni rutas).
 * - Reescribe las rutas de archivo del layout Flask al volumen /data del nuevo stack.
 * - Copia las contraseñas werkzeug tal cual (el login las verifica y re-hashea).
 * - Idempotente por tabla: usa ON CONFLICT DO NOTHING, se puede re-ejecutar.
 */
import { DatabaseSync } from 'node:sqlite';
import { Client } from 'pg';
import { basename } from 'node:path';

const SQLITE_PATH = process.env.SQLITE_PATH;
const DATABASE_URL = process.env.DATABASE_URL;
const NEW_DATA_DIR = process.env.NEW_DATA_DIR ?? '/data';

if (!SQLITE_PATH || !DATABASE_URL) {
  console.error('Faltan variables: SQLITE_PATH y DATABASE_URL son obligatorias.');
  process.exit(1);
}

/** Reescribe una ruta del sistema Flask a la carpeta /data del nuevo stack. */
function reescribirRuta(ruta: string | null, subcarpeta: string): string | null {
  if (!ruta) return ruta;
  const norm = ruta.replace(/\\/g, '/');
  // .../imagenes_generadas/pdf_5/6001.jpg → /data/imagenes/pdf_5/6001.jpg
  const mImg = norm.match(/imagenes_generadas\/(.+)$/);
  if (mImg) return `${NEW_DATA_DIR}/imagenes/${mImg[1]}`;
  const mBan = norm.match(/uploads\/banners\/(.+)$/);
  if (mBan) return `${NEW_DATA_DIR}/banners/${mBan[1]}`;
  const mUp = norm.match(/uploads\/(.+)$/);
  if (mUp) return `${NEW_DATA_DIR}/uploads/${mUp[1]}`;
  // Fallback: dejar el basename en la subcarpeta esperada
  return `${NEW_DATA_DIR}/${subcarpeta}/${basename(norm)}`;
}

const sqlite = new DatabaseSync(SQLITE_PATH, { readOnly: true });
const pg = new Client({ connectionString: DATABASE_URL });

function leer(tabla: string): any[] {
  try {
    return sqlite.prepare(`SELECT * FROM ${tabla}`).all();
  } catch {
    console.warn(`  (tabla ${tabla} no existe en el SQLite, se omite)`);
    return [];
  }
}

async function main() {
  await pg.connect();
  console.log(`Migrando ${SQLITE_PATH} → PostgreSQL\n`);

  // Orden por dependencias de FK
  // ── grupos ─────────────────────────────────────────────────
  const grupos = leer('grupos');
  for (const g of grupos) {
    await pg.query(
      `INSERT INTO grupos (id, nombre, activo, fecha_creacion)
       VALUES ($1,$2,$3,COALESCE($4, now())) ON CONFLICT (id) DO NOTHING`,
      [g.id, g.nombre, !!g.activo, g.fecha_creacion],
    );
  }
  console.log(`grupos: ${grupos.length}`);

  // ── users (password_hash werkzeug se copia tal cual) ───────
  const users = leer('users');
  for (const u of users) {
    await pg.query(
      `INSERT INTO users (id, username, password_hash, rol, activo, grupo_id, fecha_creacion)
       VALUES ($1,$2,$3,$4::"Rol",$5,$6,COALESCE($7, now())) ON CONFLICT (id) DO NOTHING`,
      [u.id, u.username, u.password_hash, u.rol, !!u.activo, u.grupo_id, u.fecha_creacion],
    );
  }
  console.log(`users: ${users.length}`);

  // ── banners ────────────────────────────────────────────────
  const banners = leer('banners');
  for (const b of banners) {
    await pg.query(
      `INSERT INTO banners (id, nombre, ruta_imagen, activo, fecha_creacion)
       VALUES ($1,$2,$3,$4,COALESCE($5, now())) ON CONFLICT (id) DO NOTHING`,
      [b.id, b.nombre, reescribirRuta(b.ruta_imagen, 'banners'), !!b.activo, b.fecha_creacion],
    );
  }
  console.log(`banners: ${banners.length}`);

  // ── pdfs_procesados ────────────────────────────────────────
  const pdfs = leer('pdfs_procesados');
  for (const p of pdfs) {
    await pg.query(
      `INSERT INTO pdfs_procesados
        (id, nombre_archivo, ruta_archivo, fecha_procesado, total_paginas, paginas_ok,
         paginas_error, carpeta_imagenes, dpi, estado, mensaje_error, subido_por)
       VALUES ($1,$2,$3,COALESCE($4, now()),$5,$6,$7,$8,$9,$10::"EstadoPdf",$11,$12)
       ON CONFLICT (id) DO NOTHING`,
      [
        p.id, p.nombre_archivo, reescribirRuta(p.ruta_archivo, 'uploads'),
        p.fecha_procesado, p.total_paginas ?? 0, p.paginas_ok ?? 0, p.paginas_error ?? 0,
        reescribirRuta(p.carpeta_imagenes, 'imagenes'), p.dpi ?? 150,
        p.estado ?? 'completado', p.mensaje_error, p.subido_por,
      ],
    );
  }
  console.log(`pdfs_procesados: ${pdfs.length}`);

  // ── cartones ───────────────────────────────────────────────
  const cartones = leer('cartones');
  let cok = 0;
  for (const c of cartones) {
    const r = await pg.query(
      `INSERT INTO cartones
        (id, numero, pdf_id, pagina_origen, ruta_imagen, vendedor_id, grupo_id, estado,
         comprador, telefono_comprador, fecha_venta, precio, notas,
         fecha_creacion, fecha_actualizacion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::"EstadoCarton",$9,$10,$11,$12,$13,
               COALESCE($14, now()), COALESCE($15, now()))
       ON CONFLICT (id) DO NOTHING`,
      [
        c.id, c.numero, c.pdf_id, c.pagina_origen,
        reescribirRuta(c.ruta_imagen, 'imagenes'), c.vendedor_id, c.grupo_id,
        c.estado ?? 'disponible', c.comprador, c.telefono_comprador,
        c.fecha_venta, c.precio, c.notas, c.fecha_creacion, c.fecha_actualizacion,
      ],
    );
    cok += r.rowCount ?? 0;
  }
  console.log(`cartones: ${cartones.length} (insertados ${cok})`);

  // ── permisos_rol ───────────────────────────────────────────
  const permisos = leer('permisos_rol');
  for (const p of permisos) {
    await pg.query(
      `INSERT INTO permisos_rol (id, rol, permiso, habilitado)
       VALUES ($1,$2,$3,$4) ON CONFLICT (rol, permiso) DO NOTHING`,
      [p.id, p.rol, p.permiso, !!p.habilitado],
    );
  }
  console.log(`permisos_rol: ${permisos.length}`);

  // ── resetear secuencias para que los nuevos INSERT no choquen ──
  for (const tabla of ['grupos', 'users', 'banners', 'pdfs_procesados', 'cartones', 'permisos_rol']) {
    await pg.query(
      `SELECT setval(pg_get_serial_sequence('${tabla}', 'id'),
                     GREATEST((SELECT COALESCE(MAX(id),1) FROM ${tabla}), 1))`,
    );
  }

  // ── verificación ───────────────────────────────────────────
  console.log('\n── Verificación (conteo en PostgreSQL) ──');
  for (const tabla of ['grupos', 'users', 'banners', 'pdfs_procesados', 'cartones', 'permisos_rol']) {
    const { rows } = await pg.query(`SELECT count(*)::int AS n FROM ${tabla}`);
    console.log(`  ${tabla}: ${rows[0].n}`);
  }
  const faltantes = await pg.query(
    `SELECT count(*)::int AS n FROM cartones WHERE ruta_imagen IS NULL OR ruta_imagen = ''`,
  );
  if (faltantes.rows[0].n > 0) {
    console.warn(`  ⚠ ${faltantes.rows[0].n} cartones sin ruta de imagen`);
  }

  console.log('\n✔ Migración de datos completa.');
  console.log('Recuerda copiar los archivos (imágenes, PDFs, banners) al volumen media:');
  console.log('  imagenes_generadas/ → /data/imagenes/');
  console.log('  uploads/            → /data/uploads/  (uploads/banners → /data/banners)');

  await pg.end();
  sqlite.close();
}

main().catch((e) => {
  console.error('ERROR en la migración:', e);
  process.exit(1);
});
