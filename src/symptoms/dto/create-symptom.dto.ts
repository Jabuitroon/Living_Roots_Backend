/* eslint-disable @typescript-eslint/no-unsafe-return */
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class AddSymptomDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => value || undefined)
  description?: string

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  parts_plant!: string

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  prepare!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value || undefined)
  apply!: string
}
