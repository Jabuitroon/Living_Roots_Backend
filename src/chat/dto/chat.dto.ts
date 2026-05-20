// dto/chat.dto.ts
import {
  IsString,
  IsIn,
  IsOptional,
  ValidateNested,
  IsDateString,
  IsArray,
  IsNotEmpty,
  ArrayMinSize
} from 'class-validator'

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

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

// ─── Persist Chat (Zustand → PostgreSQL) ─────────────────────────────────────
// Called on: logout | inactivity timeout | session end

export class PersistChatDto {
  @ApiPropertyOptional({
    description: 'Existing chat ID for upsert (from Zustand state)',
    example: 'clxyz...'
  })
  @IsOptional()
  @IsString()
  chatId?: string

  @ApiProperty({ description: 'Auth user ID', example: 'user_abc123' })
  @IsString()
  @IsNotEmpty()
  userId!: string

  @ApiPropertyOptional({
    description: 'Auto-generated or user-defined title',
    example: 'About SOLID principles'
  })
  @IsOptional()
  @IsString()
  title?: string

  @ApiProperty({
    description: 'Timestamp of last interaction (from Zustand)',
    example: '2024-01-15T10:30:00.000Z'
  })
  @IsDateString()
  lastActiveAt!: string

  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[]
}

// ─── Rename Chat ──────────────────────────────────────────────────────────────

export class UpdateChatTitleDto {
  @ApiProperty({ example: 'Mi conversación sobre NestJS' })
  @IsString()
  @IsNotEmpty()
  title!: string
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export class ChatMessageResponseDto {
  chatMess_id!: string
  chatId!: string
  role!: string
  parts!: { type: 'text'; text: string }[]
  createdAt!: Date
}

export class ChatSummaryResponseDto {
  chat_id!: string
  userId!: string
  title!: string | null
  createdAt!: Date
  updatedAt!: Date
  lastActiveAt!: Date
  messageCount!: number
}

export class ChatDetailResponseDto {
  chat_id!: string
  userId!: string
  title!: string | null
  createdAt!: Date
  updatedAt!: Date
  lastActiveAt!: Date
  messages!: ChatMessageResponseDto[]
}
