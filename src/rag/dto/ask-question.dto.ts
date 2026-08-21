import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength
} from 'class-validator'

export class AskQuestionDto {
  @IsString()
  @MinLength(1)
  question!: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number
}
