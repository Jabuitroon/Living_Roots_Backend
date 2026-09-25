import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe
} from '@nestjs/common'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '@app/auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '../auth/enums'
import { DashboardService } from './dashboard.service'
import {
  ConsultationsTrendQueryDto,
  DashboardQueryDto
} from './dto/dashboard-query.dto'
import type {
  CatalogHealthDto,
  ConsultationsTrendDto,
  DashboardSummaryDto
} from './dto/dashboard-responses.dto'

// Valida y convierte la query (days llega como string) sin depender del pipe global.
const queryPipe = new ValidationPipe({ transform: true, whitelist: true })

// Endpoints del dashboard solo administrador.
@Controller('admin/dashboard')
@UseGuards(AuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @Roles(Role.Admin)
  getSummary(
    @Query(queryPipe) query: DashboardQueryDto
  ): Promise<DashboardSummaryDto> {
    return this.dashboard.getSummary(query.days)
  }

  @Get('consultations-trend')
  @Roles(Role.Admin)
  getConsultationsTrend(
    @Query(queryPipe) query: ConsultationsTrendQueryDto
  ): Promise<ConsultationsTrendDto> {
    return this.dashboard.getConsultationsTrend(query.days, query.granularity)
  }

  @Get('catalog-health')
  @Roles(Role.Admin)
  getCatalogHealth(): Promise<CatalogHealthDto> {
    return this.dashboard.getCatalogHealth()
  }
}
