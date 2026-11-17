import { TranslationService } from './translation.service'
import { of, throwError } from 'rxjs'

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {}
}))

describe('TranslationService', () => {
  let service: TranslationService
  let http: { post: jest.Mock }
  let prisma: {
    user: { findUnique: jest.Mock }
    translationLog: { create: jest.Mock<Promise<unknown>, [object]> }
    translationReview: { upsert: jest.Mock<Promise<unknown>, [object]> }
  }

  beforeEach(() => {
    http = {
      post: jest.fn().mockReturnValue(
        of({
          data: {
            text_nsy: 'paiku',
            text_es: 'paico',
            segments: [
              {
                es: 'paico',
                nsy: 'paiku',
                tier: 1,
                status: 'traducido',
                source: { kind: 'term', id: 'term-id' }
              }
            ],
            coverage: { t1: 1, t2: 0, t3: 0 },
            glossary_version: 'version-1',
            took_ms: 4
          }
        })
      )
    }
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ preferredLanguage: 'NSY' })
      },
      translationLog: {
        create: jest.fn<Promise<unknown>, [object]>().mockResolvedValue({})
      },
      translationReview: {
        upsert: jest.fn<Promise<unknown>, [object]>().mockResolvedValue({})
      }
    }
    service = new TranslationService(
      http as never,
      {
        getOrThrow: jest.fn().mockReturnValue('http://rag:8000'),
        get: jest.fn().mockReturnValue(undefined)
      } as never,
      prisma as never
    )
  })

  it('reads the persisted language preference on every request', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ preferredLanguage: 'ES' })
      .mockResolvedValueOnce({ preferredLanguage: 'NSY' })

    await expect(service.getPreferredLanguage('user-id')).resolves.toBe('ES')
    await expect(service.getPreferredLanguage('user-id')).resolves.toBe('NSY')
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2)
  })

  it('sends Spanish text and chunk references to the translator and audits tiers', async () => {
    const result = await service.translateGeneratedText('user-id', 'paico', [
      {
        herb_id: 'herb-id',
        source_type: 'HERB_SYMPTOM',
        source_id: 'herb-id_symptom-id'
      }
    ])

    expect(result.text_nsy).toBe('paiku')
    expect(http.post).toHaveBeenCalledWith(
      'http://rag:8000/translate',
      {
        text_es: 'paico',
        chunk_refs: [
          {
            herb_id: 'herb-id',
            source_type: 'HERB_SYMPTOM',
            source_id: 'herb-id_symptom-id'
          }
        ],
        allow_derived: true
      },
      { timeout: 5000 }
    )
    expect(prisma.translationLog.create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        language: 'NSY',
        t1Count: 1,
        t2Count: 0,
        t3Count: 0
      }
    })
  })

  it('returns the original Spanish text and warning when translation is unavailable', async () => {
    http.post.mockReturnValue(throwError(() => new Error('connection refused')))

    const result = await service.translateGeneratedText(
      'user-id',
      'La respuesta en español',
      []
    )

    expect(result.text_nsy).toBe('La respuesta en español')
    expect(result.warning).toEqual({ code: 'TRANSLATION_UNAVAILABLE' })
    expect(result.segments[0].tier).toBe(3)
    expect(prisma.translationLog.create).toHaveBeenCalled()
  })

  it('upserts T2 review evidence for the speaker queue', async () => {
    http.post.mockReturnValue(
      of({
        data: {
          text_nsy: 'paiku vyte tus',
          text_es: 'paico y tos',
          segments: [
            {
              es: ' y ',
              nsy: ' vyte ',
              tier: 2,
              status: 'no_verificada',
              source: { kind: 'rule', id: 'R-CONJUNCTION' },
              evidence: { pieces: ['term-1', 'term-2'] }
            }
          ],
          coverage: { t1: 0, t2: 0, t3: 1 },
          glossary_version: 'version-1',
          took_ms: 4
        }
      })
    )

    await service.translateGeneratedText('user-id', 'paico y tos', [])

    expect(prisma.translationReview.upsert.mock.calls[0]?.[0]).toMatchObject({
      where: {
        ruleId_esText_nasaText: {
          ruleId: 'R-CONJUNCTION',
          esText: ' y ',
          nasaText: ' vyte '
        }
      },
      create: { evidence: { pieces: ['term-1', 'term-2'] } }
    })
  })
})
