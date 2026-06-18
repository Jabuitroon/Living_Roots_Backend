import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, InternalServerErrorException } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { BackupRestoreService } from './herbs-backup-restore.service'
import { PrismaService } from '../prisma/prisma.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildWorkbookBuffer(sheets: Record<string, object[]>): Buffer {
  const wb = XLSX.utils.book_new()
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name)
  }
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

const HERB_ROW = {
  herb_id: 'herb-1',
  name: 'Manzanilla',
  description: 'Planta calmante',
  img: 'https://example.com/manzanilla.jpg',
  cultivator: 'Agricultor A',
  important: 'Evitar en embarazo'
}

const SYMPTOM_ROW = {
  symptom_id: 'sym-1',
  name: 'Dolor de cabeza',
  description: 'Cefalea leve'
}

const TREATMENT_ROW = {
  herbId: 'herb-1',
  symptomId: 'sym-1',
  partsplant: 'Flores',
  prepare: 'Infusión',
  apply: 'Oral'
}

// ---------------------------------------------------------------------------
// Mock PrismaService factory
// ---------------------------------------------------------------------------

function buildPrismaMock(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    herb: { findMany: jest.fn().mockResolvedValue([HERB_ROW]) },
    symptom: { findMany: jest.fn().mockResolvedValue([SYMPTOM_ROW]) },
    herbSymptom: { findMany: jest.fn().mockResolvedValue([TREATMENT_ROW]) },
    $transaction: jest.fn(),
    ...overrides
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('BackupRestoreService', () => {
  let service: BackupRestoreService
  let prisma: ReturnType<typeof buildPrismaMock>

  async function createModule(prismaMock: object) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupRestoreService,
        { provide: PrismaService, useValue: prismaMock }
      ]
    }).compile()

    service = module.get<BackupRestoreService>(BackupRestoreService)
  }

  // -------------------------------------------------------------------------
  // Test 1: Workbook structure
  // -------------------------------------------------------------------------
  describe('exportDatabase – estructura del workbook', () => {
    it('should return a Buffer with 3 sheets with correct names', async () => {
      prisma = buildPrismaMock()
      await createModule(prisma)

      const result = await service.exportDatabase()

      expect(result).toBeInstanceOf(Buffer)

      const wb = XLSX.read(result, { type: 'buffer' })
      expect(wb.SheetNames).toHaveLength(3)
      expect(wb.SheetNames).toContain('Plantas Medicinales')
      expect(wb.SheetNames).toContain('Síntomas')
      expect(wb.SheetNames).toContain('Tratamientos (Relación)')
    })
  })

  // -------------------------------------------------------------------------
  // Test 2: Column headers
  // -------------------------------------------------------------------------
  describe('exportDatabase – columnas correctas', () => {
    it('should have the correct headers in every sheet', async () => {
      prisma = buildPrismaMock()
      await createModule(prisma)

      const buffer = await service.exportDatabase()
      const wb = XLSX.read(buffer, { type: 'buffer' })

      const herbHeaders = XLSX.utils
        .sheet_to_json<Record<string, unknown>>(wb.Sheets['Plantas Medicinales'], { header: 1 })
        .at(0) as string[]

      const symptomHeaders = XLSX.utils
        .sheet_to_json<Record<string, unknown>>(wb.Sheets['Síntomas'], { header: 1 })
        .at(0) as string[]

      const treatmentHeaders = XLSX.utils
        .sheet_to_json<Record<string, unknown>>(wb.Sheets['Tratamientos (Relación)'], { header: 1 })
        .at(0) as string[]

      expect(herbHeaders).toEqual([
        'ID Planta',
        'Nombre',
        'Descripción',
        'URL Imagen',
        'Cultivador',
        'Info Importante'
      ])

      expect(symptomHeaders).toEqual([
        'ID Síntoma',
        'Nombre Síntoma',
        'Descripción Síntoma'
      ])

      expect(treatmentHeaders).toEqual([
        'ID Planta',
        'ID Síntoma',
        'Partes Utilizadas',
        'Preparación',
        'Aplicación'
      ])
    })
  })

  // -------------------------------------------------------------------------
  // Test 3: Empty DB throws BadRequestException
  // -------------------------------------------------------------------------
  describe('exportDatabase – BD vacía lanza error', () => {
    it('should throw BadRequestException when all tables are empty', async () => {
      prisma = buildPrismaMock({
        herb: { findMany: jest.fn().mockResolvedValue([]) },
        symptom: { findMany: jest.fn().mockResolvedValue([]) },
        herbSymptom: { findMany: jest.fn().mockResolvedValue([]) }
      } as any)
      await createModule(prisma)

      await expect(service.exportDatabase()).rejects.toThrow(BadRequestException)
      await expect(service.exportDatabase()).rejects.toThrow(
        'No hay datos para exportar. La base de datos está vacía.'
      )
    })
  })

  // -------------------------------------------------------------------------
  // Test 4: Null values are encoded as N/A or "Sin descripción"
  // -------------------------------------------------------------------------
  describe('exportDatabase – codificación de nulls', () => {
    it('should encode null cultivator and important as "N/A" and null symptom description as "Sin descripción"', async () => {
      prisma = buildPrismaMock({
        herb: {
          findMany: jest.fn().mockResolvedValue([
            { ...HERB_ROW, cultivator: null, important: null }
          ])
        },
        symptom: {
          findMany: jest.fn().mockResolvedValue([
            { ...SYMPTOM_ROW, description: null }
          ])
        },
        herbSymptom: {
          findMany: jest.fn().mockResolvedValue([
            { ...TREATMENT_ROW, apply: null }
          ])
        }
      } as any)
      await createModule(prisma)

      const buffer = await service.exportDatabase()
      const wb = XLSX.read(buffer, { type: 'buffer' })

      const herbRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        wb.Sheets['Plantas Medicinales']
      )
      expect(herbRows[0]['Cultivador']).toBe('N/A')
      expect(herbRows[0]['Info Importante']).toBe('N/A')

      const symptomRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        wb.Sheets['Síntomas']
      )
      expect(symptomRows[0]['Descripción Síntoma']).toBe('Sin descripción')

      const treatmentRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        wb.Sheets['Tratamientos (Relación)']
      )
      expect(treatmentRows[0]['Aplicación']).toBe('N/A')
    })
  })

  // -------------------------------------------------------------------------
  // Test 5: Successful restore flow
  // -------------------------------------------------------------------------
  describe('restoreDatabase – flujo exitoso', () => {
    it('should call createMany for all three entities and return stats', async () => {
      const herbCreateMany = jest.fn().mockResolvedValue({ count: 1 })
      const symptomCreateMany = jest.fn().mockResolvedValue({ count: 1 })
      const herbSymptomCreateMany = jest.fn().mockResolvedValue({ count: 1 })
      const executeRaw = jest.fn().mockResolvedValue(undefined)

      prisma = buildPrismaMock({
        $transaction: jest.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => {
          const tx = {
            $executeRaw: executeRaw,
            herb: { createMany: herbCreateMany },
            symptom: { createMany: symptomCreateMany },
            herbSymptom: { createMany: herbSymptomCreateMany }
          }
          return cb(tx)
        })
      } as any)
      await createModule(prisma)

      const buffer = buildWorkbookBuffer({
        'Plantas Medicinales': [
          {
            'ID Planta': 'herb-1',
            Nombre: 'Manzanilla',
            Descripción: 'Planta calmante',
            'URL Imagen': 'https://example.com/img.jpg',
            Cultivador: 'N/A',
            'Info Importante': 'N/A'
          }
        ],
        Síntomas: [
          {
            'ID Síntoma': 'sym-1',
            'Nombre Síntoma': 'Dolor de cabeza',
            'Descripción Síntoma': 'Cefalea leve'
          }
        ],
        'Tratamientos (Relación)': [
          {
            'ID Planta': 'herb-1',
            'ID Síntoma': 'sym-1',
            'Partes Utilizadas': 'Flores',
            Preparación: 'Infusión',
            Aplicación: 'Oral'
          }
        ]
      })

      const result = await service.restoreDatabase(buffer)

      expect(result.message).toBe('Base de datos restaurada con éxito de forma limpia.')
      expect(result.stats.plantas_restauradas).toBe(1)
      expect(result.stats.sintomas_restaurados).toBe(1)
      expect(result.stats.relaciones_restauradas).toBe(1)

      expect(herbCreateMany).toHaveBeenCalledTimes(1)
      expect(symptomCreateMany).toHaveBeenCalledTimes(1)
      expect(herbSymptomCreateMany).toHaveBeenCalledTimes(1)
    })
  })

  // -------------------------------------------------------------------------
  // Test 6: Missing sheets throws BadRequestException
  // -------------------------------------------------------------------------
  describe('restoreDatabase – hojas faltantes', () => {
    it('should throw BadRequestException when required sheets are missing', async () => {
      prisma = buildPrismaMock()
      await createModule(prisma)

      // Workbook without the "Síntomas" sheet
      const buffer = buildWorkbookBuffer({
        'Plantas Medicinales': [
          {
            'ID Planta': 'herb-1',
            Nombre: 'Manzanilla',
            Descripción: 'Planta',
            'URL Imagen': 'https://example.com/img.jpg',
            Cultivador: 'N/A',
            'Info Importante': 'N/A'
          }
        ],
        'Tratamientos (Relación)': [
          {
            'ID Planta': 'herb-1',
            'ID Síntoma': 'sym-1',
            'Partes Utilizadas': 'Flores',
            Preparación: 'Infusión',
            Aplicación: 'Oral'
          }
        ]
      })

      await expect(service.restoreDatabase(buffer)).rejects.toThrow(BadRequestException)
      await expect(service.restoreDatabase(buffer)).rejects.toThrow(
        'Estructura de backup inválida'
      )
    })
  })

  // -------------------------------------------------------------------------
  // Test 7: Transaction error throws InternalServerErrorException
  // -------------------------------------------------------------------------
  describe('restoreDatabase – error en transacción', () => {
    it('should throw InternalServerErrorException when the transaction fails', async () => {
      prisma = buildPrismaMock({
        $transaction: jest.fn().mockRejectedValue(new Error('DB error'))
      } as any)
      await createModule(prisma)

      const buffer = buildWorkbookBuffer({
        'Plantas Medicinales': [
          {
            'ID Planta': 'herb-1',
            Nombre: 'Manzanilla',
            Descripción: 'Planta',
            'URL Imagen': 'https://example.com/img.jpg',
            Cultivador: 'N/A',
            'Info Importante': 'N/A'
          }
        ],
        Síntomas: [
          {
            'ID Síntoma': 'sym-1',
            'Nombre Síntoma': 'Dolor',
            'Descripción Síntoma': 'Cefalea'
          }
        ],
        'Tratamientos (Relación)': [
          {
            'ID Planta': 'herb-1',
            'ID Síntoma': 'sym-1',
            'Partes Utilizadas': 'Flores',
            Preparación: 'Infusión',
            Aplicación: 'Oral'
          }
        ]
      })

      await expect(service.restoreDatabase(buffer)).rejects.toThrow(
        InternalServerErrorException
      )
    })
  })
})
