import { IsString, MinLength, IsEmail, IsNotEmpty } from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterDto {
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

  @ApiProperty({ example: 'juanes@example.com', description: 'Correo electrónico único' })
  @IsNotEmpty({ message: 'El email es requerido' })
  @IsEmail({}, { message: 'El formato del email no es válido' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email!: string

  @ApiProperty({ example: 'StrongPassword123!', description: 'Contraseña (mínimo 8 caracteres)' })
  @IsString()
  @MinLength(8)
  password!: string
}
