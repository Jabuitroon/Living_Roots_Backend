import { IsEnum, IsString, IsNotEmpty } from 'class-validator'

export enum FavoriteAction {
  ADD = 'ADD',
  REMOVE = 'REMOVE'
}

export class ToggleFavoriteDto {
  @IsString()
  @IsNotEmpty()
  plantId!: string

  @IsEnum(FavoriteAction, {
    message: 'La acción debe ser un valor válido: ADD o REMOVE'
  })
  @IsNotEmpty()
  action!: FavoriteAction
}
