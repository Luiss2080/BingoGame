/**
 * Contrato de los jobs de la cola BullMQ `pdf-processing`.
 * El worker Python (worker/worker.py) consume estos payloads: si cambias
 * algo aquí, actualiza el worker en el mismo commit.
 */
export const PDF_QUEUE = 'pdf-processing';

export interface ProcessPdfJob {
  pdfId: number;
  /** Ruta absoluta del PDF dentro del volumen /data */
  pdfPath: string;
  /** Carpeta de salida de las imágenes, p. ej. /data/imagenes/pdf_12 */
  outputDir: string;
  /** null = sin banner (PDF original) · 'default' = logo por defecto · ruta = banner subido */
  bannerPath: string | null | 'default';
  grupoId: number | null;
  /** Round-robin de vendedor_id entre estos usuarios (vacío → usar vendedorId) */
  usuariosIds: number[];
  vendedorId: number | null;
  dpi: number;
}

export interface RegenerateImagesJob {
  /** Reservado para filtros futuros; hoy regenera todo */
  pdfId?: number;
}

export type PdfJobName = 'process-pdf' | 'regenerate-images';
