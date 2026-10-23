import { IsOptional, IsString } from 'class-validator'
import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum } from 'class-validator'
import { CulturalCategory } from '@app/generated/prisma/client'

export class TreatmentCategoriesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(CulturalCategory, { each: true })
  categories!: CulturalCategory[]
}

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
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(TreatmentCategoriesDto, { each: true })
  category?: CulturalCategory[]
}
