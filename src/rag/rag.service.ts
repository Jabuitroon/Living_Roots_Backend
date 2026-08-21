import { HttpService } from '@nestjs/axios'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import { generateText } from 'ai'
// import { groq } from '@ai-sdk/groq'

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

export interface RagAnswer {
  answer: string
  sources: RagChunk[]
}

/**
 * Orquesta el flujo de consulta completo:
 *   1. POST /search a rag-service (Python) — retrieval híbrido + prompt armado.
 *   2. generateText contra Groq con ese mismo system/user.
 *
 * Python nunca llama al LLM (decisión de la spec, sección 1) — este service
 * es el único lugar que sí lo hace, reusando el mismo provider de Groq que
 * ya está integrado en el módulo de chat existente.
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name)
  private readonly ragServiceUrl: string

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService
  ) {
    this.ragServiceUrl = this.config.getOrThrow<string>('RAG_SERVICE_URL')
  }

  async answerQuestion(question: string, topK = 5): Promise<RagAnswer> {
    const { data } = await firstValueFrom(
      this.http.post<RagSearchResponse>(`${this.ragServiceUrl}/search`, {
        query: question,
        top_k: topK
      })
    )

    this.logger.debug(
      `Retrieval: ${data.chunks.length} chunks en ${data.took_ms}ms (rag-service)`
    )

    // TODO: ajustar el modelo al que ya tengas configurado en el módulo de chat
    // (puede que ya exista un provider de Groq inyectable ahí — reusarlo en vez
    // de instanciar uno nuevo acá si es el caso).
    const { text } = await generateText({
      model: 'meta/llama-3.3-70b',
      system: data.prompt.system,
      prompt: data.prompt.user
    })

    return { answer: text, sources: data.chunks }
  }
}
