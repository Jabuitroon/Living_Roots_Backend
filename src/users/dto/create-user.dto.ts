import {
  IsString,
  MinLength,
  IsEmail,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsPhoneNumber,
  IsUrl
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { UserRole } from '../../generated/prisma/client'

export class CreateUserDto {
  @ApiProperty({ example: 'Juanes', description: 'Nombre del usuario' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string

  @ApiProperty({ example: 'Buitrago', description: 'Apellido del usuario' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName!: string

  @ApiProperty({ example: 'admin@example.com', description: 'Correo electrónico único' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: 'StrongPassword123!', description: 'Contraseña (mínimo 8 caracteres)' })
  @IsString()
  @MinLength(8)
  password!: string

  @ApiPropertyOptional({ example: '+573001234567', description: 'Número de teléfono con código de país' })
  @IsOptional()
  @IsPhoneNumber()
  @MinLength(10)
  phone?: string

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', description: 'URL de la foto de perfil' })
  @IsOptional()
  @IsString()
  @IsUrl()
  @MinLength(8)
  avatar?: string

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.client, description: 'Rol del usuario' })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole
}