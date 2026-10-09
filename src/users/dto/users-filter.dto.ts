import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export enum UserSortField {
  Name = 'name',
  LastName = 'lastName',
  Email = 'email',
  Role = 'role',
  CreatedAt = 'createdAt'
}

export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export class UsersFilterDto {
  @ApiPropertyOptional({ example: 1, description: 'Número de página para paginación', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1

  @ApiPropertyOptional({ example: 10, description: 'Cantidad de registros por página', minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 10

  @ApiPropertyOptional({ example: 'Julio', description: 'Término de búsqueda por nombre, apellido o email' })
  @IsString()
  @IsOptional()
  search?: string

  @ApiPropertyOptional({ enum: UserSortField, example: UserSortField.CreatedAt, description: 'Campo por el cual ordenar' })
  @IsEnum(UserSortField)
  @IsOptional()
  sortBy: UserSortField = UserSortField.CreatedAt

  @ApiPropertyOptional({ enum: SortDirection, example: SortDirection.Desc, description: 'Dirección del ordenamiento (asc o desc)' })
  @IsEnum(SortDirection)
  @IsOptional()
  sortDir: SortDirection = SortDirection.Desc
}