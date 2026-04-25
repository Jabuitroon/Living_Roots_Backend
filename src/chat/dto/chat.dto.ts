import { IsArray, IsString, IsNotEmpty } from 'class-validator'

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  role!: 'system' | 'user' | 'assistant'

  @IsString()
  @IsNotEmpty()
  content!: string
}

export class CreateChatDto {
  @IsArray()
  messages!: ChatMessageDto[]
}
