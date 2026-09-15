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
  clientMessageId: string | null
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
  _count: { messages: number }
}

// Ordenamiento y paginación
export enum ChatSortBy {
  TITLE = 'title',
  LAST_ACTIVE = 'lastActiveAt',
  CREATED_AT = 'createdAt'
}

export interface ListChatsParams {
  page: number
  limit: number
  sortBy: ChatSortBy
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
}

// Payloads
export interface NormalizedMessage {
  role: 'user' | 'assistant' | 'system'
  parts: MessagePart[]
  clientMessageId?: string
}

// Primer guardado manual: crea el chat con todo su contenido.
export interface CreateChatPayload {
  userId: string
  title?: string
  lastActiveAt: Date
  messages: NormalizedMessage[]
}

/** Guardados automáticos posteriores: solo agrega los mensajes nuevos. */
export interface AppendMessagesPayload {
  chatId: string
  userId: string
  lastActiveAt: Date
  messages: NormalizedMessage[]
}

// Repository Contract
export interface IChatRepository {
  create(payload: CreateChatPayload): Promise<ChatEntity>

  appendMessages(payload: AppendMessagesPayload): Promise<ChatEntity>

  findAllByUser(
    userId: string,
    params: ListChatsParams
  ): Promise<PaginatedResult<ChatSummary>>

  findOneWithMessages(
    chatId: string,
    userId: string
  ): Promise<ChatEntity | null>

  existsForUser(chatId: string, userId: string): Promise<boolean>

  remove(chatId: string, userId: string): Promise<void>

  updateTitle(
    chatId: string,
    userId: string,
    title: string
  ): Promise<ChatEntity>
}
