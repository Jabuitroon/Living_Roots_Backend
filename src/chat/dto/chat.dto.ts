import {
  IsString,
  IsIn,
  IsOptional,
  ValidateNested,
  IsArray,
  IsNotEmpty,
  ArrayMinSize,
  IsInt,
  Min,
  Max,
  IsEnum,
  MaxLength
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ChatSortBy } from '../interfaces/chat.interfaces'

export class MessagePartDto {
  @ApiProperty({ enum: ['text'], example: 'text' })
  @IsIn(['text'])
  type!: 'text'

  @ApiProperty({ example: 'Tengo dolor de cabeza desde ayer' })
  @IsString()
  text!: string
}

export class ChatMessageDto {
  @ApiPropertyOptional({
    description: 'ID del mensaje generado por el AI SDK (idempotencia)',
    example: 'msg-a1b2c3'
  })
  @IsOptional()
  @IsString()
  id?: string

  @ApiProperty({ enum: ['user', 'assistant', 'system'], example: 'user' })
  @IsIn(['user', 'assistant', 'system'])
  role!: 'user' | 'assistant' | 'system'

  @IsOptional()
  @IsString()
  content?: string

  @ApiPropertyOptional({ type: [MessagePartDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MessagePartDto)
  parts?: MessagePartDto[]
}

export class CreateChatDto {
  @IsOptional()
  @IsString()
  id?: string

  @IsOptional()
  @IsString()
  trigger?: string

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[]
}

// Primer guardado manual
export class PersistChatDto {
  @ApiPropertyOptional({
    description: 'Título del chat. Si se omite, se deriva del primer mensaje.',
    example: 'Dolor de cabeza y plantas para la fiebre'
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string

  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[]
}

// Guardado automático incremental
export class AppendMessagesDto {
  @ApiProperty({
    type: [ChatMessageDto],
    description: 'Solo los mensajes nuevos del último turno.'
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[]
}

// Renombrar chat
export class UpdateChatTitleDto {
  @ApiProperty({ example: 'Mi consulta sobre la manzanilla' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string
}

//Query del historial (HU-10: paginación + ordenamiento)
export class ListChatsDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10

  @ApiPropertyOptional({
    enum: ChatSortBy,
    default: ChatSortBy.LAST_ACTIVE,
    description:
      'lastActiveAt = actividad más reciente | createdAt = creación más reciente | title = A-Z'
  })
  @IsOptional()
  @IsEnum(ChatSortBy)
  sortBy?: ChatSortBy = ChatSortBy.LAST_ACTIVE
}

export class ChatMessageResponseDto {
  chatMess_id!: string
  chatId!: string
  role!: string
  parts!: MessagePartDto[]
  createdAt!: Date
}

export class ChatSummaryResponseDto {
  chat_id!: string
  title!: string | null
  createdAt!: Date
  updatedAt!: Date
  messageCount!: number
}

export class PaginationMetaDto {
  total!: number
  page!: number
  limit!: number
  totalPages!: number
  hasNextPage!: boolean
}

export class PaginatedChatsResponseDto {
  @ApiProperty({ type: [ChatSummaryResponseDto] })
  data!: ChatSummaryResponseDto[]

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto
}

export class ChatDetailResponseDto {
  chat_id!: string
  title!: string | null
  createdAt!: Date
  updatedAt!: Date
  messages!: ChatMessageResponseDto[]
}
