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
  HttpStatus
} from '@nestjs/common'
import express from 'express'
import { ChatService } from './chat.service'
import { ChatHistoryService } from './chat-history.service'
import { CreateChatDto } from './dto/chat.dto'
import { Throttle } from '@nestjs/throttler'

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'

import {
  // StreamChatDto,
  PersistChatDto,
  UpdateChatTitleDto,
  ChatSummaryResponseDto,
  ChatDetailResponseDto
} from './dto/chat.dto'

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatHistoryService: ChatHistoryService
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('generate')
  @ApiOperation({
    summary: 'Streaming con Groq (SSE)',
    description:
      'Recibe messages[] del frontend (useChat), devuelve chunks vía SSE. ' +
      'El frontend acumula la respuesta y la guarda en Zustand.'
  })
  @HttpCode(200)
  async generateChat(
    @Body() createChatDto: CreateChatDto,
    @Res() res: express.Response
  ) {
    console.log(
      '➡️ Messages recibidos:',
      JSON.stringify(createChatDto.messages, null, 2)
    )
    try {
      const stream = await this.chatService.generateResponse(
        createChatDto.messages
      )

      // Headers required by the AI SDK Data Stream Protocol
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('x-vercel-ai-ui-message-stream', 'v1')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const messageId = crypto.randomUUID()
      let chunkCount = 0
      res.write(
        `data: ${JSON.stringify({
          type: 'start',
          messageId
        })}\n\n`
      )

      const textId = crypto.randomUUID()
      res.write(
        `data: ${JSON.stringify({
          type: 'text-start',
          id: textId
        })}\n\n`
      )

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content ?? ''
        console.log(`📦 Chunk ${++chunkCount}:`, JSON.stringify(content))
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

      console.log(`✅ Stream terminado. Total chunks: ${chunkCount}`)

      res.write(
        `data: ${JSON.stringify({
          type: 'text-end',
          id: textId
        })}\n\n`
      )

      res.write(
        `data: ${JSON.stringify({
          type: 'finish'
        })}\n\n`
      )

      res.flushHeaders()
      res.end()
    } catch (error) {
      console.error('❌ Error en stream:', error) // ← qué dice aquí?
      if (!res.headersSent) {
        res.status(500).json({
          message: 'Error al generar la respuesta',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  }

  // ── POST /chat/persist ─────────────────────────────────────────────────────
  // Zustand → PostgreSQL. Llamado en logout / inactividad / fin de sesión.
  // Responde con chat_id para que Zustand lo persista si era nuevo.

  @Post('persist')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Persiste el chat de Zustand en PostgreSQL',
    description:
      'Upsert: crea si no existe, actualiza si ya existe. ' +
      'Después de 201, el frontend limpia el store y guarda el chat_id recibido.'
  })
  @ApiResponse({ status: 201, type: ChatDetailResponseDto })
  async persistChat(
    @Body() dto: PersistChatDto
  ): Promise<ChatDetailResponseDto> {
    console.log(`POST /chat/persist - userId=${dto.userId}`)
    const chat = await this.chatHistoryService.persistChat(dto)
    return this.chatHistoryService.toDetailResponse(chat)
  }

  // ── GET /chat/history/:userId ──────────────────────────────────────────────

  @Get('history/:userId')
  @ApiOperation({
    summary: 'Historial de chats del usuario (para sidebar)',
    description: 'Para renderizar el sidebar / historial de conversaciones.'
  })
  @ApiResponse({ status: 200, type: [ChatSummaryResponseDto] })
  async getUserChats(
    @Param('userId') userId: string
  ): Promise<ChatSummaryResponseDto[]> {
    const chats = await this.chatHistoryService.getUserChats(userId)
    return this.chatHistoryService.toSummaryResponse(chats)
  }

  // ── GET /chat/:chatId/:userId ──────────────────────────────────────────────
  @Get(':chatId/:userId')
  @ApiOperation({ summary: 'Chat completo con mensajes (restaurar contexto)' })
  @ApiResponse({ status: 200, type: ChatDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Chat no encontrado' })
  async getChatDetail(
    @Param('chatId') chatId: string,
    @Param('userId') userId: string
  ): Promise<ChatDetailResponseDto> {
    const chat = await this.chatHistoryService.getChatDetail(chatId, userId)
    return this.chatHistoryService.toDetailResponse(chat)
  }

  // ── PATCH /chat/:chatId/:userId ────────────────────────────────────────────

  @Patch(':chatId/:userId')
  @ApiOperation({ summary: 'Renombrar chat' })
  async renameChat(
    @Param('chatId') chatId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateChatTitleDto
  ): Promise<ChatDetailResponseDto> {
    const chat = await this.chatHistoryService.renameChat(
      chatId,
      userId,
      dto.title
    )
    return this.chatHistoryService.toDetailResponse(chat)
  }

  // ── DELETE /chat/:chatId/:userId ───────────────────────────────────────────

  @Delete(':chatId/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar chat y mensajes (cascade)' })
  @ApiResponse({ status: 204 })
  async deleteChat(
    @Param('chatId') chatId: string,
    @Param('userId') userId: string
  ): Promise<void> {
    await this.chatHistoryService.deleteChat(chatId, userId)
  }
}
