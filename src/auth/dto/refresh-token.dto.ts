import { IsNotEmpty, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RefreshTokenDto {
  @ApiProperty({ description: 'Token de refresco válido para obtener un nuevo access_token' })
  @IsString()
  @IsNotEmpty()
  refresh_token!: string
}