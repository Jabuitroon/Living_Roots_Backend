import 'reflect-metadata'
import { DashboardCache, type CacheStore } from './dashboard.cache'
import { DashboardRepository } from './dashboard.repository'
import { DashboardService } from './dashboard.service'
import { windowStart } from './dashboard.time'

class FakeStore implements CacheStore {
  readonly data = new Map<string, unknown>()
  async get<T>(key: string) {
    return this.data.get(key) as T | undefined
  }
  async set(key: string, value: unknown) {
    this.data.set(key, value)
    return value
  }
  async del(key: string) {
    this.data.delete(key)
    return true
  }
}

const NOW = new Date('2026-09-24T01:00:00Z')

describe('DashboardService', () => {
  let repo: jest.Mocked<
    Pick<
      DashboardRepository,
      | 'countHerbs'
      | 'countFamilies'
      | 'countChats'
      | 'countChatsSince'
      | 'consultationsTrend'
      | 'catalogHealth'
    >
  >
  let cache: DashboardCache
  let service: DashboardService

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW })
    repo = {
      countHerbs: jest.fn().mockResolvedValue(12),
      countFamilies: jest.fn().mockResolvedValue(4),
      countChats: jest.fn().mockResolvedValue(250),
      countChatsSince: jest.fn().mockResolvedValue(30),
      consultationsTrend: jest.fn().mockResolvedValue([]),
      catalogHealth: jest.fn().mockResolvedValue({
        herbsWithoutSymptoms: 2,
        symptomsWithoutHerbs: 1,
        herbSamples: [{ id: 'h1', name: 'Sola' }],
        symptomSamples: [{ id: 's1', name: 'Tos' }]
      })
    }
    cache = new DashboardCache(new FakeStore())
    service = new DashboardService(
      repo as unknown as DashboardRepository,
      cache
    )
  })

  afterEach(() => jest.useRealTimers())

  describe('getSummary', () => {
    it('arma el resumen y usa el inicio de ventana del período pedido', async () => {
      expect(await service.getSummary(7)).toEqual({
        herbs: 12,
        families: 4,
        consultations: { total: 250, inRange: 30 }
      })
      expect(repo.countChatsSince).toHaveBeenCalledWith(windowStart(7).from)
    })

    it('con datos vacíos devuelve ceros, sin errores (E2)', async () => {
      repo.countHerbs.mockResolvedValue(0)
      repo.countFamilies.mockResolvedValue(0)
      repo.countChats.mockResolvedValue(0)
      repo.countChatsSince.mockResolvedValue(0)

      expect(await service.getSummary(30)).toEqual({
        herbs: 0,
        families: 0,
        consultations: { total: 0, inRange: 0 }
      })
    })

    it('la segunda lectura sale de caché', async () => {
      await service.getSummary(30)
      await service.getSummary(30)
      expect(repo.countHerbs).toHaveBeenCalledTimes(1)
    })

    it('cada período tiene su propia entrada de caché', async () => {
      await service.getSummary(7)
      await service.getSummary(30)
      expect(repo.countHerbs).toHaveBeenCalledTimes(2)
    })

    it("tras invalidar 'chats' recalcula y refleja el cambio (E3)", async () => {
      await service.getSummary(30)
      repo.countChats.mockResolvedValue(251)

      await cache.invalidate('chats')

      const fresh = await service.getSummary(30)
      expect(fresh.consultations.total).toBe(251)
    })

    it('no cachea los errores', async () => {
      repo.countHerbs.mockRejectedValueOnce(new Error('BD caída'))
      await expect(service.getSummary(30)).rejects.toThrow('BD caída')

      expect((await service.getSummary(30)).herbs).toBe(12)
    })
  })

  describe('getConsultationsTrend', () => {
    it('sin datos devuelve un punto en cero por cada día del período (E2)', async () => {
      const trend = await service.getConsultationsTrend(7, 'day')
      const { startDate, endDate } = windowStart(7)

      expect(trend).toHaveLength(7)
      expect(trend[0]).toEqual({ bucket: startDate, count: 0 })
      expect(trend[6]).toEqual({ bucket: endDate, count: 0 })
      expect(trend.every((p) => p.count === 0)).toBe(true)
    })

    it('conserva los conteos del repositorio y rellena los demás días', async () => {
      const { endDate } = windowStart(7)
      repo.consultationsTrend.mockResolvedValue([{ bucket: endDate, count: 5 }])

      const trend = await service.getConsultationsTrend(7, 'day')

      expect(trend.find((p) => p.bucket === endDate)?.count).toBe(5)
      expect(trend.filter((p) => p.count === 0)).toHaveLength(6)
      expect(repo.consultationsTrend).toHaveBeenCalledWith(
        windowStart(7).from,
        'day'
      )
    })

    it('con granularidad semanal devuelve buckets semanales', async () => {
      const trend = await service.getConsultationsTrend(30, 'week')
      // 30 días abarcan 5 o 6 semanas ISO (la primera puede ser parcial)
      expect(trend.length).toBeGreaterThanOrEqual(5)
      expect(trend.length).toBeLessThanOrEqual(6)
      expect(repo.consultationsTrend).toHaveBeenCalledWith(
        windowStart(30).from,
        'week'
      )
    })

    it('cachea por período y granularidad', async () => {
      await service.getConsultationsTrend(7, 'day')
      await service.getConsultationsTrend(7, 'day')
      await service.getConsultationsTrend(7, 'week')
      expect(repo.consultationsTrend).toHaveBeenCalledTimes(2)
    })
  })

  describe('getCatalogHealth', () => {
    it('mapea el snapshot al DTO de respuesta', async () => {
      expect(await service.getCatalogHealth()).toEqual({
        herbsWithoutSymptoms: 2,
        symptomsWithoutHerbs: 1,
        samples: {
          herbs: [{ id: 'h1', name: 'Sola' }],
          symptoms: [{ id: 's1', name: 'Tos' }]
        }
      })
    })

    it('la segunda lectura sale de caché y se recalcula al invalidar el catálogo', async () => {
      await service.getCatalogHealth()
      await service.getCatalogHealth()
      expect(repo.catalogHealth).toHaveBeenCalledTimes(1)

      await cache.invalidate('catalog')
      await service.getCatalogHealth()
      expect(repo.catalogHealth).toHaveBeenCalledTimes(2)
    })
  })
})
