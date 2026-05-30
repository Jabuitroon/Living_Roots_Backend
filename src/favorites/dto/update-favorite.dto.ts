import { PartialType } from '@nestjs/swagger'
import { ToggleFavoriteDto } from './toggle-favorite'

export class UpdateFavoriteDto extends PartialType(ToggleFavoriteDto) {}
