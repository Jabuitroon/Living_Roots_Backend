import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'El email es requerido' })
  @IsEmail({}, { message: 'El formato del email no es válido' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase()) // Limpia espacios y pasa a minúsculas
  email!: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  // Quitamos el trim de la contraseña por integridad de caracteres
  password!: string;
}
