import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import {
  IChatRepository,
  ChatEntity,
  ChatSummary,
  ChatSortBy,
  CreateChatPayload,
  AppendMessagesPayload,
  ListChatsParams,
  PaginatedResult
} from '../interfaces/chat.interfaces'
import { Prisma } from '../../generated/prisma/client'

/**
 * ChatRepository
 *
 * Single Responsibility: solo habla con Prisma.
 * Dependency Inversion: implementa IChatRepository.
 *
 * SEGURIDAD (HU-10, táctica Authorize actors):
 * TODA operación sobre un chat existente lleva `userId` en el `where`.
 * Nunca se resuelve un chat solo por `chat_id`.
 */

@Injectable()
export class ChatRepository implements IChatRepository {
  private readonly logger = new Logger(ChatRepository.name)

  /** Proyección compartida: no expone userId ni el JSON crudo sin normalizar. */
  private readonly messageSelector = {
    chatMess_id: true,
    chatId: true,
    role: true,
    parts: true,
    clientMessageId: true,
    createdAt: true
  } satisfies Prisma.ChatMessageSelect

  constructor(private readonly prisma: PrismaService) {}

  // ── Create (primer guardado manual) ────────────────────────────────────────
  async create(payload: CreateChatPayload): Promise<ChatEntity> {
    const { userId, title, messages } = payload

    this.logger.debug(`Creando chat para user=${userId}`)

    const chat = await this.prisma.chat.create({
      data: {
        userId,
        title: title ?? null,
        messages: {
          create: messages.map((m) => ({
            role: m.role,
            parts: m.parts as unknown as Prisma.InputJsonValue,
            clientMessageId: m.clientMessageId ?? null
          }))
        }
      },
      include: {
        messages: {
          select: this.messageSelector,
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    return chat as unknown as ChatEntity
  }

  // ── Append incremental (guardados automáticos) ─────────────────────────────
  // O(1) por turno: inserta solo los mensajes nuevos.
  // `skipDuplicates` + @@unique([chatId, clientMessageId]) => idempotente.
  async appendMessages(payload: AppendMessagesPayload): Promise<ChatEntity> {
    const { chatId, userId, messages } = payload

    return this.prisma.$transaction(async (tx) => {
      // 1. Ownership: el chat debe existir Y pertenecer a este usuario.
      const owned = await tx.chat.findFirst({
        where: { chat_id: chatId, userId },
        select: { chat_id: true }
      })

      if (!owned) {
        throw new NotFoundException(`Chat ${chatId} no encontrado`)
      }

      // 2. Insertar solo lo nuevo.
      await tx.chatMessage.createMany({
        data: messages.map((m) => ({
          chatId,
          role: m.role,
          parts: m.parts as unknown as Prisma.InputJsonValue,
          clientMessageId: m.clientMessageId ?? null
        })),
        skipDuplicates: true
      })

      // 3. Refrescar metadata de actividad.
      // await tx.chat.update({
      //   where: { chat_id: chatId },
      //   data: { lastActiveAt }
      // })

      return tx.chat.findUniqueOrThrow({
        where: { chat_id: chatId },
        include: {
          messages: {
            select: this.messageSelector,
            orderBy: { createdAt: 'asc' }
          }
        }
      }) as unknown as ChatEntity
    })
  }

  // Historial paginado (HU-10)
  async findAllByUser(
    userId: string,
    params: ListChatsParams
  ): Promise<PaginatedResult<ChatSummary>> {
    const { page, limit, sortBy } = params
    const where: Prisma.ChatWhereInput = { userId }

    const [chats, total] = await this.prisma.$transaction([
      this.prisma.chat.findMany({
        where,
        orderBy: this.buildOrderBy(sortBy),
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { messages: true } } }
      }),
      this.prisma.chat.count({ where })
    ])

    return { data: chats as unknown as ChatSummary[], total }
  }

  // ── Detalle (ownership-scoped) ─────────────────────────────────────────────
  async findOneWithMessages(
    chatId: string,
    userId: string
  ): Promise<ChatEntity | null> {
    const chat = await this.prisma.chat.findFirst({
      where: { chat_id: chatId, userId },
      include: {
        messages: {
          select: this.messageSelector,
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    return chat as unknown as ChatEntity | null
  }

  // ── Existencia (chequeo de ownership sin traer mensajes) ───────────────────
  async existsForUser(chatId: string, userId: string): Promise<boolean> {
    const found = await this.prisma.chat.findFirst({
      where: { chat_id: chatId, userId },
      select: { chat_id: true }
    })
    return found !== null
  }

  // ── Delete (ownership-scoped) ──────────────────────────────────────────────
  async remove(chatId: string, userId: string): Promise<void> {
    const { count } = await this.prisma.chat.deleteMany({
      where: { chat_id: chatId, userId }
    })

    if (count === 0) {
      throw new NotFoundException(`Chat ${chatId} no encontrado`)
    }
  }

  // ── Update title (ownership-scoped, una sola query) ────────────────────────
  async updateTitle(
    chatId: string,
    userId: string,
    title: string
  ): Promise<ChatEntity> {
    // updateMany permite filtrar por userId (update solo acepta campos únicos).
    const { count } = await this.prisma.chat.updateMany({
      where: { chat_id: chatId, userId },
      data: { title }
    })

    if (count === 0) {
      throw new NotFoundException(`Chat ${chatId} no encontrado`)
    }

    return this.prisma.chat.findUniqueOrThrow({
      where: { chat_id: chatId },
      include: {
        messages: {
          select: this.messageSelector,
          orderBy: { createdAt: 'asc' }
        }
      }
    }) as unknown as ChatEntity
  }

  // ── Privados ───────────────────────────────────────────────────────────────

  private buildOrderBy(
    sortBy: ChatSortBy
  ): Prisma.ChatOrderByWithRelationInput {
    switch (sortBy) {
      case ChatSortBy.TITLE:
        return { title: 'asc' }
      case ChatSortBy.CREATED_AT:
        return { createdAt: 'desc' }
      case ChatSortBy.LAST_ACTIVE:
      default:
        return { lastActiveAt: 'desc' }
    }
  }
}
