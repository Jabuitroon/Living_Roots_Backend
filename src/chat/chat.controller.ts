import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  HttpCode
} from '@nestjs/common'
import express from 'express'
import { ChatService } from './chat.service'
import { CreateChatDto } from './dto/chat.dto'

import { Throttle } from '@nestjs/throttler'

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('generate')
  @HttpCode(200)
  async generateChat(
    @Body() createChatDto: CreateChatDto,
    @Res() res: express.Response
  ) {
    try {
      const stream = await this.chatService.generateResponse(
        createChatDto.messages
      )

      // Configuramos cabeceras para streaming
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content ?? ''
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`)
        }
      }

      res.end()
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Error al generar la respuesta',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
