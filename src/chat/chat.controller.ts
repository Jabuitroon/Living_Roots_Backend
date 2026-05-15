import { Controller, Post, Body, Res, HttpCode } from '@nestjs/common'
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
      res.setHeader('X-Vercel-AI-Data-Stream', 'v1')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      // Required if Next.js and NestJS run on different ports
      res.setHeader(
        'Access-Control-Allow-Origin',
        process.env.FRONTEND_URL ?? '*'
      )

      let chunkCount = 0

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content ?? ''
        console.log(`📦 Chunk ${++chunkCount}:`, JSON.stringify(content))
        if (content) {
          res.write(`0:${JSON.stringify(content)}\n`)
        }
      }

      console.log(`✅ Stream terminado. Total chunks: ${chunkCount}`)

      // ✅ Necesario: step finish antes del stream finish
      res.write(
        `e:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 }, isContinued: false })}\n`
      )
      // Signal end of stream with finish reason
      res.write(
        `d:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 } })}\n`
      )
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
}
