import { Controller, Get, Res, HttpStatus, UseGuards } from '@nestjs/common'
import express from 'express'
import { HerbExportService } from './herb-export.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Role } from '../auth/enums'
import { Roles } from '../auth/decorators/roles.decorator'

@Controller('backup')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
export class HerbExportController {
  constructor(private readonly herbExportService: HerbExportService) {}

  @Get()
  async downloadBackup(@Res() res: express.Response) {
    const buffer = await this.herbExportService.generateDatabaseBackup()

    // Formatear la fecha actual para el nombre del archivo de backup
    const dateStr = new Date().toISOString().split('T')[0]
    const fileName = `backup_botanica_${dateStr}.xlsx`

    // Configurar cabeceras HTTP para descarga de archivos Excel (OpenXML)
    res.status(HttpStatus.OK).set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length
    })

    // Enviar el buffer finalizado
    res.end(buffer)
  }
}
