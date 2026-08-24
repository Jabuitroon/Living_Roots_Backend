import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import express from 'express'
import { CreateChatDto } from './dto/ask-question.dto'
// import { ChatMessageDto } from '../chat/dto/chat.dto'
import { RagService } from './rag.service'

@ApiTags('Rag')
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('ask')
  @ApiOperation({
    summary: 'Pregunta al chatbot de plantas (retrieval + Groq, SSE)',
    description:
      'Mismo protocolo que /chat/generate (AI SDK Data Stream Protocol v1). ' +
      'A diferencia del chat normal, el system prompt y el contexto salen ' +
      'del retrieval híbrido de rag-service (Python), no de un system prompt fijo.'
  })
  @HttpCode(200)
  async ask(@Body() dto: CreateChatDto, @Res() res: express.Response) {
    const { messages } = dto
    const lastMessage = messages[messages.length - 1]
    const question = lastMessage.parts[0].text

    console.log('➡️ Pregunta RAG recibida:', question)
    try {
      const { stream, sources } = await this.ragService.answerQuestion(question)

      // Headers required by the AI SDK Data Stream Protocol — idénticos a /chat/generate
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('x-vercel-ai-ui-message-stream', 'v1')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const messageId = crypto.randomUUID()
      res.write(
        `data: ${JSON.stringify({
          type: 'start',
          messageId
        })}\n\n`
      )

      // Data part custom con las plantas recuperadas — va ANTES del texto,
      // así el frontend puede mostrar de dónde sale la respuesta apenas
      // arranca el stream. useChat trata cualquier type: 'data-<nombre>'
      // como una parte de datos propia del mensaje.
      res.write(
        `data: ${JSON.stringify({
          type: 'data-sources',
          data: sources
        })}\n\n`
      )

      const textId = crypto.randomUUID()
      res.write(
        `data: ${JSON.stringify({
          type: 'text-start',
          id: textId
        })}\n\n`
      )

      let chunkCount = 0
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content ?? ''
        console.log(`📦 Chunk RAG ${++chunkCount}:`, JSON.stringify(content))
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

      console.log(`✅ Stream RAG terminado. Total chunks: ${chunkCount}`)

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
      console.error('❌ Error en stream RAG:', error)
      if (!res.headersSent) {
        res.status(500).json({
          message: 'Error al generar la respuesta',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  }
}
