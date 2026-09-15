import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  Get,
  Delete,
  Patch,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  Logger
} from '@nestjs/common'
import express from 'express'
import { Throttle } from '@nestjs/throttler'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth
} from '@nestjs/swagger'

import { ChatService } from './chat.service'
import { ChatHistoryService } from './chat-history.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { ActiveUser } from '../common/decorators/active-user.decorator'
import { Role } from '../auth/enums'
import type { JwtPayload } from '../auth/interfaces'

import {
  CreateChatDto,
  PersistChatDto,
  AppendMessagesDto,
  ListChatsDto,
  UpdateChatTitleDto,
  ChatDetailResponseDto,
  PaginatedChatsResponseDto
} from './dto/chat.dto'

/**
 * ChatController
 *
 * HU-10 — Táctica Authorize actors (Bass et al., p. 173).
 * El `userId` NUNCA llega por param ni por body: se extrae del JWT con
 * @ActiveUser. Así es imposible construir una petición que apunte al
 * historial de otra cuenta, y el control aplica a nivel de registro
 * individual (cada query del repositorio filtra por userId).
 */

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name)

  constructor(
    private readonly chatService: ChatService,
    private readonly chatHistoryService: ChatHistoryService
  ) {}

  // ── POST /chat/generate ────────────────────────────────────────────────────
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Roles(Role.Client, Role.Admin)
  @Post('generate')
  @ApiOperation({
    summary: 'Streaming con Groq (SSE)',
    description:
      'Recibe messages[] del frontend (useChat) y devuelve chunks vía SSE.'
  })
  @HttpCode(HttpStatus.OK)
  async generateChat(
    @Body() createChatDto: CreateChatDto,
    @Res() res: express.Response
  ) {
    try {
      const stream = await this.chatService.generateResponse(
        createChatDto.messages
      )

      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('x-vercel-ai-ui-message-stream', 'v1')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const messageId = crypto.randomUUID()
      res.write(`data: ${JSON.stringify({ type: 'start', messageId })}\n\n`)

      const textId = crypto.randomUUID()
      res.write(
        `data: ${JSON.stringify({ type: 'text-start', id: textId })}\n\n`
      )

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content ?? ''
        if (content) {
          res.write(
            `data: ${JSON.stringify({
              type: 'text-delta',
              id: textId,
              delta: content
            })}\n\n`
          )
        }
      }

      res.write(`data: ${JSON.stringify({ type: 'text-end', id: textId })}\n\n`)
      res.write(`data: ${JSON.stringify({ type: 'finish' })}\n\n`)
      res.end()
    } catch (error) {
      this.logger.error('Error en stream', error as Error)
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Error al generar la respuesta'
        })
      }
    }
  }

  // ── POST /chat/persist ─────────────────────────────────────────────────────
  // Primer guardado: el usuario pulsa "Guardar". Devuelve el chat_id.
  @Roles(Role.Client, Role.Admin)
  @Post('persist')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Guarda por primera vez el chat en curso (manual)',
    description:
      'Crea el chat con sus mensajes. El frontend guarda el chat_id devuelto ' +
      'y a partir de ahí usa PATCH /chat/:chatId/messages.'
  })
  @ApiResponse({ status: 201, type: ChatDetailResponseDto })
  async persistChat(
    @ActiveUser() user: JwtPayload,
    @Body() dto: PersistChatDto
  ): Promise<ChatDetailResponseDto> {
    const chat = await this.chatHistoryService.persistChat(user.sub, dto)
    return this.chatHistoryService.toDetailResponse(chat)
  }

  // ── GET /chat/history ──────────────────────────────────────────────────────
  // Declarado antes de las rutas con :chatId para que no lo capture el comodín.
  @Roles(Role.Client, Role.Admin)
  @Get('history')
  @ApiOperation({
    summary: 'Historial paginado del usuario autenticado (HU-10)',
    description:
      'Devuelve solo los chats del portador del token. ' +
      'Paginación acotada (limit máx. 50) y ordenamiento configurable.'
  })
  @ApiResponse({ status: 200, type: PaginatedChatsResponseDto })
  async getUserChats(
    @ActiveUser() user: JwtPayload,
    @Query() query: ListChatsDto
  ): Promise<PaginatedChatsResponseDto> {
    const result = await this.chatHistoryService.getUserChats(user.sub, query)
    return this.chatHistoryService.toPaginatedResponse(result)
  }

  // ── PATCH /chat/:chatId/messages ───────────────────────────────────────────
  // Guardado automático incremental tras cada respuesta del bot.
  @Roles(Role.Client, Role.Admin)
  @Patch(':chatId/messages')
  @ApiOperation({
    summary: 'Agrega los mensajes del último turno (automático)',
    description:
      'Inserta solo los mensajes nuevos. Idempotente por clientMessageId, ' +
      'así que reintentar la misma petición no duplica nada.'
  })
  @ApiResponse({ status: 200, type: ChatDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Chat no encontrado' })
  async appendMessages(
    @Param('chatId') chatId: string,
    @ActiveUser() user: JwtPayload,
    @Body() dto: AppendMessagesDto
  ): Promise<ChatDetailResponseDto> {
    const chat = await this.chatHistoryService.appendMessages(
      chatId,
      user.sub,
      dto
    )
    return this.chatHistoryService.toDetailResponse(chat)
  }

  // ── GET /chat/:chatId ──────────────────────────────────────────────────────
  @Roles(Role.Client, Role.Admin)
  @Get(':chatId')
  @ApiOperation({ summary: 'Chat completo con mensajes (restaurar contexto)' })
  @ApiResponse({ status: 200, type: ChatDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Chat no encontrado' })
  async getChatDetail(
    @Param('chatId') chatId: string,
    @ActiveUser() user: JwtPayload
  ): Promise<ChatDetailResponseDto> {
    const chat = await this.chatHistoryService.getChatDetail(chatId, user.sub)
    return this.chatHistoryService.toDetailResponse(chat)
  }

  // ── PATCH /chat/:chatId ────────────────────────────────────────────────────
  @Roles(Role.Client, Role.Admin)
  @Patch(':chatId')
  @ApiOperation({ summary: 'Renombrar chat' })
  @ApiResponse({ status: 200, type: ChatDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Chat no encontrado' })
  async renameChat(
    @Param('chatId') chatId: string,
    @ActiveUser() user: JwtPayload,
    @Body() dto: UpdateChatTitleDto
  ): Promise<ChatDetailResponseDto> {
    const chat = await this.chatHistoryService.renameChat(
      chatId,
      user.sub,
      dto.title
    )
    return this.chatHistoryService.toDetailResponse(chat)
  }

  // ── DELETE /chat/:chatId ───────────────────────────────────────────────────
  @Roles(Role.Client, Role.Admin)
  @Delete(':chatId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar chat y sus mensajes (cascade)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Chat no encontrado' })
  async deleteChat(
    @Param('chatId') chatId: string,
    @ActiveUser() user: JwtPayload
  ): Promise<void> {
    await this.chatHistoryService.deleteChat(chatId, user.sub)
  }
}
