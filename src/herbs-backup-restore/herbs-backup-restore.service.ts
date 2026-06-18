/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as XLSX from 'xlsx'
import {
  ExcelHerbBackup,
  ExcelSymptomBackup,
  ExcelTreatmentBackup
} from './interfaces/backup-sheets.interface'

@Injectable()
export class BackupRestoreService {
  constructor(private readonly prisma: PrismaService) {}

  async exportDatabase(): Promise<Buffer> {
    const [herbs, symptoms, treatments] = await Promise.all([
      this.prisma.herb.findMany(),
      this.prisma.symptom.findMany(),
      this.prisma.herbSymptom.findMany()
    ])

    if (herbs.length === 0 && symptoms.length === 0 && treatments.length === 0) {
      throw new BadRequestException(
        'No hay datos para exportar. La base de datos está vacía.'
      )
    }

    // Hoja 1: Plantas Medicinales
    const herbsRows = herbs.map((h) => ({
      'ID Planta': h.herb_id,
      Nombre: h.name,
      Descripción: h.description,
      'URL Imagen': h.img,
      Cultivador: h.cultivator ?? 'N/A',
      'Info Importante': h.important ?? 'N/A'
    }))

    // Hoja 2: Síntomas
    const symptomsRows = symptoms.map((s) => ({
      'ID Síntoma': s.symptom_id,
      'Nombre Síntoma': s.name,
      'Descripción Síntoma': s.description ?? 'Sin descripción'
    }))

    // Hoja 3: Tratamientos (Relación)
    const treatmentsRows = treatments.map((t) => ({
      'ID Planta': t.herbId,
      'ID Síntoma': t.symptomId,
      'Partes Utilizadas': t.partsplant,
      Preparación: t.prepare,
      Aplicación: t.apply ?? 'N/A'
    }))

    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(herbsRows),
      'Plantas Medicinales'
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(symptomsRows),
      'Síntomas'
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(treatmentsRows),
      'Tratamientos (Relación)'
    )

    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
  }

  async restoreDatabase(
    fileBuffer: Buffer
  ): Promise<{ message: string; stats: any }> {
    // 1. EXTRAER: Leer el archivo Excel en memoria
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })

    const herbsSheet = workbook.Sheets['Plantas Medicinales']
    const symptomsSheet = workbook.Sheets['Síntomas']
    const treatmentsSheet = workbook.Sheets['Tratamientos (Relación)']

    // Validación de estructura del archivo
    if (!herbsSheet || !symptomsSheet || !treatmentsSheet) {
      throw new BadRequestException(
        'Estructura de backup inválida. El archivo debe contener las pestañas: "Plantas Medicinales", "Síntomas" y "Tratamientos (Relación)".'
      )
    }

    // Convertir las hojas a arreglos de objetos JSON
    const herbsData = XLSX.utils.sheet_to_json<ExcelHerbBackup>(herbsSheet)
    const symptomsData =
      XLSX.utils.sheet_to_json<ExcelSymptomBackup>(symptomsSheet)
    const treatmentsData =
      XLSX.utils.sheet_to_json<ExcelTreatmentBackup>(treatmentsSheet)

    try {
      // 2. TRANSFORMAR Y CARGAR: Ejecutar dentro de una transacción ACID
      await this.prisma.$transaction(async (tx) => {
        // A. Destrucción Absoluta: Vaciar las tablas en cascada para evitar conflictos de Llaves Foráneas
        await tx.$executeRaw`TRUNCATE TABLE "tbl_treatment", "tbl_favorite", "tbl_symptom" CASCADE;`
        await tx.$executeRaw`TRUNCATE TABLE "tbl_herb" CASCADE;`

        // B. Carga Jerárquica 1: Insertar Plantas Medicinales
        if (herbsData.length > 0) {
          const formattedHerbs = herbsData.map((h) => ({
            herb_id: h['ID Planta'],
            name: h['Nombre'],
            description: h['Descripción'],
            img: h['URL Imagen'],
            cultivator: h['Cultivador'] === 'N/A' ? null : h['Cultivador'],
            important:
              h['Info Importante'] === 'N/A' ? null : h['Info Importante']
          }))

          await (tx as any).herb.createMany({ data: formattedHerbs })
        }

        // C. Carga Jerárquica 2: Insertar Síntomas
        if (symptomsData.length > 0) {
          const formattedSymptoms = symptomsData.map((s) => ({
            symptom_id: s['ID Síntoma'],
            name: s['Nombre Síntoma'],
            description:
              s['Descripción Síntoma'] === 'Sin descripción'
                ? null
                : s['Descripción Síntoma']
          }))

          await tx.symptom.createMany({ data: formattedSymptoms })
        }

        // D. Carga Jerárquica 3 (Última): Insertar las relaciones (Tratamientos)
        if (treatmentsData.length > 0) {
          const formattedTreatments = treatmentsData.map((t) => ({
            herbId: t['ID Planta'],
            symptomId: t['ID Síntoma'],
            partsplant: t['Partes Utilizadas'],
            prepare: t['Preparación'],
            apply: t['Aplicación'] === 'N/A' ? null : t['Aplicación']
          }))

          await tx.herbSymptom.createMany({ data: formattedTreatments })
        }
      })

      return {
        message: 'Base de datos restaurada con éxito de forma limpia.',
        stats: {
          plantas_restauradas: herbsData.length,
          sintomas_restaurados: symptomsData.length,
          relaciones_restauradas: treatmentsData.length
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new InternalServerErrorException(
        `Fallo en la restauración del backup. Operación cancelada de forma segura. Motivo: ${message}`
      )
    }
  }
}
