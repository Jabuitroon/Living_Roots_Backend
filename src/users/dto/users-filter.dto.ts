import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 10

  @IsString()
  @IsOptional()
  search?: string

  @IsEnum(UserSortField)
  @IsOptional()
  sortBy: UserSortField = UserSortField.CreatedAt

  @IsEnum(SortDirection)
  @IsOptional()
  sortDir: SortDirection = SortDirection.Desc
}
