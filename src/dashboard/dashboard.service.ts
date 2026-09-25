import { Injectable } from '@nestjs/common'
import { DashboardCache, dashboardKeys } from './utils/dashboard.cache'
import type {
  DashboardDays,
  TrendGranularity
} from './utils/dashboard.constants'
import { DashboardRepository } from './dashboard.repository'
import { windowStart } from './utils/dashboard.time'
import { buildBucketKeys, fillTrend } from './utils/dashboard.utils'
import type {
  CatalogHealthDto,
  ConsultationsTrendDto,
  DashboardSummaryDto
} from './dto/dashboard-responses.dto'

// Orquesta caché + repositorio. Cada método es "lee de caché o calcula": la
// invalidación ocurre por eventos (tarea 5) y la ventana relativa se acota con el TTL.
@Injectable()
export class DashboardService {
  constructor(
    private readonly repo: DashboardRepository,
    private readonly cache: DashboardCache
  ) {}

  getSummary(days: DashboardDays): Promise<DashboardSummaryDto> {
    return this.cache.getOrCompute(dashboardKeys.summary(days), async () => {
      const { from } = windowStart(days)
      const [herbs, families, total, inRange] = await Promise.all([
        this.repo.countHerbs(),
        this.repo.countFamilies(),
        this.repo.countChats(),
        this.repo.countChatsSince(from)
      ])
      return { herbs, families, consultations: { total, inRange } }
    })
  }

  getConsultationsTrend(
    days: DashboardDays,
    granularity: TrendGranularity
  ): Promise<ConsultationsTrendDto> {
    return this.cache.getOrCompute(
      dashboardKeys.trend(days, granularity),
      async () => {
        const { startDate, endDate, from } = windowStart(days)
        const rows = await this.repo.consultationsTrend(from, granularity)
        return fillTrend(rows, buildBucketKeys(startDate, endDate, granularity))
      }
    )
  }

  getCatalogHealth(): Promise<CatalogHealthDto> {
    return this.cache.getOrCompute(dashboardKeys.health(), async () => {
      const health = await this.repo.catalogHealth()
      return {
        herbsWithoutSymptoms: health.herbsWithoutSymptoms,
        symptomsWithoutHerbs: health.symptomsWithoutHerbs,
        samples: { herbs: health.herbSamples, symptoms: health.symptomSamples }
      }
    })
  }
}
