import { PartialType, OmitType } from '@nestjs/mapped-types'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional } from 'class-validator'
import type { UserLanguage } from '../../generated/prisma/client'
import { CreateUserDto } from './create-user.dto'

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['role'] as const)
) {
  @ApiPropertyOptional({ enum: ['ES', 'NSY'], default: 'ES' })
  @IsOptional()
  @IsIn(['ES', 'NSY'])
  preferredLanguage?: UserLanguage
}
