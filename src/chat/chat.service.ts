import { Injectable, InternalServerErrorException } from '@nestjs/common'
import Groq from 'groq-sdk'
import { ConfigService } from '@nestjs/config'
import { ChatMessageDto } from './dto/chat.dto'

const DEFAULT_SYSTEM_PROMPT =
  'Eres un experto en medicina natural tradicional. Ayuda al usuario a encontrar remedios para sus síntomas.'

@Injectable()
export class ChatService {
  private groq: Groq

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY')

    if (!apiKey) {
      throw new Error('GROQ API KEY no definida en el entorno')
    }
    this.groq = new Groq({ apiKey })
  }

  // Extract plain text from either content string or parts array
  private extractContent(msg: ChatMessageDto): string {
    if (msg.parts?.length) {
      return msg.parts
        .filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join('')
    }
    return msg.content ?? ''
  }

  /**
   * @param chat mensajes de la conversación (sin el system, ese se maneja acá).
   * @param systemPrompt opcional — si no se pasa, usa el prompt genérico de
   *   siempre. RagService pasa acá el system que arma generacion.py del lado
   *   Python (con el contexto de las plantas recuperadas), para no duplicar
   *   la inicialización del cliente Groq en dos lugares del proyecto.
   */
  async generateResponse(chat: ChatMessageDto[], systemPrompt?: string) {
    // Transform to the flat { role, content } format Groq expects
    const groqMessages = chat
      .filter((msg) => msg.role !== 'system') // system is injected below
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: this.extractContent(msg)
      }))
      .filter((msg) => msg.content.trim().length > 0) // drop empty messages
    console.log('📤 Enviando a Groq:', JSON.stringify(groqMessages, null, 2)) // ← está vacío?

    try {
      return await this.groq.chat.completions.create({
        model: 'openai/gpt-oss-120b', // use a valid Groq model string
        messages: [
          {
            role: 'system',
            content: systemPrompt ?? DEFAULT_SYSTEM_PROMPT
          },
          ...groqMessages
        ],
        // Controla la creatividad de la respuesta de 0 a 1
        temperature: parseFloat(process.env.AI_TEMPERATURE ?? '0.7'),
        max_tokens: parseInt(process.env.AI_MAX_TOKENS ?? '1200'),
        // Diversidad de la respuesta. A menor valor el modelo se enfoca en las opciones más probables, a mayor valor respuestas más variadas.
        top_p: parseFloat(process.env.AI_TOP_P ?? '0.9'),
        n: 1,
        stream: true,
        stop: null
      })
    } catch (err) {
      console.error('Error en Groq Service:', err)
      throw new InternalServerErrorException(
        'Error al procesar la solicitud con el LLM'
      )
    }
  }
}
