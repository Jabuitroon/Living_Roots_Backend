import { PartialType } from '@nestjs/swagger'
import { AddSymptomDto } from './create-symptom.dto'

export class UpdateSymptomDto extends PartialType(AddSymptomDto) {}
