import { IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { UserRole } from '../../generated/prisma/client'

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole, example: UserRole.admin, description: 'Nuevo rol del usuario' })
  @IsEnum(UserRole)
  role!: UserRole
}
