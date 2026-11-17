import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { PrismaPg } from '@prisma/adapter-pg'
import * as XLSX from 'xlsx'
import {
  PrismaClient,
  GlossaryTermCategory
} from '../src/generated/prisma/client'

type WorkbookPlant = {
  name: string
  nasaName?: string
  nasaParts?: string
  nasaSymptom?: string
  nasaPrepare?: string
  nasaApply?: string
  spanishParts?: string
  spanishSymptom?: string
  spanishPrepare?: string
  spanishApply?: string
  row: number
}

function cellText(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  throw new Error('Se encontró un valor de celda que no es texto ni número')
}

function surface(value: unknown): string {
  return cellText(value)
    .normalize('NFC')
    .replace(/[´’ʼ`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function key(value: unknown): string {
  return surface(value)
    .replace(/\s*\([^)]*\)/g, '')
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[,.]+$/g, '')
    .replace(/\s*\/\s*/g, '/')
    .trim()
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      )
    }
    for (let index = 0; index <= right.length; index += 1) {
      previous[index] = current[index]
    }
  }
  return previous[right.length]
}

function suggestMatches(name: string, spanishRows: WorkbookPlant[]) {
  const sourceKey = key(name)
  return spanishRows
    .map((plant) => {
      const targetKey = key(plant.name)
      const length = Math.max(sourceKey.length, targetKey.length)
      const similarity =
        length === 0 ? 1 : 1 - editDistance(sourceKey, targetKey) / length
      return { plant, similarity }
    })
    .filter(({ similarity }) => similarity >= 0.45)
    .sort(
      (left, right) =>
        right.similarity - left.similarity ||
        left.plant.name.localeCompare(right.plant.name, 'es')
    )
    .slice(0, 3)
    .map(({ plant, similarity }) => ({
      name: plant.name,
      row: plant.row,
      similarity: Number(similarity.toFixed(3))
    }))
}

function readRows(path: string, preferredSheet?: string): unknown[][] {
  const workbook = XLSX.readFile(path)
  const sheetName =
    preferredSheet && workbook.SheetNames.includes(preferredSheet)
      ? preferredSheet
      : workbook.SheetNames[0]
  if (!sheetName) throw new Error(`El archivo no contiene hojas: ${path}`)
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: ''
  })
  const header = rows.findIndex(
    (row) => cellText(row[0]).trim().toLocaleLowerCase('es') === 'id'
  )
  if (header < 0)
    throw new Error(`No se encontró la fila de encabezados: ${path}`)
  return rows
    .slice(header + 1)
    .map((row, index) => ({ row, sourceRow: header + index + 2 }))
    .filter(({ row }) => /^\d+(?:\.0)?$/.test(cellText(row[0]).trim()))
    .map(({ row }) => row)
}

function readGlossary(path: string): WorkbookPlant[] {
  const workbook = XLSX.readFile(path)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: ''
  })
  const header = rows.findIndex(
    (row) => cellText(row[0]).trim().toLocaleLowerCase('es') === 'id'
  )
  if (header < 0) throw new Error(`No se encontró la hoja de glosario: ${path}`)
  return rows
    .slice(header + 1)
    .map((row, index) => ({ row, sourceRow: header + index + 2 }))
    .filter(({ row }) => /^\d+(?:\.0)?$/.test(cellText(row[0]).trim()))
    .map(({ row, sourceRow }) => ({
      name: cellText(row[1]),
      nasaName: cellText(row[2]),
      nasaParts: cellText(row[3]),
      nasaSymptom: cellText(row[4]),
      nasaPrepare: cellText(row[5]),
      nasaApply: cellText(row[6]),
      row: sourceRow
    }))
}

function findDiscardedRows(path: string) {
  const workbook = XLSX.readFile(path)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error(`No se encontró la hoja de glosario: ${path}`)
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: ''
  })
  const discarded = rows.flatMap((row, index) => {
    const name = surface(row[8])
    const value = surface(row[9])
    if (key(name) !== 'calendula' || key(value) !== 'acxa') return []
    return [
      {
        row: index + 1,
        name,
        value,
        reason: 'Se descarta por decisión D12; la forma válida es acxasa yut.'
      }
    ]
  })
  const calendula = readGlossary(path).find(
    (plant) => key(plant.name) === 'calendula'
  )
  if (key(calendula?.nasaName ?? '') !== 'acxasa yut' || discarded.length > 1) {
    throw new Error(
      'El glosario no coincide con la corrección registrada en D12'
    )
  }
  return discarded
}

function readSpanish(path: string): WorkbookPlant[] {
  return readRows(path, 'Organizado').map((row, index) => ({
    name: cellText(row[1]),
    spanishParts: cellText(row[2]),
    spanishSymptom: cellText(row[3]),
    spanishPrepare: cellText(row[4]),
    spanishApply: cellText(row[5]),
    row: index + 2
  }))
}

function normalizedField(
  value: string | undefined,
  changes: object[],
  field: string,
  row: number,
  isNasa = false
) {
  const original = value ?? ''
  const normalized = surface(original)
  const foldedKey = key(normalized)
  const rules: string[] = []
  if (original.normalize('NFC') !== original) rules.push('N1')
  if (original.replace(/\s+/g, ' ').trim() !== original) rules.push('N2')
  if (original.replace(/[´’ʼ`]/g, "'") !== original) rules.push('N3')
  if (normalized !== normalized.toLocaleLowerCase('es')) rules.push('N4')
  if (/[,.]\s*$/.test(normalized)) rules.push('N5')
  if (isNasa && /[áéúâêû]/i.test(normalized)) rules.push('N6')
  if (isNasa && /ñ/i.test(normalized)) rules.push('N7')
  if (rules.length) {
    changes.push({
      row,
      field,
      before: original,
      after: normalized,
      key: foldedKey,
      rules
    })
  }
  const needsReview = isNasa && /[áéúâêûñ]/i.test(normalized)
  return {
    original: original || null,
    normalized: normalized || null,
    key: foldedKey || null,
    needsReview
  }
}

