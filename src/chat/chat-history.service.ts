/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common'
import type {
  IChatRepository,
  UpsertChatPayload,
  ChatEntity,
  ChatSummary
} from './interfaces/chat.interfaces'
import {
  PersistChatDto,
  ChatSummaryResponseDto,
  ChatDetailResponseDto
} from './dto/chat.dto'

export const CHAT_REPOSITORY = 'CHAT_REPOSITORY'

/**
 * ChatHistoryService
 *
 * Single Responsibility: solo maneja la persistencia del historial.
 * No sabe nada de Groq, streaming, ni HTTP.
 *
 * Convive con ChatAiService en el mismo módulo sin colisión.
 */
@Injectable()
export class ChatHistoryService {
  private readonly logger = new Logger(ChatHistoryService.name)

  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository
  ) {}

  // ── Persistir Zustand → PostgreSQL ─────────────────────────────────────────
  // Llamado cuando: logout | timeout inactividad | fin de sesión
  // Responde con la entidad guardada para que el frontend actualice su chatId

  async persistChat(dto: PersistChatDto): Promise<ChatEntity> {
    this.logger.log(
      `Persistiendo chat userId=${dto.userId}, msgs=${dto.messages.length}`
    )

    const normalizedMessages = dto.messages.map((m) => ({
      role: m.role,
      parts: (m.parts ?? [])
        .filter((p) => p.type === 'text')
        .map((p) => ({
          type: 'text' as const,
          text: p.text
        }))
    }))

    const payload: UpsertChatPayload = {
      chatId: dto.chatId,
      userId: dto.userId,
      title: dto.title ?? this.generateTitle(dto.messages),
      lastActiveAt: new Date(dto.lastActiveAt),
      messages: normalizedMessages
    }

    const saved = await this.chatRepository.upsert(payload)
    this.logger.log(`Chat persistido: chat_id=${saved.chat_id}`)
    return saved
  }

  // ── Historial del usuario (sidebar) ────────────────────────────────────────
  async getUserChats(userId: string): Promise<ChatSummary[]> {
    return this.chatRepository.findAllByUser(userId)
  }

  // ── Detalle con mensajes (restaurar contexto) ──────────────────────────────
  async getChatDetail(chatId: string, userId: string): Promise<ChatEntity> {
    const chat = await this.chatRepository.findOneWithMessages(chatId, userId)
    if (!chat) {
      throw new NotFoundException(
        `Chat ${chatId} no encontrado para el usuario ${userId}`
      )
    }
    return chat
  }

  // ── Eliminar ───────────────────────────────────────────────────────────────
  async deleteChat(chatId: string, userId: string): Promise<void> {
    await this.getChatDetail(chatId, userId) // verifica ownership
    await this.chatRepository.remove(chatId, userId)
    this.logger.log(`Chat eliminado: ${chatId}`)
  }

  // ── Renombrar ──────────────────────────────────────────────────────────────
  async renameChat(
    chatId: string,
    userId: string,
    title: string
  ): Promise<ChatEntity> {
    await this.getChatDetail(chatId, userId)
    return this.chatRepository.updateTitle(chatId, userId, title)
  }

  // ── Mappers ────────────────────────────────────────────────────────────────

  toSummaryResponse(chats: ChatSummary[]): ChatSummaryResponseDto[] {
    return chats.map((c) => ({
      chat_id: c.chat_id,
      userId: c.userId,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      lastActiveAt: c.lastActiveAt,
      messageCount: c._count.messages
    }))
  }

  toDetailResponse(chat: ChatEntity): ChatDetailResponseDto {
    return {
      chat_id: chat.chat_id,
      userId: chat.userId,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      lastActiveAt: chat.lastActiveAt,
      messages: (chat.messages ?? []).map((m) => ({
        chatMess_id: m.chatMess_id,
        chatId: m.chatId,
        role: m.role,
        parts: m.parts as any,
        createdAt: m.createdAt
      }))
    }
  }

  // ── Privados ───────────────────────────────────────────────────────────────

  private generateTitle(
    messages: Array<{
      role: string
      parts?: Array<{ text: string }>
    }>
  ): string {
    const firstUser = messages.find((m) => m.role === 'user')

    const text = firstUser?.parts?.[0]?.text ?? ''

    if (!text.trim()) return 'Nueva consulta'

    return text.length > 60 ? `${text.substring(0, 57)}...` : text
  }
}
