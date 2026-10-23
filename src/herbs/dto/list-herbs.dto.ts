import { Type } from 'class-transformer'
import { CulturalCategory } from '@app/generated/prisma/client'
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min
} from 'class-validator'

export class ListHerbsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsUUID()
  symptomId?: string

  @IsOptional()
  @IsEnum(CulturalCategory)
  category?: CulturalCategory
}
