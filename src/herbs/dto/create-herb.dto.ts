/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  IsString,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength
} from 'class-validator'
import { Transform } from 'class-transformer'
export class CreateHerbDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description!: string

  @IsString()
  @MinLength(1)
  @IsUrl()
  img!: string // URL o base64 temporal

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => value || undefined)
  cultivator?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(({ value }) => value || undefined)
  important?: string
}
