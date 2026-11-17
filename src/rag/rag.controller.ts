import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Res,
  UseGuards
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import express from 'express'
import { CreateChatDto } from './dto/ask-question.dto'
import { RagService } from './rag.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '../auth/enums'
import { ActiveUser } from '../common/decorators/active-user.decorator'
import type { JwtPayload } from '../auth/interfaces'
import {
  TranslationChunkRef,
  TranslationService
} from '../translation/translation.service'

@ApiTags('Rag')
@ApiBearerAuth()
@Controller('rag')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Client, Role.Admin)
export class RagController {
  private readonly logger = new Logger(RagController.name)

  constructor(
    private readonly ragService: RagService,
    private readonly translationService: TranslationService
  ) {}

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
  async ask(
    @Body() dto: CreateChatDto,
    @ActiveUser() user: JwtPayload,
    @Res() res: express.Response
  ) {
    const { messages } = dto
    const lastMessage = messages[messages.length - 1]
    const question = lastMessage.parts[0].text

    try {
      const preferredLanguage =
        await this.translationService.getPreferredLanguage(user.sub)
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

      let translatedText = ''
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (!content) {
          continue
        }

        if (preferredLanguage === 'NSY') {
          translatedText += content
          continue
        }

        res.write(
          `data: ${JSON.stringify({
            type: 'text-delta',
            id: textId,
            delta: content
          })}\n\n`
        )
      }

      if (preferredLanguage === 'NSY') {
        const translation =
          await this.translationService.translateGeneratedText(
            user.sub,
            translatedText,
            sources.map((source): TranslationChunkRef => ({
              herb_id: source.herb_id,
              source_type: source.source_type,
              source_id: source.source_id
            }))
          )
        res.write(
          `data: ${JSON.stringify({
            type: 'data-translation',
            data: translation
          })}\n\n`
        )
        res.write(
          `data: ${JSON.stringify({
            type: 'text-delta',
            id: textId,
            delta: translation.text_nsy
          })}\n\n`
        )
      }

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
      this.logger.error(
        'Error al generar respuesta RAG',
        error instanceof Error ? error.stack : undefined
      )
      if (!res.headersSent) {
        res.status(500).json({
          message: 'Error al generar la respuesta'
        })
      } else {
        res.destroy(error instanceof Error ? error : undefined)
      }
    }
  }
}
