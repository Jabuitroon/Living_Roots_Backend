import { Type } from 'class-transformer'
import { IsIn } from 'class-validator'
import {
  DASHBOARD_DAYS,
  DEFAULT_DAYS,
  TREND_GRANULARITIES,
  type DashboardDays,
  type TrendGranularity
} from '../utils/dashboard.constants'

// Query común de los módulos con ventana temporal.
export class DashboardQueryDto {
  @Type(() => Number)
  @IsIn(DASHBOARD_DAYS, {
    message: `days debe ser uno de: ${DASHBOARD_DAYS.join(', ')}`
  })
  days: DashboardDays = DEFAULT_DAYS
}

export class ConsultationsTrendQueryDto extends DashboardQueryDto {
  @IsIn(TREND_GRANULARITIES, {
    message: `granularity debe ser uno de: ${TREND_GRANULARITIES.join(', ')}`
  })
  granularity: TrendGranularity = 'day'
}
