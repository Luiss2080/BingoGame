"""Worker de procesamiento de PDFs.

Consume la cola BullMQ `pdf-processing` (jobs encolados por la API NestJS)
y genera las imágenes de cartón con pdf_processor.py, escribiendo progreso
y cartones directamente en PostgreSQL. Corre en su propio contenedor: la
API nunca se bloquea por un PDF grande.
"""
import asyncio
import os
import signal
import traceback

from bullmq import Worker

import db
from pdf_processor import PDFProcessor

REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')
QUEUE_NAME = 'pdf-processing'
PROGRESO_CADA = 5  # páginas entre updates de progreso


def _crear_processor(banner_path, dpi):
    """bannerPath del job: 'default' → logo por defecto; None → sin banner; ruta → ese banner."""
    kwargs = {'dpi': dpi or 150, 'formato': 'jpeg'}
    if banner_path != 'default':
        kwargs['banner_path'] = banner_path
    return PDFProcessor(**kwargs)


def procesar_pdf_sync(data):
    pdf_id = data['pdfId']
    conn = db.get_conn()
    try:
        processor = _crear_processor(data.get('bannerPath', 'default'), data.get('dpi'))
        grupo_id = data.get('grupoId')
        vendedor_id = data.get('vendedorId')
        asignados = db.resolver_asignados(
            conn, grupo_id, data.get('usuariosIds') or [], vendedor_id
        )

        estado = {'insertados': 0, 'errores': 0, 'rr': 0, 'total': 0}

        def carton_cb(item):
            try:
                idx = estado['rr']
                assigned = asignados[idx % len(asignados)] if asignados else vendedor_id
                insertado = db.insertar_carton(
                    conn,
                    numero=item['numero'],
                    pdf_id=pdf_id,
                    pagina=item.get('pagina', item['indice'] + 1),
                    ruta=item['ruta'],
                    vendedor_id=assigned,
                    grupo_id=grupo_id,
                )
                if insertado:
                    estado['rr'] += 1
                    estado['insertados'] += 1
                else:
                    print(f"[WORKER] Duplicado omitido: {item['numero']} grupo={grupo_id}", flush=True)
            except Exception as e:
                print(f"[WORKER] ERROR carton {item.get('numero')}: {e}", flush=True)

        def error_cb(item):
            estado['errores'] += 1

        def progreso_cb(hechas, total):
            estado['total'] = total
            if hechas % PROGRESO_CADA == 0 or hechas == total:
                try:
                    db.actualizar_progreso(
                        conn, pdf_id, estado['insertados'], estado['errores'], total
                    )
                except Exception as e:
                    print(f'[WORKER] ERROR progreso: {e}', flush=True)

        print(f"[WORKER] Procesando PDF {pdf_id} grupo={grupo_id} "
              f"asignados={asignados} banner={data.get('bannerPath')}", flush=True)

        resultado = processor.procesar(
            data['pdfPath'], data['outputDir'],
            carton_cb=carton_cb, error_cb=error_cb, progreso_cb=progreso_cb,
        )

        errores = len(resultado['error'])
        estado_final = 'completado' if errores == 0 else 'completado_con_errores'
        db.finalizar_pdf(
            conn, pdf_id, estado_final,
            estado['insertados'], errores, resultado['total'],
        )
        print(f"[WORKER] PDF {pdf_id} listo: {estado['insertados']} cartones "
              f"de {resultado['total']} páginas, {errores} errores", flush=True)
        return {'insertados': estado['insertados'], 'errores': errores}
    except Exception as e:
        print(f'[WORKER] ERROR PDF {pdf_id}: {e}\n{traceback.format_exc()}', flush=True)
        try:
            db.marcar_error(conn, pdf_id, e)
        except Exception:
            pass
        raise
    finally:
        conn.close()


def regenerar_imagenes_sync():
    conn = db.get_conn()
    try:
        processor = PDFProcessor(dpi=150, formato='jpeg')
        filas = db.cartones_para_regenerar(conn)
        ok = err = 0
        print(f'[WORKER] regenerar_imagenes: {len(filas)} cartones', flush=True)
        for _id, numero, pagina, ruta_imagen, ruta_pdf in filas:
            try:
                if not ruta_imagen or not os.path.isfile(ruta_imagen):
                    err += 1
                    continue
                if ruta_pdf and os.path.isfile(ruta_pdf) and pagina:
                    processor.regenerar_desde_pdf(ruta_pdf, pagina, ruta_imagen, numero or '')
                else:
                    processor.superponer_numero_en_archivo(ruta_imagen, numero or '')
                ok += 1
                if ok % 20 == 0:
                    print(f'[WORKER] regenerar progreso: {ok}/{len(filas)}', flush=True)
            except Exception as e:
                err += 1
                print(f'[WORKER] regenerar ERROR carton {numero}: {e}', flush=True)
        print(f'[WORKER] regenerar LISTO: {ok} OK, {err} errores', flush=True)
        return {'ok': ok, 'errores': err}
    finally:
        conn.close()


async def procesar_job(job, token):
    # to_thread: el render es CPU-bound; el loop debe seguir libre para que
    # BullMQ renueve el lock del job (si no, el job se re-entregaría)
    if job.name == 'process-pdf':
        return await asyncio.to_thread(procesar_pdf_sync, job.data)
    if job.name == 'regenerate-images':
        return await asyncio.to_thread(regenerar_imagenes_sync)
    print(f'[WORKER] job desconocido: {job.name}', flush=True)
    return None


async def main():
    print(f'[WORKER] Iniciando. Cola={QUEUE_NAME} redis={REDIS_URL}', flush=True)
    worker = Worker(
        QUEUE_NAME, procesar_job,
        {'connection': REDIS_URL, 'concurrency': 1},
    )

    stop = asyncio.Event()

    def shutdown(*_):
        stop.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            asyncio.get_running_loop().add_signal_handler(sig, shutdown)
        except NotImplementedError:  # Windows
            signal.signal(sig, shutdown)

    await stop.wait()
    print('[WORKER] Apagando…', flush=True)
    await worker.close()


if __name__ == '__main__':
    asyncio.run(main())
