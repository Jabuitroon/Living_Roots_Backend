import { IsOptional, IsString } from 'class-validator'
import { IsEnum } from 'class-validator'
import { CulturalCategory } from '@app/generated/prisma/client'

export class UpdateTreatmentDto {
  @IsOptional()
  @IsString()
  partsplant?: string

  @IsOptional()
  @IsString()
  prepare?: string

  @IsOptional()
  @IsString()
  apply?: string

  @IsOptional()
  @IsEnum(CulturalCategory)
  category?: CulturalCategory
}
