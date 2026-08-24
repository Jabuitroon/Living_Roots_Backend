import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  IsIn,
  IsArray,
  ValidateNested,
  ArrayMinSize
} from 'class-validator'

import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'

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

export class ChatMessageDto {
  @IsOptional()
  @IsString()
  id?: string // useChat envía id por mensaje

  @ApiProperty({ enum: ['user', 'assistant', 'system'], example: 'user' })
  @IsIn(['user', 'assistant', 'system'])
  role!: 'user' | 'assistant' | 'system'

  @IsOptional()
  @IsString()
  content?: string

  @IsArray()
  @ArrayMinSize(1)
  @IsOptional()
  parts!: { type: 'text'; text: string }[]
}

export class CreateChatDto {
  @IsOptional()
  @IsString()
  id?: string // useChat envía id del chat

  @IsOptional()
  @IsString()
  trigger?: string // useChat envía trigger: "submit" | etc.

  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[]
}
