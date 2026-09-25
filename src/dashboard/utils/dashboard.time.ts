import { DASHBOARD_TIMEZONE } from './dashboard.constants'

/** Desfase (ms) de `tz` respecto a UTC en el instante dado (negativo al oeste de UTC). */
export function tzOffsetMs(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(instant)
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value)
  const wallAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second')
  )
  const instantSeconds = Math.floor(instant.getTime() / 1000) * 1000
  return wallAsUtc - instantSeconds
}

/** 'YYYY-MM-DD' del instante visto en `tz`. */
export function localDateString(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(instant)
}

/** Suma `n` días (puede ser negativo) a una fecha 'YYYY-MM-DD'. */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Instante UTC en que empieza el día local `dateStr` en `tz` (maneja DST). */
export function zonedMidnightToUtc(dateStr: string, tz: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const wallAsUtc = Date.UTC(y, m - 1, d)
  const firstGuess = wallAsUtc - tzOffsetMs(new Date(wallAsUtc), tz)
  return new Date(wallAsUtc - tzOffsetMs(new Date(firstGuess), tz))
}

export interface DashboardWindow {
  /** Primer día local incluido, 'YYYY-MM-DD'. */
  startDate: string
  /** Día local de hoy, 'YYYY-MM-DD'. */
  endDate: string
  /** Instante UTC de inicio de la ventana (para filtrar columnas timestamp). */
  from: Date
}

/**
 * Ventana de "últimos N días" alineada a días locales: incluye hoy y los N-1
 * anteriores, de modo que la gráfica tenga exactamente N buckets diarios.
 */
export function windowStart(
  days: number,
  now: Date = new Date(),
  tz: string = DASHBOARD_TIMEZONE
): DashboardWindow {
  const endDate = localDateString(now, tz)
  const startDate = addDays(endDate, -(days - 1))
  return { startDate, endDate, from: zonedMidnightToUtc(startDate, tz) }
}
