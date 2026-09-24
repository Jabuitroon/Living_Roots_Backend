/**
 * Pruebas de integración de DashboardRepository contra PostgreSQL REAL.
 *
 * ⚠️ TRUNCA las tablas involucradas. Solo se ejecuta si DATABASE_URL contiene
 * "test" (usa una base de datos de pruebas con las migraciones aplicadas).
 *
 * Ejecutar (ajusta el runner a tu configuración de Jest):
 *   DATABASE_URL=postgresql://.../living_root_test npx jest --testRegex 'int-spec\.ts$' --runInBand
 */
import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { Test } from '@nestjs/testing'
// AJUSTAR: ruta real de tu PrismaService.
import { PrismaService } from '../../prisma/prisma.service'
import { DashboardRepository } from '../dashboard.repository'

const describeIfTestDb = /test/i.test(process.env.DATABASE_URL ?? '')
  ? describe
  : describe.skip

type StoryOverrides = {
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  category?: 'TRADITIONAL_MEDICINE' | 'ORAL_HISTORY'
  insightsProcessedAt?: Date
}

describeIfTestDb('DashboardRepository (integración)', () => {
  let prisma: PrismaService
  let repo: DashboardRepository

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService, DashboardRepository]
    }).compile()
    prisma = moduleRef.get(PrismaService)
    repo = moduleRef.get(DashboardRepository)
  })

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE tbl_insight_mention, tbl_treatment, tbl_story, tbl_chat,
                tbl_herb, tbl_symptom, tbl_user RESTART IDENTITY CASCADE`
    )
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  // ── helpers de datos ──
  const makeUser = () =>
    prisma.user.create({
      data: {
        name: 'Ana',
        lastName: 'Prueba',
        email: `ana-${randomUUID()}@test.dev`,
        passwordHash: 'x'
      }
    })
  const makeHerb = (name: string, cultivator?: string | null) =>
    prisma.herb.create({
      data: { name, description: 'd', img: 'i.png', cultivator }
    })
  const makeSymptom = (name: string) =>
    prisma.symptom.create({ data: { name } })
  const makeStory = (authorId: string, over: StoryOverrides = {}) =>
    prisma.story.create({
      data: {
        title: 't',
        body: 'b',
        status: 'PUBLISHED',
        category: 'TRADITIONAL_MEDICINE',
        authorId,
        publishedAt: new Date(),
        ...over
      }
    })
  const makeChat = (createdAt: Date) =>
    prisma.chat.create({ data: { userId: 'u-test', createdAt } })

  const FROM = new Date('2026-09-17T05:00:00.000Z') // 17-sep 00:00 en Bogotá
  const INSIDE = new Date('2026-09-20T12:00:00.000Z')
  const BEFORE = new Date('2026-09-01T12:00:00.000Z')

  it('con la BD vacía todo es 0 / vacío, sin errores (E2)', async () => {
    expect(await repo.countHerbs()).toBe(0)
    expect(await repo.countFamilies()).toBe(0)
    expect(await repo.countChats()).toBe(0)
    expect(await repo.countChatsSince(FROM)).toBe(0)
    expect(await repo.consultationsTrend(FROM, 'day')).toEqual([])
    expect(await repo.testimonialInsights(FROM)).toEqual({
      symptoms: [],
      herbs: [],
      lastProcessedAt: null
    })
    expect(await repo.catalogHealth()).toEqual({
      herbsWithoutSymptoms: 0,
      symptomsWithoutHerbs: 0,
      herbSamples: [],
      symptomSamples: []
    })
  })

  it('cuenta familias distintas normalizando el texto libre de cultivator', async () => {
    await makeHerb('A', 'Familia Pérez')
    await makeHerb('B', ' familia perez ')
    await makeHerb('C', 'FAMILIA PÉREZ')
    await makeHerb('D', 'Cañas')
    await makeHerb('E', null)
    await makeHerb('F', '   ')

    expect(await repo.countHerbs()).toBe(6)
    expect(await repo.countFamilies()).toBe(2) // "familia perez" y "cañas"
  })

  it('cuenta consultas totales y del período', async () => {
    await makeChat(BEFORE)
    await makeChat(INSIDE)
    await makeChat(INSIDE)

    expect(await repo.countChats()).toBe(3)
    expect(await repo.countChatsSince(FROM)).toBe(2)
  })

  it('agrupa la tendencia por día LOCAL (Bogotá), no por día UTC', async () => {
    await makeChat(new Date('2026-09-17T04:59:59Z')) // 16-sep local → fuera
    await makeChat(new Date('2026-09-24T04:30:00Z')) // 23-sep 23:30 local
    await makeChat(new Date('2026-09-24T05:30:00Z')) // 24-sep 00:30 local
    await makeChat(new Date('2026-09-24T06:00:00Z')) // 24-sep 01:00 local

    expect(
      await repo.consultationsTrend(FROM, 'day', 'America/Bogota')
    ).toEqual([
      { bucket: '2026-09-23', count: 1 },
      { bucket: '2026-09-24', count: 2 }
    ])
    expect(
      await repo.consultationsTrend(FROM, 'week', 'America/Bogota')
    ).toEqual([{ bucket: '2026-09-21', count: 3 }])
  })

  it('testimonialInsights: solo testimonios elegibles y dentro del período, ordenado por conteo', async () => {
    const author = await makeUser()
    const [s1, s2] = await Promise.all([
      makeSymptom('Dolor de cabeza'),
      makeSymptom('Tos')
    ])
    const herb = await makeHerb('Manzanilla')

    const processedAt = new Date('2026-09-22T10:00:00Z')
    const t1 = await makeStory(author.user_id, {
      insightsProcessedAt: processedAt
    })
    const t2 = await makeStory(author.user_id)
    const draft = await makeStory(author.user_id, {
      status: 'DRAFT',
      insightsProcessedAt: new Date('2026-09-23T10:00:00Z') // no elegible: no cuenta
    })
    const otherCategory = await makeStory(author.user_id, {
      category: 'ORAL_HISTORY'
    })

    const mention = (
      storyId: string,
      entity: { symptomId: string } | { herbId: string },
      occurredAt = INSIDE
    ) =>
      prisma.insightMention.create({ data: { storyId, occurredAt, ...entity } })

    await mention(t1.story_id, { symptomId: s1.symptom_id })
    await mention(t2.story_id, { symptomId: s1.symptom_id })
    await mention(t1.story_id, { symptomId: s2.symptom_id })
    await mention(t1.story_id, { herbId: herb.herb_id })
    await mention(draft.story_id, { symptomId: s1.symptom_id }) // ignorada
    await mention(otherCategory.story_id, { symptomId: s1.symptom_id }) // ignorada
    await mention(t2.story_id, { symptomId: s2.symptom_id }, BEFORE) // fuera de período

    const result = await repo.testimonialInsights(FROM, 5)

    expect(result.symptoms).toEqual([
      { id: s1.symptom_id, name: 'Dolor de cabeza', count: 2 },
      { id: s2.symptom_id, name: 'Tos', count: 1 }
    ])
    expect(result.herbs).toEqual([
      { id: herb.herb_id, name: 'Manzanilla', count: 1 }
    ])
    expect(result.lastProcessedAt).toEqual(processedAt)
  })

  it('testimonialInsights respeta el límite', async () => {
    const author = await makeUser()
    const story = await makeStory(author.user_id)
    for (const name of ['A', 'B', 'C']) {
      const s = await makeSymptom(name)
      await prisma.insightMention.create({
        data: {
          storyId: story.story_id,
          symptomId: s.symptom_id,
          occurredAt: INSIDE
        }
      })
    }
    expect((await repo.testimonialInsights(FROM, 2)).symptoms).toHaveLength(2)
  })

  it('catalogHealth cuenta plantas sin síntomas y síntomas sin plantas', async () => {
    const withSymptom = await makeHerb('Con síntoma')
    const lonely1 = await makeHerb('Sola 1')
    const lonely2 = await makeHerb('Sola 2')
    const used = await makeSymptom('Usado')
    const unused = await makeSymptom('Sin plantas')
    await prisma.herbSymptom.create({
      data: {
        herbId: withSymptom.herb_id,
        symptomId: used.symptom_id,
        partsplant: 'hojas',
        prepare: 'infusión'
      }
    })

    const health = await repo.catalogHealth(1)

    expect(health.herbsWithoutSymptoms).toBe(2)
    expect(health.symptomsWithoutHerbs).toBe(1)
    expect(health.herbSamples).toHaveLength(1) // respeta sampleSize
    expect([lonely1.herb_id, lonely2.herb_id]).toContain(
      health.herbSamples[0].id
    )
    expect(health.symptomSamples).toEqual([
      { id: unused.symptom_id, name: 'Sin plantas' }
    ])
  })
})
