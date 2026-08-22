import { HttpService } from '@nestjs/axios'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import { ChatService } from '../chat/chat.service'
import { ChatMessageDto } from '../chat/dto/chat.dto'

interface RagChunk {
  herb_id: string
  source_type: 'HERB_PROFILE' | 'HERB_SYMPTOM'
  source_id: string
  content: string
  cosine_rank: number | null
  lexical_rank: number | null
  rrf_score: number
}

interface RagSearchResponse {
  chunks: RagChunk[]
  prompt: { system: string; user: string }
  took_ms: number
}

export interface RagAnswerStream {
  // Mismo tipo que devuelve ChatService.generateResponse (un stream de
  // groq-sdk, no una promesa de texto completo).
  stream: Awaited<ReturnType<ChatService['generateResponse']>>
  sources: RagChunk[]
}

/**
 * Orquesta el flujo de consulta completo:
 *   1. POST /search a rag-service (Python) — retrieval híbrido + prompt armado.
 *   2. ChatService.generateResponse con ese system/user, reusando el MISMO
 *      cliente Groq que ya tenés en el chat normal (no se instancia uno nuevo).
 *
 * Python nunca llama al LLM (decisión de la spec, sección 1) — este service
 * es el único lugar que sí lo hace.
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name)
  private readonly ragServiceUrl: string

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly chatService: ChatService
  ) {
    this.ragServiceUrl = this.config.getOrThrow<string>('RAG_SERVICE_URL')
  }

  async answerQuestion(question: string, topK = 5): Promise<RagAnswerStream> {
    const { data } = await firstValueFrom(
      this.http.post<RagSearchResponse>(`${this.ragServiceUrl}/search`, {
        query: question,
        top_k: topK
      })
    )

    this.logger.debug(
      `Retrieval: ${data.chunks.length} chunks en ${data.took_ms}ms (rag-service)`
    )

    // ChatMessageDto: id y parts son opcionales, así que con role/content alcanza.
    const userMessage: ChatMessageDto = {
      role: 'user',
      content: data.prompt.user
    }

    const stream = await this.chatService.generateResponse(
      [userMessage],
      data.prompt.system
    )

    return { stream, sources: data.chunks }
  }
}
