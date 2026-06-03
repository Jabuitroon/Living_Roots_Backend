/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/stories/dto/story-query.dto.ts
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  CulturalCategory,
  StoryStatus
} from '../../../src/generated/prisma/enums'

export class StoryQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10

  @ApiPropertyOptional({ enum: CulturalCategory })
  @IsOptional()
  @IsEnum(CulturalCategory)
  category?: CulturalCategory

  @ApiPropertyOptional({ enum: StoryStatus })
  @IsOptional()
  @IsEnum(StoryStatus)
  status?: StoryStatus

  @ApiPropertyOptional({ description: 'Búsqueda por texto en título' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string
}
