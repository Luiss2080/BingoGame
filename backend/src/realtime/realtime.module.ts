import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { LocksService } from './locks.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule], // Necesario si vamos a verificar tokens
  providers: [RealtimeGateway, LocksService],
  exports: [RealtimeGateway, LocksService],
})
export class RealtimeModule {}
