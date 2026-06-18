import { Module } from '@nestjs/common'
import { HerbExportController } from './herb-export.controller'
import { HerbExportService } from './herb-export.service'
import { ExcelGeneratorService } from '../excel-generator/excel-generator.service'
import { PrismaService } from '../prisma/prisma.service' // Ajusta la ruta a tu PrismaService global

@Module({
  controllers: [HerbExportController],
  providers: [HerbExportService, ExcelGeneratorService, PrismaService]
})
export class HerbExportModule {}
