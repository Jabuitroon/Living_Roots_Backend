import { Module } from '@nestjs/common'
import { CacheModule } from '@nestjs/cache-manager'
import { DashboardCache } from './utils/dashboard.cache'
import { DashboardController } from './dashboard.controller'
import { DashboardRepository } from './dashboard.repository'
import { DashboardService } from './dashboard.service'
import { PrismaModule } from '@app/prisma/prisma.module'

@Module({
  imports: [
    // Store en memoria (una sola instancia del backend). El TTL lo fija DashboardCache.
    CacheModule.register(),
    PrismaModule
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepository, DashboardCache],
  // La tarea 5 invalida la caché con eventos; se exporta por si otro módulo necesita invalidar directo.
  exports: [DashboardCache]
})
export class DashboardModule {}
