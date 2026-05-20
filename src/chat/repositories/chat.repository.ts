/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import {
  IChatRepository,
  UpsertChatPayload,
  ChatEntity,
  ChatSummary
} from '../interfaces/chat.interfaces'
import { Prisma } from '../../generated/prisma/client'
/**
 * ChatRepository
 *
 * Single Responsibility: solo habla con Prisma.
 * Dependency Inversion: implementa IChatRepository; el servicio depende
 * de la abstracción, no de esta clase concreta.
 */
@Injectable()
export class ChatRepository implements IChatRepository {
  private readonly logger = new Logger(ChatRepository.name)

  constructor(private readonly prisma: PrismaService) {}

  // ── Upsert ─────────────────────────────────────────────────────────────────
  // Crea el chat si no existe; si existe, actualiza metadata y agrega mensajes.
  // Evita duplicados: borra los mensajes previos y los re-inserta en orden.
  async upsert(payload: UpsertChatPayload): Promise<ChatEntity> {
    const { chatId, userId, title, lastActiveAt, messages } = payload

    this.logger.debug(`Upserting chat for user ${userId}, chatId=${chatId}`)

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear o actualizar cabecera del chat
      const chat = await tx.chat.upsert({
        where: { chat_id: chatId ?? '__nonexistent__' },
        update: {
          title: title ?? undefined,
          lastActiveAt: new Date(lastActiveAt)
        },
        create: {
          userId,
          title: title ?? null,
          lastActiveAt: new Date(lastActiveAt)
        }
      })

      // 2. Reemplazar mensajes: limpieza + inserción ordenada
      //    Evita duplicar mensajes en reenvíos parciales.
      await tx.chatMessage.deleteMany({ where: { chatId: chat.chat_id } })

      await tx.chatMessage.createMany({
        data: messages.map((m) => ({
          chatId: chat.chat_id,
          role: m.role,
          parts: m.parts as unknown as Prisma.InputJsonValue
        }))
      })

      // 3. Devolver entidad completa con mensajes
      return tx.chat.findUniqueOrThrow({
        where: { chat_id: chat.chat_id },
        include: {
          messages: { orderBy: { createdAt: 'asc' } }
        }
      }) as unknown as ChatEntity
    })
  }

  // ── Find All (resumen sin mensajes) ────────────────────────────────────────
  async findAllByUser(userId: string): Promise<ChatSummary[]> {
    const chats = await this.prisma.chat.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
      include: { _count: { select: { messages: true } } }
    })

    return chats as unknown as ChatSummary[]
  }

  // ── Find One con mensajes ──────────────────────────────────────────────────
  async findOneWithMessages(
    chatId: string,
    userId: string
  ): Promise<ChatEntity | null> {
    return this.prisma.chat.findFirst({
      where: { chat_id: chatId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    }) as unknown as ChatEntity | null
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async remove(chatId: string, userId: string): Promise<void> {
    // Valida ownership antes de borrar (onDelete Cascade maneja ChatMessage)
    await this.prisma.chat.deleteMany({
      where: { chat_id: chatId, userId }
    })
  }

  // ── Update Title ───────────────────────────────────────────────────────────
  async updateTitle(
    chatId: string,
    userId: string,
    title: string
  ): Promise<ChatEntity> {
    // Primero verificamos ownership
    await this.prisma.chat.findFirstOrThrow({
      where: { chat_id: chatId, userId }
    })

    return this.prisma.chat.update({
      where: { chat_id: chatId },
      data: { title },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    }) as unknown as ChatEntity
  }
}
