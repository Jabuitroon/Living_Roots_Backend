import 'dotenv/config'
import { resolve } from 'node:path'
import { PrismaPg } from '@prisma/adapter-pg'
import * as XLSX from 'xlsx'
import {
  PrismaClient,
  TranslationReviewDecision,
  TranslationReviewStatus
} from '../src/generated/prisma/client'

function cellText(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  throw new Error('Se encontró un valor de celda que no es texto ni número')
}

function comparisonKey(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[´’ʼ`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[,.]+$/g, '')
}

function parseCommand(args: string[]) {
  const [mode, file] = args
  if (!['export', 'import'].includes(mode) || !file) {
    throw new Error(
      'Uso: node dist/scripts/translation-review.js <export|import> <archivo.xlsx>'
    )
  }
  return { mode, file: resolve(file) }
}

function readWorkbook(path: string) {
  const workbook = XLSX.readFile(path)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error(`El archivo no contiene hojas: ${path}`)
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: ''
  })
}

async function main() {
  const command = parseCommand(process.argv.slice(2))
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL no está configurado')
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  })

  try {
    if (command.mode === 'export') {
      const [reviews, terms] = await Promise.all([
        prisma.translationReview.findMany({
          where: { status: TranslationReviewStatus.PENDING },
          orderBy: [{ occurrenceCount: 'desc' }, { updatedAt: 'desc' }]
        }),
        prisma.glossaryTerm.findMany({
          select: { nasaTermNormalized: true, nasaTermOriginal: true }
        })
      ])
      const rows = reviews.map((review) => {
        const key = comparisonKey(review.nasaText)
        const variants = [
          ...new Set(
            terms
              .filter((term) => comparisonKey(term.nasaTermNormalized) === key)
              .map((term) => term.nasaTermOriginal)
          )
        ]
        return {
          regla: review.ruleId,
          frecuencia: review.occurrenceCount,
          español: review.esText,
          nsy_propuesto: review.nasaText,
          variantes_observadas: variants.join(' | '),
          evidencia: JSON.stringify(review.evidence),
          correcta: '',
          incorrecta: '',
          corrección: ''
        }
      })
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(rows),
        'Revision'
      )
      XLSX.writeFile(workbook, command.file)
      console.log(`Exportadas ${rows.length} salidas T2 a ${command.file}`)
      return
    }

    const rows = readWorkbook(command.file)
    let updated = 0
    for (const [index, row] of rows.entries()) {
      const ruleId = cellText(row.regla).trim()
      const spanish = cellText(row.español)
      const proposed = cellText(row.nsy_propuesto)
      if (!ruleId || !spanish.trim() || !proposed.trim()) continue

      const correct = cellText(row.correcta).trim().toLowerCase()
      const incorrect = cellText(row.incorrecta).trim().toLowerCase()
      const correction = cellText(row.corrección)
        .normalize('NFC')
        .replace(/[´’ʼ`]/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
      const isCorrect = ['1', 'true', 'sí', 'si', 'x'].includes(correct)
      const isIncorrect = ['1', 'true', 'sí', 'si', 'x'].includes(incorrect)
      if (isCorrect && (isIncorrect || correction)) {
        throw new Error(
          `Fila ${index + 2}: marque correcta o incorrecta, no ambas`
        )
      }
      if (!isCorrect && !isIncorrect && !correction) continue

      const review = await prisma.translationReview.findUnique({
        where: {
          ruleId_esText_nasaText: {
            ruleId,
            esText: spanish,
            nasaText: proposed
          }
        },
        select: { id: true }
      })
      if (!review) {
        throw new Error(`Fila ${index + 2}: no existe la salida T2 indicada`)
      }
      await prisma.translationReview.update({
        where: { id: review.id },
        data: {
          status: TranslationReviewStatus.REVIEWED,
          decision: isCorrect
            ? TranslationReviewDecision.CORRECT
            : TranslationReviewDecision.INCORRECT,
          correctedNasaText: correction || null
        }
      })
      updated += 1
    }
    console.log(`Actualizadas ${updated} revisiones en ${command.file}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
