import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service' // Ajusta la ruta a tu PrismaService
import { ExcelGeneratorService } from '../excel-generator/excel-generator.service'

@Injectable()
export class HerbExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly excelGeneratorService: ExcelGeneratorService
  ) {}

  async generateDatabaseBackup(): Promise<Buffer> {
    // 1. Extraer toda la información en paralelo para optimizar tiempos
    const [herbs, symptoms, treatments] = await Promise.all([
      this.prisma.herb.findMany(), // Asumiendo que el modelo mapea a tbl_herb
      this.prisma.symptom.findMany(),
      this.prisma.herbSymptom.findMany()
    ])

    // 2. Mapear y formatear las columnas para el usuario final (Backup estructurado)
    const herbsSheet = herbs.map((h) => ({
      'ID Planta': h.herb_id,
      Nombre: h.name,
      Descripción: h.description,
      'URL Imagen': h.img,
      Cultivador: h.cultivator || 'N/A',
      'Info Importante': h.important || 'N/A',
      'Creado En': h.createdAt.toISOString()
    }))

    const symptomsSheet = symptoms.map((s) => ({
      'ID Síntoma': s.symptom_id,
      'Nombre Síntoma': s.name,
      'Descripción Síntoma': s.description || 'Sin descripción'
    }))

    const treatmentsSheet = treatments.map((t) => ({
      'ID Planta': t.herbId,
      'ID Síntoma': t.symptomId,
      'Partes Utilizadas': t.partsplant,
      Preparación: t.prepare,
      Aplicación: t.apply || 'N/A'
    }))

    // 3. Enviar al generador delegando la responsabilidad del formateo a Excel
    return this.excelGeneratorService.createWorkbookBuffer([
      { name: 'Plantas Medicinales', data: herbsSheet },
      { name: 'Síntomas', data: symptomsSheet },
      { name: 'Tratamientos (Relación)', data: treatmentsSheet }
    ])
  }
}
