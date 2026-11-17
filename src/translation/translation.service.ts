import { HttpService } from '@nestjs/axios'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import type { Prisma, UserLanguage } from '../generated/prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export interface TranslationChunkRef {
  herb_id: string
  source_type: 'HERB_PROFILE' | 'HERB_SYMPTOM'
  source_id: string
}

interface TranslationSegment {
  es: string
  nsy: string | null
  tier: 1 | 2 | 3
  status: 'traducido' | 'conservado_en_español' | 'no_verificada'
  source: {
    kind: 'glossary_entry' | 'term' | 'rule' | 'none'
    id: string | null
  }
  evidence?: Prisma.JsonValue
}

export interface TranslationResult {
  text_nsy: string
  text_es: string
  segments: TranslationSegment[]
  coverage: { t1: number; t2: number; t3: number }
  glossary_version: string
  took_ms: number
  removed_unknown_tokens?: number
  removed_unknown_token_spans?: Array<{
    start: number
    end: number
    status: 'eliminado_no_verificado'
  }>
  warning?: { code: 'TRANSLATION_UNAVAILABLE' }
}

type TranslationResponse = Omit<TranslationResult, 'warning'>

function isTranslationResponse(value: unknown): value is TranslationResponse {
  if (!value || typeof value !== 'object') return false
  const response = value as Record<string, unknown>
  const coverage = response.coverage
  const segments = response.segments
  if (!coverage || typeof coverage !== 'object' || !Array.isArray(segments)) {
    return false
  }
  const coverageValues = coverage as Record<string, unknown>
  return (
    typeof response.text_nsy === 'string' &&
    typeof response.text_es === 'string' &&
    typeof response.glossary_version === 'string' &&
    typeof response.took_ms === 'number' &&
    ['t1', 't2', 't3'].every(
      (key) => typeof coverageValues[key] === 'number'
    ) &&
    segments.every((segment) => {
      if (!segment || typeof segment !== 'object') return false
      const value = segment as Record<string, unknown>
      return (
        typeof value.es === 'string' &&
        (typeof value.nsy === 'string' || value.nsy === null) &&
        [1, 2, 3].includes(value.tier as number) &&
        ['traducido', 'conservado_en_español', 'no_verificada'].includes(
          value.status as string
        ) &&
        !!value.source &&
        typeof value.source === 'object'
      )
    })
  )
}

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name)
  private readonly translateUrl: string
  private readonly allowDerived: boolean

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {
    const baseUrl = this.config.getOrThrow<string>('RAG_SERVICE_URL')
    this.translateUrl = `${baseUrl.replace(/\/+$/, '')}/translate`
    this.allowDerived =
      this.config.get<string>('TRANSLATION_ALLOW_DERIVED') !== 'false'
  }

  async getPreferredLanguage(userId: string): Promise<UserLanguage> {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { preferredLanguage: true }
    })
    if (!user) throw new NotFoundException('Usuario no encontrado')
    return user.preferredLanguage
  }

  async translateGeneratedText(
    userId: string,
    textEs: string,
    chunkRefs: TranslationChunkRef[]
  ): Promise<TranslationResult> {
    let result: TranslationResult
    try {
      const { data } = await firstValueFrom(
        this.http.post<unknown>(
          this.translateUrl,
          {
            text_es: textEs,
            chunk_refs: chunkRefs,
            allow_derived: this.allowDerived
          },
          { timeout: 5000 }
        )
      )
      if (!isTranslationResponse(data)) {
        throw new Error(
          'El servicio de traducción devolvió una respuesta inválida'
        )
      }
      result = data
    } catch (error) {
      this.logger.warn(
        `Traducción no disponible; se conserva español para ${userId}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`
      )
      result = {
        text_nsy: textEs,
        text_es: textEs,
        segments: [
          {
            es: textEs,
            nsy: null,
            tier: 3,
            status: 'conservado_en_español',
            source: { kind: 'none', id: null }
          }
        ],
        coverage: { t1: 0, t2: 0, t3: 1 },
        glossary_version: 'unavailable',
        took_ms: 0,
        warning: { code: 'TRANSLATION_UNAVAILABLE' }
      }
    }

    await this.persistAudit(result)
    return result
  }

  private async persistAudit(result: TranslationResult): Promise<void> {
    const queryId = crypto.randomUUID()
    const t1Count = result.segments.filter(
      (segment) => segment.tier === 1
    ).length
    const t2Count = result.segments.filter(
      (segment) => segment.tier === 2
    ).length
    const t3Count = result.segments.filter(
      (segment) => segment.tier === 3
    ).length
    const untranslatedTerms = [
      ...new Set(
        result.segments
          .filter((segment) => segment.tier === 3)
          .flatMap((segment) => segment.es.match(/[\p{L}\p{N}]+/gu) ?? [])
          .filter((term) => term.length > 2)
      )
    ]

    await this.prisma.translationLog.create({
      data: {
        queryId,
        language: 'NSY',
        t1Count,
        t2Count,
        t3Count,
        untranslatedTerms,
        glossaryVersion: result.glossary_version
      }
    })

    const derivedSegments = result.segments.filter(
      (segment) =>
        segment.tier === 2 &&
        segment.source.kind === 'rule' &&
        segment.source.id &&
        segment.nsy
    )
    for (const segment of derivedSegments) {
      const evidence =
        segment.evidence && typeof segment.evidence === 'object'
          ? (segment.evidence as Prisma.InputJsonValue)
          : {}
      await this.prisma.translationReview.upsert({
        where: {
          ruleId_esText_nasaText: {
            ruleId: segment.source.id as string,
            esText: segment.es,
            nasaText: segment.nsy as string
          }
        },
        create: {
          ruleId: segment.source.id as string,
          esText: segment.es,
          nasaText: segment.nsy as string,
          evidence
        },
        update: {
          occurrenceCount: { increment: 1 },
          evidence
        }
      })
    }
  }
}
