import { Inject, Injectable } from '@nestjs/common'
import {
  DASHBOARD_DAYS,
  type DashboardDays,
  type TrendGranularity
} from './dashboard.constants'

/**
 * Token de inyección del store de caché: el mismo valor que exporta
 * `CACHE_MANAGER` en @nestjs/cache-manager. Se declara aquí a propósito para NO
 * importar ese paquete: desde la v12 es ESM-only y Jest (CommonJS) no puede
 * cargarlo. `CacheModule` sigue proveyendo el store bajo este token.
 */
export const CACHE_MANAGER_TOKEN = 'CACHE_MANAGER'

/**
 * Subconjunto de `Cache` (cache-manager) que necesitamos. Se define aquí para no
 * acoplarse a la versión: el `Cache` de @nestjs/cache-manager lo satisface.
 */
export interface CacheStore {
  get<T>(key: string): Promise<T | undefined | null>
  set(key: string, value: unknown, ttl?: number): Promise<unknown>
  del(key: string): Promise<unknown>
}

/**
 * TTL de seguridad. La invalidación por eventos es el mecanismo principal (E3);
 * el TTL solo acota la vida de entradas que dependen del día actual.
 * En cache-manager v6+ el TTL va en MILISEGUNDOS (en v4 iba en segundos).
 */
export const DASHBOARD_CACHE_TTL_MS = 10 * 60 * 1000

const GRANULARITIES: TrendGranularity[] = ['day', 'week']

export const dashboardKeys = {
  summary: (days: DashboardDays) => `dashboard:summary:${days}`,
  trend: (days: DashboardDays, granularity: TrendGranularity) =>
    `dashboard:trend:${days}:${granularity}`,
  testimonials: (days: DashboardDays) => `dashboard:testimonials:${days}`,
  health: () => 'dashboard:health'
} as const

const summaryKeys = () => DASHBOARD_DAYS.map(dashboardKeys.summary)
const testimonialKeys = () => DASHBOARD_DAYS.map(dashboardKeys.testimonials)
const trendKeys = () =>
  DASHBOARD_DAYS.flatMap((d) =>
    GRANULARITIES.map((g) => dashboardKeys.trend(d, g))
  )

/** Qué cambió en el sistema; cada alcance sabe qué claves invalida. */
export type CacheScope = 'herbs' | 'chats' | 'stories' | 'catalog' | 'insights'

const SCOPE_KEYS: Record<CacheScope, () => string[]> = {
  // Cambian totales, familias, salud y los nombres mostrados en testimonios.
  herbs: () => [...summaryKeys(), dashboardKeys.health(), ...testimonialKeys()],
  chats: () => [...summaryKeys(), ...trendKeys()],
  stories: () => testimonialKeys(),
  // Síntomas y relaciones herb–symptom.
  catalog: () => [dashboardKeys.health(), ...testimonialKeys()],
  insights: () => testimonialKeys()
}

/**
 * Caché en memoria del dashboard (táctica: Maintain multiple copies of data).
 *
 * - `getOrCompute`: lee de caché o calcula; peticiones concurrentes en frío
 *   comparten un único cálculo (single-flight).
 * - `invalidate`: borra las claves de un alcance y descarta cálculos en vuelo,
 *   para que un resultado calculado con datos previos no reviva la entrada.
 *
 * Los valores cacheados deben ser DTOs planos (JSON-safe: fechas como string).
 * Válido para una sola instancia del backend; con varias, cambiar el store a Redis.
 */
@Injectable()
export class DashboardCache {
  private readonly inFlight = new Map<string, Promise<unknown>>()
  private readonly generations = new Map<string, number>()

  constructor(
    @Inject(CACHE_MANAGER_TOKEN) private readonly store: CacheStore
  ) {}

  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttlMs: number = DASHBOARD_CACHE_TTL_MS
  ): Promise<T> {
    const hit = await this.store.get<T>(key)
    if (hit !== undefined && hit !== null) return hit

    const pending = this.inFlight.get(key)
    if (pending) return pending as Promise<T>

    const generation = this.generationOf(key)
    const promise: Promise<T> = (async () => {
      const value = await compute()
      // Si hubo una invalidación mientras se calculaba, no se cachea el resultado.
      if (this.generationOf(key) === generation) {
        await this.store.set(key, value, ttlMs)
      }
      return value
    })().finally(() => {
      if (this.inFlight.get(key) === promise) this.inFlight.delete(key)
    })

    this.inFlight.set(key, promise)
    return promise
  }

  async invalidate(scope: CacheScope): Promise<void> {
    await this.invalidateKeys(SCOPE_KEYS[scope]())
  }

  async invalidateAll(): Promise<void> {
    await this.invalidateKeys(this.allKeys())
  }

  /** Todas las claves conocidas del dashboard. */
  allKeys(): string[] {
    return [...new Set(Object.values(SCOPE_KEYS).flatMap((keysOf) => keysOf()))]
  }

  private async invalidateKeys(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.generations.set(key, this.generationOf(key) + 1)
      this.inFlight.delete(key)
    }
    await Promise.all(keys.map((key) => this.store.del(key)))
  }

  private generationOf(key: string): number {
    return this.generations.get(key) ?? 0
  }
}
