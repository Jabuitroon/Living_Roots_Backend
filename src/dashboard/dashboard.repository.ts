import { Injectable } from '@nestjs/common'
// AJUSTAR: rutas reales de tu PrismaService y del cliente generado por Prisma.
import type { Prisma } from '../generated/prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import {
  DASHBOARD_TIMEZONE,
  DEFAULT_SAMPLE_SIZE,
  DEFAULT_TOP_LIMIT,
  type TrendGranularity
} from './utils/dashboard.constants'
import { CONSULTATIONS_TREND_SQL } from './insights/dashboard.sql'
import { countDistinctFamilies, type TrendPoint } from './utils/dashboard.utils'
import { TESTIMONIAL_STORY_WHERE } from './insights/testimonial.constants'

export interface RankedItem {
  id: string
  name: string
  /** Número de testimonios que mencionan el síntoma/planta en el período. */
  count: number
}

export interface TestimonialInsights {
  symptoms: RankedItem[]
  herbs: RankedItem[]
  /** Último procesamiento de testimonios elegibles (null si nunca se procesó). */
  lastProcessedAt: Date | null
}

export interface CatalogHealthSnapshot {
  herbsWithoutSymptoms: number
  symptomsWithoutHerbs: number
  herbSamples: Array<{ id: string; name: string }>
  symptomSamples: Array<{ id: string; name: string }>
}

/**
 * Consultas agregadas del dashboard. Solo lee la BD: sin caché ni reglas de
 * presentación (eso vive en DashboardService / DashboardCache).
 */
@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Contadores ────────────────────────────────────────────

  countHerbs(): Promise<number> {
    return this.prisma.herb.count()
  }

  /** Familias cultivadoras distintas (campo string libre, normalizado en JS). */
  async countFamilies(): Promise<number> {
    const groups = await this.prisma.herb.groupBy({ by: ['cultivator'] })
    return countDistinctFamilies(groups.map((g) => g.cultivator))
  }

  countChats(): Promise<number> {
    return this.prisma.chat.count()
  }

  countChatsSince(from: Date): Promise<number> {
    return this.prisma.chat.count({ where: { createdAt: { gte: from } } })
  }

  // ── Serie de consultas ────────────────────────────────────

  /**
   * Chats guardados por bucket desde `from`. Devuelve solo buckets con datos;
   * el relleno de ceros lo hace `fillTrend` en el servicio.
   */
  async consultationsTrend(
    from: Date,
    granularity: TrendGranularity,
    tz: string = DASHBOARD_TIMEZONE
  ): Promise<TrendPoint[]> {
    if (granularity !== 'day' && granularity !== 'week') {
      throw new Error(`Granularidad no soportada: ${String(granularity)}`)
    }
    return this.prisma.$queryRawUnsafe<TrendPoint[]>(
      CONSULTATIONS_TREND_SQL,
      granularity,
      tz,
      from.toISOString()
    )
  }

  // ── Testimonios (InsightMention) ──────────────────────────

  async testimonialInsights(
    from: Date,
    limit: number = DEFAULT_TOP_LIMIT
  ): Promise<TestimonialInsights> {
    // Tipados a propósito: si algo no encaja con Prisma (p. ej. la constante de
    // testimonios), el error aparece UNA vez, en esta línea, y no como errores confusos
    // sobre `_count` o `_max` en el resultado de groupBy/aggregate.
    const testimonialStory: Prisma.StoryWhereInput = TESTIMONIAL_STORY_WHERE
    const symptomWhere: Prisma.InsightMentionWhereInput = {
      occurredAt: { gte: from },
      story: testimonialStory,
      symptomId: { not: null }
    }
    const herbWhere: Prisma.InsightMentionWhereInput = {
      occurredAt: { gte: from },
      story: testimonialStory,
      herbId: { not: null }
    }

    const [symptomGroups, herbGroups, processed] = await Promise.all([
      this.prisma.insightMention.groupBy({
        by: ['symptomId'],
        where: symptomWhere,
        _count: { _all: true },
        orderBy: [{ _count: { symptomId: 'desc' } }, { symptomId: 'asc' }],
        take: limit
      }),
      this.prisma.insightMention.groupBy({
        by: ['herbId'],
        where: herbWhere,
        _count: { _all: true },
        orderBy: [{ _count: { herbId: 'desc' } }, { herbId: 'asc' }],
        take: limit
      }),
      this.prisma.story.aggregate({
        where: testimonialStory,
        _max: { insightsProcessedAt: true }
      })
    ])

    const symptomIds = symptomGroups
      .map((g) => g.symptomId)
      .filter((id): id is string => id !== null)
    const herbIds = herbGroups
      .map((g) => g.herbId)
      .filter((id): id is string => id !== null)

    const [symptomNames, herbNames] = await Promise.all([
      this.prisma.symptom.findMany({
        where: { symptom_id: { in: symptomIds } },
        select: { symptom_id: true, name: true }
      }),
      this.prisma.herb.findMany({
        where: { herb_id: { in: herbIds } },
        select: { herb_id: true, name: true }
      })
    ])

    return {
      symptoms: this.toRanked(
        symptomGroups.map((g) => ({ id: g.symptomId, count: g._count._all })),
        new Map(symptomNames.map((s) => [s.symptom_id, s.name]))
      ),
      herbs: this.toRanked(
        herbGroups.map((g) => ({ id: g.herbId, count: g._count._all })),
        new Map(herbNames.map((h) => [h.herb_id, h.name]))
      ),
      lastProcessedAt: processed._max.insightsProcessedAt
    }
  }

  private toRanked(
    groups: Array<{ id: string | null; count: number }>,
    names: Map<string, string>
  ): RankedItem[] {
    const ranked: RankedItem[] = []
    for (const { id, count } of groups) {
      const name = id ? names.get(id) : undefined
      if (id && name) ranked.push({ id, name, count }) // conserva el orden del ranking
    }
    return ranked
  }

  // ── Salud del catálogo ────────────────────────────────────

  async catalogHealth(
    sampleSize: number = DEFAULT_SAMPLE_SIZE
  ): Promise<CatalogHealthSnapshot> {
    const herbsWithout = { symptoms: { none: {} } }
    const symptomsWithout = { herbs: { none: {} } }

    const [herbCount, symptomCount, herbSamples, symptomSamples] =
      await Promise.all([
        this.prisma.herb.count({ where: herbsWithout }),
        this.prisma.symptom.count({ where: symptomsWithout }),
        this.prisma.herb.findMany({
          where: herbsWithout,
          select: { herb_id: true, name: true },
          orderBy: { createdAt: 'desc' },
          take: sampleSize
        }),
        this.prisma.symptom.findMany({
          where: symptomsWithout,
          select: { symptom_id: true, name: true },
          orderBy: { name: 'asc' },
          take: sampleSize
        })
      ])

    return {
      herbsWithoutSymptoms: herbCount,
      symptomsWithoutHerbs: symptomCount,
      herbSamples: herbSamples.map((h) => ({ id: h.herb_id, name: h.name })),
      symptomSamples: symptomSamples.map((s) => ({
        id: s.symptom_id,
        name: s.name
      }))
    }
  }
}
