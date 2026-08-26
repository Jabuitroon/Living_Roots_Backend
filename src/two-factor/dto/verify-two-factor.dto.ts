import { IsBoolean, IsOptional, IsString, Length } from 'class-validator'

export class VerifyTwoFactorDto {
  @IsString()
  @Length(6, 6, { message: 'El código debe tener 6 dígitos' })
  code!: string

  @IsBoolean()
  @IsOptional()
  rememberDevice?: boolean
}
