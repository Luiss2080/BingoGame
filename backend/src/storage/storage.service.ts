import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Rutas de archivos dentro del volumen de datos (DATA_DIR, /data en Docker).
 * La API guarda PDFs y banners; el worker escribe las imágenes de cartón.
 */
@Injectable()
export class StorageService {
  readonly dataDir: string;
  readonly uploadsDir: string;
  readonly chunksDir: string;
  readonly imagenesDir: string;
  readonly bannersDir: string;

  constructor(config: ConfigService) {
    this.dataDir = resolve(config.get<string>('DATA_DIR', './data'));
    this.uploadsDir = join(this.dataDir, 'uploads');
    this.chunksDir = join(this.dataDir, 'uploads', 'chunks');
    this.imagenesDir = join(this.dataDir, 'imagenes');
    this.bannersDir = join(this.dataDir, 'banners');
    for (const dir of [
      this.uploadsDir,
      this.chunksDir,
      this.imagenesDir,
      this.bannersDir,
    ]) {
      mkdirSync(dir, { recursive: true });
    }
  }

  carpetaImagenesPdf(pdfId: number): string {
    return join(this.imagenesDir, `pdf_${pdfId}`);
  }
}
