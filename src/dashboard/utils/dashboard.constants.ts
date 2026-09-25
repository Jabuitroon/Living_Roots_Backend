/** Períodos permitidos por el selector del dashboard (HU-11, E4). */
export const DASHBOARD_DAYS = [7, 30, 90] as const
export type DashboardDays = (typeof DASHBOARD_DAYS)[number]
export const DEFAULT_DAYS: DashboardDays = 30

export const TREND_GRANULARITIES = ['day', 'week'] as const
export type TrendGranularity = (typeof TREND_GRANULARITIES)[number]

/**
 * Zona horaria para agrupar por día/semana. Configurable por entorno; si más
 * adelante usas ConfigService, inyéctala en el repositorio en lugar de leer env aquí.
 */
export const DASHBOARD_TIMEZONE =
  process.env.DASHBOARD_TIMEZONE ?? 'America/Bogota'

export const DEFAULT_TOP_LIMIT = 5
export const DEFAULT_SAMPLE_SIZE = 5
