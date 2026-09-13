"""Acceso a PostgreSQL del worker. El esquema lo gobierna Prisma (backend);
aquí solo SQL plano contra tablas ya migradas."""
import os

import psycopg

DATABASE_URL = os.environ.get(
    'DATABASE_URL', 'postgresql://bingo:bingo@localhost:5433/bingo'
)


def get_conn():
    return psycopg.connect(DATABASE_URL, autocommit=True)


def resolver_asignados(conn, grupo_id, usuarios_ids, vendedor_id):
    """Lista de user_ids para round-robin (paridad con _procesar_pdf_async)."""
    with conn.cursor() as cur:
        if grupo_id:
            if usuarios_ids:
                cur.execute(
                    'SELECT id FROM users WHERE id = ANY(%s) AND activo ORDER BY id',
                    (usuarios_ids,),
                )
            else:
                cur.execute(
                    'SELECT id FROM users WHERE grupo_id = %s AND activo ORDER BY id',
                    (grupo_id,),
                )
            return [r[0] for r in cur.fetchall()]
        if vendedor_id:
            cur.execute('SELECT id FROM users WHERE id = %s', (vendedor_id,))
            return [r[0] for r in cur.fetchall()]
        return []


def insertar_carton(conn, numero, pdf_id, pagina, ruta, vendedor_id, grupo_id):
    """Inserta un cartón; devuelve True si se insertó (False = duplicado).
    ON CONFLICT DO NOTHING hace el reproceso idempotente ante reintentos."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO cartones
              (numero, pdf_id, pagina_origen, ruta_imagen, vendedor_id, grupo_id,
               estado, fecha_creacion, fecha_actualizacion)
            VALUES (%s, %s, %s, %s, %s, %s, 'disponible', now(), now())
            ON CONFLICT DO NOTHING
            """,
            (numero, pdf_id, pagina, ruta, vendedor_id, grupo_id),
        )
        return cur.rowcount > 0


def actualizar_progreso(conn, pdf_id, ok, errores, total):
    with conn.cursor() as cur:
        cur.execute(
            """UPDATE pdfs_procesados
               SET paginas_ok = %s, paginas_error = %s, total_paginas = %s
               WHERE id = %s""",
            (ok, errores, total, pdf_id),
        )


def finalizar_pdf(conn, pdf_id, estado, ok, errores, total, mensaje=None):
    with conn.cursor() as cur:
        cur.execute(
            """UPDATE pdfs_procesados
               SET estado = %s::"EstadoPdf", paginas_ok = %s, paginas_error = %s,
                   total_paginas = %s, mensaje_error = %s
               WHERE id = %s""",
            (estado, ok, errores, total, mensaje, pdf_id),
        )


def marcar_error(conn, pdf_id, mensaje):
    with conn.cursor() as cur:
        cur.execute(
            """UPDATE pdfs_procesados
               SET estado = 'error', mensaje_error = %s WHERE id = %s""",
            (str(mensaje)[:1000], pdf_id),
        )


def cartones_para_regenerar(conn):
    """(id, numero, pagina_origen, ruta_imagen, ruta_pdf) de todos los cartones."""
    with conn.cursor() as cur:
        cur.execute(
            """SELECT c.id, c.numero, c.pagina_origen, c.ruta_imagen, p.ruta_archivo
               FROM cartones c
               LEFT JOIN pdfs_procesados p ON p.id = c.pdf_id
               ORDER BY c.id"""
        )
        return cur.fetchall()
