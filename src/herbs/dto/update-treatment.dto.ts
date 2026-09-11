import { IsOptional, IsString } from 'class-validator'

export class UpdateTreatmentDto {
  @IsOptional() @IsString() partsplant?: string
  @IsOptional() @IsString() prepare?: string
  @IsOptional() @IsString() apply?: string
}
