import { addDays } from './dashboard.time'
import type { TrendGranularity } from './dashboard.constants'

const N_TILDE_PLACEHOLDER = '\uE000'

// Normaliza un nombre de familia cultivadora para poder contarlas como distintas:
// recorta y colapsa espacios, pasa a minúsculas y quita tildes.
// Conserva la ñ (cañas ≠ canas). Devuelve null si queda vacío.
export function normalizeFamily(raw: string | null | undefined): string | null {
  if (!raw) return null
  const normalized = raw
    .normalize('NFC')
    .toLowerCase()
    .replace(/ñ/g, N_TILDE_PLACEHOLDER)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(new RegExp(N_TILDE_PLACEHOLDER, 'g'), 'ñ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized.length > 0 ? normalized : null
}

export function countDistinctFamilies(
  values: Array<string | null | undefined>
): number {
  const distinct = new Set<string>()
  for (const value of values) {
    const key = normalizeFamily(value)
    if (key) distinct.add(key)
  }
  return distinct.size
}

export interface TrendPoint {
  // 'YYYY-MM-DD' del día (o del lunes de la semana) en la zona del dashboard.
  bucket: string
  count: number
}

// Lunes (semana ISO) de la fecha 'YYYY-MM-DD'; coincide con date_trunc('week') de PostgreSQL.
export function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = domingo
  return addDays(dateStr, -((dayOfWeek + 6) % 7))
}

// Todas las claves de bucket entre `startDate` y `endDate` (incluidas).
export function buildBucketKeys(
  startDate: string,
  endDate: string,
  granularity: TrendGranularity
): string[] {
  const keys: string[] = []
  if (granularity === 'day') {
    for (let d = startDate; d <= endDate; d = addDays(d, 1)) keys.push(d)
  } else {
    for (let d = mondayOf(startDate); d <= endDate; d = addDays(d, 7)) {
      keys.push(d)
    }
  }
  return keys
}

// Rellena con 0 los buckets sin datos (HU-11, E2) y descarta los fuera de rango.
export function fillTrend(rows: TrendPoint[], keys: string[]): TrendPoint[] {
  const byBucket = new Map(rows.map((r) => [r.bucket, r.count]))
  return keys.map((bucket) => ({ bucket, count: byBucket.get(bucket) ?? 0 }))
}
