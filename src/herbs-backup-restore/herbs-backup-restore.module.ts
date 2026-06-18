import { Module } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { BackupRestoreController } from './herbs-backup-restore.controller'
import { BackupRestoreService } from './herbs-backup-restore.service'
import { PrismaService } from '../prisma/prisma.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'

@Module({
  controllers: [BackupRestoreController],
  providers: [BackupRestoreService, PrismaService, AuthGuard, RolesGuard, Reflector]
})
export class HerbsBackupRestoreModule {}
