/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  IsString,
  MinLength,
  IsEmail,
  IsNotEmpty,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../generated/prisma/enums';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName!: string;

  @IsNotEmpty({ message: 'El email es requerido' })
  @IsEmail({}, { message: 'El formato del email no es válido' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase()) // Limpia espacios y pasa a minúsculas
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(UserRole) // Valida que el valor coincida con el Enum de la DB entre admin y cliente
  @IsOptional() // Default(user) en Prisma
  role?: UserRole;
}
