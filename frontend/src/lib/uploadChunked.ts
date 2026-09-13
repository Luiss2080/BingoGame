import { api } from '../api/client';

const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB, igual que la app Android
const REINTENTOS = 3;

export interface OpcionesFinalizar {
  banner_id: number | null; // null = banner default, 0 = sin banner
  grupo_id?: number | null;
  usuarios_ids?: number[];
}

/**
 * Subida por chunks con reintentos (conexiones móviles inestables) y
 * finalización que encola el procesamiento. Devuelve el pdf_id.
 */
export async function subirPdfPorChunks(
  archivo: File,
  opciones: OpcionesFinalizar,
  onProgreso: (fraccion: number) => void,
): Promise<number> {
  const uploadId = crypto.randomUUID();
  const totalChunks = Math.max(1, Math.ceil(archivo.size / CHUNK_SIZE));

  for (let i = 0; i < totalChunks; i++) {
    const parte = archivo.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const form = new FormData();
    form.append('chunk', parte, `chunk_${i}`);
    form.append('upload_id', uploadId);
    form.append('chunk_index', String(i));
    form.append('total_chunks', String(totalChunks));
    form.append('nombre', archivo.name);

    let ultimoError: unknown;
    let subido = false;
    for (let intento = 0; intento < REINTENTOS && !subido; intento++) {
      try {
        await api.post('/pdf-parte', form);
        subido = true;
      } catch (e) {
        ultimoError = e;
        await new Promise((r) => setTimeout(r, 1000 * (intento + 1)));
      }
    }
    if (!subido) throw ultimoError;
    onProgreso((i + 1) / totalChunks);
  }

  const res = await api.post('/pdf-completar', {
    upload_id: uploadId,
    banner_id: opciones.banner_id,
    grupo_id: opciones.grupo_id ?? null,
    usuarios_ids: opciones.usuarios_ids ?? [],
  });
  return res.data.pdf_id as number;
}
