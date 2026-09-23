import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common'
import type {
  IChatRepository,
  ChatEntity,
  ChatSummary,
  MessagePart,
  NormalizedMessage,
  ListChatsParams,
  PaginatedResult
} from './interfaces/chat.interfaces'
import { ChatSortBy } from './interfaces/chat.interfaces'
import {
  PersistChatDto,
  AppendMessagesDto,
  ListChatsDto,
  ChatSummaryResponseDto,
  ChatDetailResponseDto,
  PaginatedChatsResponseDto,
  ChatMessageDto
} from './dto/chat.dto'

export const CHAT_REPOSITORY = 'CHAT_REPOSITORY'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const MAX_TITLE_LENGTH = 60

/**
 * ChatHistoryService
 *
 * Single Responsibility: persistencia y consulta del historial.
 * No sabe nada de Groq, streaming ni HTTP.
 *
 * SEGURIDAD: `userId` SIEMPRE llega desde el JWT (@ActiveUser en el
 * controlador). Ningún método lo acepta desde el body o los params.
 */
@Injectable()
export class ChatHistoryService {
  private readonly logger = new Logger(ChatHistoryService.name)

  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository
  ) {}

  // ── Primer guardado manual ─────────────────────────────────────────────────
  async persistChat(userId: string, dto: PersistChatDto): Promise<ChatEntity> {
    this.logger.log(`Creando chat user=${userId} msgs=${dto.messages.length}`)

    const messages = this.normalizeMessages(dto.messages)

    const chat = await this.chatRepository.create({
      userId,
      title: dto.title ?? this.deriveTitle(messages),
      messages
    })

    this.logger.log(`Chat creado: chat_id=${chat.chat_id}`)
    return chat
  }

  // ── Guardado automático incremental ────────────────────────────────────────
  async appendMessages(
    chatId: string,
    userId: string,
    dto: AppendMessagesDto
  ): Promise<ChatEntity> {
    return this.chatRepository.appendMessages({
      chatId,
      userId,
      messages: this.normalizeMessages(dto.messages)
    })
  }

  // ── Historial paginado ─────────────────────────────────────────────────────
  async getUserChats(
    userId: string,
    query: ListChatsDto
  ): Promise<PaginatedResult<ChatSummary> & { params: ListChatsParams }> {
    const params: ListChatsParams = {
      page: query.page ?? DEFAULT_PAGE,
      limit: query.limit ?? DEFAULT_LIMIT,
      sortBy: query.sortBy ?? ChatSortBy.LAST_ACTIVE
    }

    const result = await this.chatRepository.findAllByUser(userId, params)
    return { ...result, params }
  }

  // ── Detalle ────────────────────────────────────────────────────────────────
  async getChatDetail(chatId: string, userId: string): Promise<ChatEntity> {
    const chat = await this.chatRepository.findOneWithMessages(chatId, userId)

    if (!chat) {
      // Mismo 404 exista o no: no se revela la existencia de chats ajenos.
      throw new NotFoundException(`Chat ${chatId} no encontrado`)
    }

    return chat
  }

  // ── Eliminar ───────────────────────────────────────────────────────────────
  async deleteChat(chatId: string, userId: string): Promise<void> {
    await this.chatRepository.remove(chatId, userId) // lanza 404 si no es suyo
    this.logger.log(`Chat eliminado: ${chatId}`)
  }

  // ── Renombrar ──────────────────────────────────────────────────────────────
  async renameChat(
    chatId: string,
    userId: string,
    title: string
  ): Promise<ChatEntity> {
    return this.chatRepository.updateTitle(chatId, userId, title)
  }

  // ── Mappers ────────────────────────────────────────────────────────────────

  toPaginatedResponse(
    result: PaginatedResult<ChatSummary> & { params: ListChatsParams }
  ): PaginatedChatsResponseDto {
    const { data, total, params } = result
    const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit)

    return {
      data: data.map((c) => this.toSummary(c)),
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages,
        hasNextPage: params.page < totalPages
      }
    }
  }

  toDetailResponse(chat: ChatEntity): ChatDetailResponseDto {
    return {
      chat_id: chat.chat_id,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messages: (chat.messages ?? []).map((m) => ({
        chatMess_id: m.chatMess_id,
        chatId: m.chatId,
        role: m.role,
        parts: this.toMessageParts(m.parts),
        createdAt: m.createdAt
      }))
    }
  }

  // ── Privados ───────────────────────────────────────────────────────────────

  private toSummary(chat: ChatSummary): ChatSummaryResponseDto {
    return {
      chat_id: chat.chat_id,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat._count.messages
    }
  }

  /** Descarta partes no textuales y conserva el id de cliente. */
  private normalizeMessages(messages: ChatMessageDto[]): NormalizedMessage[] {
    return messages.map((m) => ({
      role: m.role,
      parts: (m.parts ?? [])
        .filter((p) => p.type === 'text')
        .map((p) => ({ type: 'text' as const, text: p.text })),
      clientMessageId: m.id
    }))
  }

  /** Normaliza el JSON de Prisma a MessagePart[] sin `any`. */
  private toMessageParts(raw: unknown): MessagePart[] {
    if (!Array.isArray(raw)) return []

    return raw.flatMap((part): MessagePart[] => {
      if (
        typeof part === 'object' &&
        part !== null &&
        'type' in part &&
        'text' in part &&
        (part as { type: unknown }).type === 'text' &&
        typeof (part as { text: unknown }).text === 'string'
      ) {
        return [{ type: 'text', text: (part as { text: string }).text }]
      }
      return []
    })
  }

  private deriveTitle(messages: NormalizedMessage[]): string {
    const firstUser = messages.find((m) => m.role === 'user')
    const text = firstUser?.parts?.[0]?.text?.trim() ?? ''

    if (!text) return 'Nueva consulta'

    return text.length > MAX_TITLE_LENGTH
      ? `${text.slice(0, MAX_TITLE_LENGTH - 3)}...`
      : text
  }
}