function parseArgs(args: string[]) {
  const options = new Map<string, string | true>()
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (!arg.startsWith('--')) throw new Error(`Argumento desconocido: ${arg}`)
    if (arg === '--apply') {
      options.set(arg, true)
      continue
    }
    const value = args[index + 1]
    if (!value || value.startsWith('--'))
      throw new Error(`Falta valor para ${arg}`)
    options.set(arg, value)
    index += 1
  }
  const glossary = options.get('--glossary')
  const spanish = options.get('--spanish')
  if (typeof glossary !== 'string' || typeof spanish !== 'string') {
    throw new Error(
      'Uso: pnpm glossary:import -- --glossary <archivo.xlsx> --spanish <archivo.xlsx> [--apply] [--report <archivo.json>]'
    )
  }
  return {
    glossary,
    spanish,
    apply: options.get('--apply') === true,
    report: options.get('--report')
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const glossaryRows = readGlossary(options.glossary)
  const spanishRows = readSpanish(options.spanish)
  if (glossaryRows.length !== 80 || spanishRows.length !== 80) {
    throw new Error(
      `Se esperaban 80 plantas por archivo; se encontraron ${glossaryRows.length} y ${spanishRows.length}`
    )
  }

  const spanishByKey = new Map<string, WorkbookPlant>()
  for (const plant of spanishRows) {
    const plantKey = key(plant.name)
    if (spanishByKey.has(plantKey)) {
      throw new Error(`Nombre español duplicado en el Excel: ${plant.name}`)
    }
    spanishByKey.set(plantKey, plant)
  }

  const changes: object[] = []
  const unmatched = glossaryRows.filter(
    (glossary) => !spanishByKey.has(key(glossary.name))
  )
  const pairs = glossaryRows.flatMap((glossary) => {
    const spanish = spanishByKey.get(key(glossary.name))
    return spanish ? [{ glossary, spanish }] : []
  })
  const matchSuggestions = unmatched.map((glossary) => ({
    glossary: glossary.name,
    glossaryRow: glossary.row,
    candidates: suggestMatches(glossary.name, spanishRows)
  }))

  const records = pairs.map(({ glossary, spanish }) => {
    const spanishName = normalizedField(
      glossary.name,
      changes,
      'plant.name',
      glossary.row
    )
    const spanishWorkbookName = normalizedField(
      spanish.name,
      changes,
      'plant.spanish_workbook_name',
      spanish.row
    )
    const nasaName = normalizedField(
      glossary.nasaName,
      changes,
      'plant.nasa_name',
      glossary.row,
      true
    )
    const treatment: Record<string, ReturnType<typeof normalizedField>> = {}
    const terms: Array<{
      es: ReturnType<typeof normalizedField>
      nasa: ReturnType<typeof normalizedField>
      category: GlossaryTermCategory
    }> = []
    if (
      spanishWorkbookName.normalized &&
      nasaName.normalized &&
      spanishWorkbookName.key !== spanishName.key
    ) {
      terms.push({
        es: spanishWorkbookName,
        nasa: nasaName,
        category: GlossaryTermCategory.PLANT
      })
    }
    const fieldPairs = [
      [
        'parts',
        spanish.spanishParts,
        glossary.nasaParts,
        GlossaryTermCategory.PLANT_PART
      ],
      [
        'symptom',
        spanish.spanishSymptom,
        glossary.nasaSymptom,
        GlossaryTermCategory.SYMPTOM
      ],
      [
        'prepare',
        spanish.spanishPrepare,
        glossary.nasaPrepare,
        GlossaryTermCategory.FORMULA
      ],
      [
        'apply',
        spanish.spanishApply,
        glossary.nasaApply,
        GlossaryTermCategory.FORMULA
      ]
    ] as const

    for (const [field, esValue, nasaValue, category] of fieldPairs) {
      const es = normalizedField(
        esValue,
        changes,
        `treatment.${field}.es`,
        spanish.row
      )
      const nasa = normalizedField(
        nasaValue,
        changes,
        `treatment.${field}.nasa`,
        glossary.row,
        true
      )
      treatment[`spanish${field[0].toUpperCase()}${field.slice(1)}`] = es
      treatment[`nasa${field[0].toUpperCase()}${field.slice(1)}`] = nasa
      if (es.normalized && nasa.normalized) terms.push({ es, nasa, category })
    }

    const needsReview =
      nasaName.needsReview ||
      Object.values(treatment).some((field) => field.needsReview)
    return {
      herbName: glossary.name,
      spanishName,
      spanishWorkbookName,
      nasaName,
      treatment,
      terms,
      needsReview,
      glossaryRow: glossary.row,
      spanishRow: spanish.row
    }
  })

  const report = {
    glossaryRows: glossaryRows.length,
    spanishRows: spanishRows.length,
    matchedRows: pairs.length,
    unmatched: unmatched.map(({ name, row }) => ({ name, row })),
    matchSuggestions,
    readyToApply: unmatched.length === 0,
    plantsWithoutNasaName: glossaryRows
      .filter((plant) => !surface(plant.nasaName))
      .map((plant) => plant.name),
    discarded: findDiscardedRows(options.glossary),
    normalizationChanges: changes
  }

  const saveReport = (appliedAsDraft: boolean) => {
    if (options.report && typeof options.report === 'string') {
      writeFileSync(
        options.report,
        JSON.stringify({ ...report, appliedAsDraft }, null, 2),
        'utf8'
      )
    }
  }
  const printReport = (appliedAsDraft: boolean) => {
    console.log(
      JSON.stringify(
        {
          ...report,
          normalizationChanges: `${changes.length} cambios registrados`,
          appliedAsDraft
        },
        null,
        2
      )
    )
  }

  if (!options.apply || unmatched.length) {
    saveReport(false)
    printReport(false)
    if (!options.apply) return
  }
  if (options.apply && unmatched.length) {
    throw new Error(
      `No se importó: hay ${unmatched.length} plantas sin coincidencia exacta. Revise las sugerencias del reporte y corrija los Excel antes de aplicar.`
    )
  }

  if (options.apply) {
    saveReport(false)
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL no está configurado')
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString })
    })
    try {
      const herbs = await prisma.herb.findMany({
        select: { herb_id: true, name: true }
      })
      const herbsByKey = new Map<string, string[]>()
      for (const herb of herbs) {
        const herbKey = key(herb.name)
        herbsByKey.set(herbKey, [
          ...(herbsByKey.get(herbKey) ?? []),
          herb.herb_id
        ])
      }
      const sourceRecords = records.map((record) => {
        const candidateKeys = [
          record.spanishName.key,
          record.spanishWorkbookName.key,
          key(record.herbName)
        ].filter((candidate): candidate is string => !!candidate)
        const matchingIds = [
          ...new Set(
            candidateKeys.flatMap(
              (candidate) => herbsByKey.get(candidate) ?? []
            )
          )
        ]
        if (matchingIds.length !== 1) {
          throw new Error(
            `La planta "${record.herbName}" coincide con ${matchingIds.length} registros de tbl_herb; no se importó nada`
          )
        }
        const herb = herbs.find((item) => item.herb_id === matchingIds[0])
        if (!herb)
          throw new Error(`No se pudo recuperar el registro ${matchingIds[0]}`)
        const databaseName = normalizedField(
          herb.name,
          changes,
          'tbl_herb.name',
          record.glossaryRow
        )
        const terms = [...record.terms]
        if (
          databaseName.normalized &&
          record.nasaName.normalized &&
          !terms.some((term) => term.es.key === databaseName.key)
        ) {
          terms.push({
            es: databaseName,
            nasa: record.nasaName,
            category: GlossaryTermCategory.PLANT
          })
        }
        return { ...record, herbId: matchingIds[0], terms }
      })

      await prisma.$transaction(async (transaction) => {
        await transaction.glossaryHerb.createMany({
          data: sourceRecords.map((record) => ({
            herbId: record.herbId,
            spanishNameOriginal: record.spanishName.original ?? record.herbName,
            spanishNameNormalized:
              record.spanishName.normalized ?? record.herbName,
            spanishNameKey: record.spanishName.key ?? key(record.herbName),
            nasaNameOriginal: record.nasaName.original,
            nasaNameNormalized: record.nasaName.normalized,
            nasaNameKey: record.nasaName.key,
            status: 'DRAFT',
            origin: 'Glosario_Plantas_Lengua_Materna.xlsx',
            needsReview: record.needsReview
          })),
          skipDuplicates: true
        })
        await transaction.glossaryTreatment.createMany({
          data: sourceRecords.map((record) => ({
            herbId: record.herbId,
            spanishPartsOriginal: record.treatment.spanishParts.original,
            spanishPartsNormalized: record.treatment.spanishParts.normalized,
            spanishPartsKey: record.treatment.spanishParts.key,
            nasaPartsOriginal: record.treatment.nasaParts.original,
            nasaPartsNormalized: record.treatment.nasaParts.normalized,
            nasaPartsKey: record.treatment.nasaParts.key,
            spanishSymptomOriginal: record.treatment.spanishSymptom.original,
            spanishSymptomNormalized:
              record.treatment.spanishSymptom.normalized,
            spanishSymptomKey: record.treatment.spanishSymptom.key,
            nasaSymptomOriginal: record.treatment.nasaSymptom.original,
            nasaSymptomNormalized: record.treatment.nasaSymptom.normalized,
            nasaSymptomKey: record.treatment.nasaSymptom.key,
            spanishPrepareOriginal: record.treatment.spanishPrepare.original,
            spanishPrepareNormalized:
              record.treatment.spanishPrepare.normalized,
            spanishPrepareKey: record.treatment.spanishPrepare.key,
            nasaPrepareOriginal: record.treatment.nasaPrepare.original,
            nasaPrepareNormalized: record.treatment.nasaPrepare.normalized,
            nasaPrepareKey: record.treatment.nasaPrepare.key,
            spanishApplyOriginal: record.treatment.spanishApply.original,
            spanishApplyNormalized: record.treatment.spanishApply.normalized,
            spanishApplyKey: record.treatment.spanishApply.key,
            nasaApplyOriginal: record.treatment.nasaApply.original,
            nasaApplyNormalized: record.treatment.nasaApply.normalized,
            nasaApplyKey: record.treatment.nasaApply.key,
            status: 'DRAFT',
            origin: 'Glosario_Plantas_Lengua_Materna.xlsx',
            needsReview: record.needsReview
          })),
          skipDuplicates: true
        })
        await transaction.glossaryTerm.createMany({
          data: sourceRecords.flatMap((record) =>
            record.terms.map((term) => ({
              sourceHerbId: record.herbId,
              esTermOriginal: term.es.original ?? '',
              esTermNormalized: term.es.normalized ?? '',
              esKey: term.es.key ?? '',
              nasaTermOriginal: term.nasa.original ?? '',
              nasaTermNormalized: term.nasa.normalized ?? '',
              nasaKey: term.nasa.key ?? '',
              category: term.category,
              status: 'DRAFT' as const,
              origin: 'Glosario_Plantas_Lengua_Materna.xlsx',
              needsReview: term.es.needsReview || term.nasa.needsReview
            }))
          ),
          skipDuplicates: true
        })
      })
      report['matchedRows'] = sourceRecords.length
    } finally {
      await prisma.$disconnect()
    }
  }

  if (options.apply) {
    saveReport(true)
    printReport(true)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
