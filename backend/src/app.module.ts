import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BannersModule } from './banners/banners.module';
import { SeedService } from './bootstrap/seed.service';
import { CartonesModule } from './cartones/cartones.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GruposModule } from './grupos/grupos.module';
import { HealthController } from './health.controller';
import { PdfsModule } from './pdfs/pdfs.module';
import { PermisosModule } from './permisos/permisos.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    PrismaModule,
    StorageModule,
    PermisosModule,
    AuthModule,
    UsersModule,
    GruposModule,
    BannersModule,
    CartonesModule,
    DashboardModule,
    QueueModule,
    PdfsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [SeedService],
})
export class AppModule {}
