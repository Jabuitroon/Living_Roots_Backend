import { PartialType } from '@nestjs/swagger';
import { CreateHerbsBackupRestoreDto } from './create-herbs-backup-restore.dto';

export class UpdateHerbsBackupRestoreDto extends PartialType(CreateHerbsBackupRestoreDto) {}
