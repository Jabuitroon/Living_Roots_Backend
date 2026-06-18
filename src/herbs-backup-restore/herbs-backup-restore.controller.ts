import {
  Controller,
  Post,
  Get,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import express from 'express'
import { BackupRestoreService } from './herbs-backup-restore.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Role } from '../auth/enums'
import { Roles } from '../auth/decorators/roles.decorator'
import 'multer'

@Controller('herbs')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
export class BackupRestoreController {
  constructor(private readonly backupRestoreService: BackupRestoreService) {}

  @Get('backup')
  @HttpCode(HttpStatus.OK)
  async exportBackup(@Res() res: express.Response) {
    const buffer = await this.backupRestoreService.exportDatabase()
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=living-roots-backup.xlsx'
    })
    res.send(buffer)
  }

  @Post('restore')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('backup'))
  async restoreDatabase(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }),
          new FileTypeValidator({
            fileType:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          })
        ]
      })
    )
    file: Express.Multer.File
  ) {
    // 💡 Buffer.from() re-tipa el buffer al estándar moderno de Node.js
    const safeBuffer = Buffer.from(file.buffer)

    return await this.backupRestoreService.restoreDatabase(safeBuffer)
  }
}
