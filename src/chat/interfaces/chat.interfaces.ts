// ─────────────────────────────────────────────────────────────
// Compatibilidad con AI SDK v6 (UIMessage)
// ─────────────────────────────────────────────────────────────

export interface MessagePart {
  type: 'text'
  text: string
}

export interface ChatMessageEntity {
  chatMess_id: string
  chatId: string

  role: 'user' | 'assistant' | 'system'

  parts: MessagePart[]

  createdAt: Date
}

export interface ChatEntity {
  chat_id: string

  userId: string

  title: string | null

  createdAt: Date
  updatedAt: Date
  lastActiveAt: Date

  messages?: ChatMessageEntity[]
}

export type ChatSummary = Omit<ChatEntity, 'messages'> & {
  _count: {
    messages: number
  }
}

// ─────────────────────────────────────────────────────────────
// Repository Contract
// ─────────────────────────────────────────────────────────────

export interface UpsertChatPayload {
  chatId?: string

  userId: string

  title?: string

  lastActiveAt: Date

  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    parts: MessagePart[]
  }>
}

export interface IChatRepository {
  upsert(payload: UpsertChatPayload): Promise<ChatEntity>

  findAllByUser(userId: string): Promise<ChatSummary[]>

  findOneWithMessages(
    chatId: string,
    userId: string
  ): Promise<ChatEntity | null>

  remove(chatId: string, userId: string): Promise<void>

  updateTitle(
    chatId: string,
    userId: string,
    title: string
  ): Promise<ChatEntity>
}

// ─────────────────────────────────────────────────────────────
// Service Contract
// ─────────────────────────────────────────────────────────────

export interface IChatService {
  persistChat(payload: UpsertChatPayload): Promise<ChatEntity>

  getUserChats(userId: string): Promise<ChatSummary[]>

  getChatDetail(chatId: string, userId: string): Promise<ChatEntity>

  deleteChat(chatId: string, userId: string): Promise<void>

  renameChat(chatId: string, userId: string, title: string): Promise<ChatEntity>
}
