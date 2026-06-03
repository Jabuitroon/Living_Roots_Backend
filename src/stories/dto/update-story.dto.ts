// Principio OCP: extendemos sin modificar el DTO base.
import { PartialType } from '@nestjs/mapped-types'
import { CreateStoryDto } from './create-story.dto'

export class UpdateStoryDto extends PartialType(CreateStoryDto) {}
