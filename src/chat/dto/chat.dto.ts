// dto/chat.dto.ts
import { IsString, IsIn, IsOptional, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class ChatMessageDto {
  @IsOptional()
  @IsString()
  id?: string // useChat envía id por mensaje

  @IsIn(['user', 'assistant', 'system'])
  role!: 'user' | 'assistant' | 'system'

  @IsOptional()
  @IsString()
  content?: string

  @IsOptional()
  parts?: { type: 'text'; text: string }[]
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
