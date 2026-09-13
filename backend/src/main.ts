import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  // En producción nginx sirve frontend y API bajo el mismo dominio;
  // CORS solo hace falta para el dev server de Vite.
  app.enableCors({ origin: true });
  app.use(json({ limit: '5mb' }));
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}
bootstrap();
