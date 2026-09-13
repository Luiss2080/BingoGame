-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('admin', 'vendedor');

-- CreateEnum
CREATE TYPE "EstadoCarton" AS ENUM ('disponible', 'vendido', 'reservado');

-- CreateEnum
CREATE TYPE "EstadoPdf" AS ENUM ('pendiente', 'procesando', 'completado', 'completado_con_errores', 'error');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(80) NOT NULL,
    "password_hash" VARCHAR(256) NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'vendedor',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "grupo_id" INTEGER,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cartones" (
    "id" SERIAL NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "pdf_id" INTEGER NOT NULL,
    "pagina_origen" INTEGER NOT NULL,
    "ruta_imagen" VARCHAR(500) NOT NULL,
    "vendedor_id" INTEGER,
    "grupo_id" INTEGER,
    "estado" "EstadoCarton" NOT NULL DEFAULT 'disponible',
    "comprador" VARCHAR(200),
    "telefono_comprador" VARCHAR(50),
    "fecha_venta" TIMESTAMP(3),
    "precio" DECIMAL(10,2),
    "notas" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cartones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdfs_procesados" (
    "id" SERIAL NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "ruta_archivo" VARCHAR(500) NOT NULL,
    "fecha_procesado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_paginas" INTEGER NOT NULL DEFAULT 0,
    "paginas_ok" INTEGER NOT NULL DEFAULT 0,
    "paginas_error" INTEGER NOT NULL DEFAULT 0,
    "carpeta_imagenes" VARCHAR(500),
    "dpi" INTEGER NOT NULL DEFAULT 150,
    "estado" "EstadoPdf" NOT NULL DEFAULT 'pendiente',
    "mensaje_error" TEXT,
    "subido_por" INTEGER,

    CONSTRAINT "pdfs_procesados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "ruta_imagen" VARCHAR(500) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos_rol" (
    "id" SERIAL NOT NULL,
    "rol" VARCHAR(20) NOT NULL,
    "permiso" VARCHAR(50) NOT NULL,
    "habilitado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "permisos_rol_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_grupo_id_idx" ON "users"("grupo_id");

-- CreateIndex
CREATE UNIQUE INDEX "grupos_nombre_key" ON "grupos"("nombre");

-- CreateIndex
CREATE INDEX "cartones_numero_idx" ON "cartones"("numero");

-- CreateIndex
CREATE INDEX "cartones_estado_idx" ON "cartones"("estado");

-- CreateIndex
CREATE INDEX "cartones_vendedor_id_idx" ON "cartones"("vendedor_id");

-- CreateIndex
CREATE INDEX "cartones_grupo_id_idx" ON "cartones"("grupo_id");

-- CreateIndex
CREATE INDEX "cartones_numero_estado_idx" ON "cartones"("numero", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "cartones_numero_grupo_id_key" ON "cartones"("numero", "grupo_id");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_rol_rol_permiso_key" ON "permisos_rol"("rol", "permiso");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartones" ADD CONSTRAINT "cartones_pdf_id_fkey" FOREIGN KEY ("pdf_id") REFERENCES "pdfs_procesados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartones" ADD CONSTRAINT "cartones_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartones" ADD CONSTRAINT "cartones_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdfs_procesados" ADD CONSTRAINT "pdfs_procesados_subido_por_fkey" FOREIGN KEY ("subido_por") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Duplicados de numero sin grupo: unicidad por (numero, pdf_id) cuando grupo_id es NULL
-- (en Postgres NULL != NULL, así que el unique compuesto no cubre este caso)
CREATE UNIQUE INDEX "uq_carton_numero_pdf_sin_grupo" ON "cartones" ("numero", "pdf_id") WHERE "grupo_id" IS NULL;
