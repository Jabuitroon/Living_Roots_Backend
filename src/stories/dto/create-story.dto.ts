/* eslint-disable @typescript-eslint/no-unsafe-argument */
// src/stories/dto/create-story.dto.ts
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsArray,
  ArrayMaxSize,
  Matches
} from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CulturalCategory } from '../../../src/generated/prisma/enums'

// Sanitizador XSS inline: elimina tags HTML peligrosos sin librerías extra.
// Para producción con contenido enriquecido, reemplaza por 'sanitize-html'.
const stripDangerousTags = (value: string): string => {
  if (typeof value !== 'string') return value
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
}

const normalizeTag = (tag: string): string =>
  tag.toLowerCase().trim().replace(/\s+/g, '-')

export class CreateStoryDto {
  @ApiProperty({ example: 'El origen del río sagrado', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  @Transform(({ value }) => stripDangerousTags(value))
  title!: string

  @ApiProperty({
    description: 'Cuerpo del relato (texto plano o HTML sanitizado)',
    minLength: 50
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(50)
  @MaxLength(50000)
  @Transform(({ value }) => stripDangerousTags(value))
  body!: string

  @ApiProperty({ enum: CulturalCategory })
  @IsEnum(CulturalCategory)
  category!: CulturalCategory

  @ApiPropertyOptional({
    type: [String],
    description: 'Palabras clave (máx. 10)',
    example: ['cosmovisión', 'agua', 'origen']
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s-]+$/, {
    each: true,
    message: 'Las etiquetas solo admiten letras, números, espacios y guiones.'
  })
  @Transform(({ value }) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    Array.isArray(value) ? value.map(normalizeTag) : value
  )
  tags?: string[]

  @ApiPropertyOptional({ description: 'URL de imagen de portada' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => stripDangerousTags(value))
  coverImage?: string
}
