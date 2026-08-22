import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'

import { ChatHistoryService, CHAT_REPOSITORY } from './chat-history.service'
import { ChatRepository } from './repositories/chat.repository'
import { PrismaModule } from '../prisma/prisma.module'

/**
 * ChatModule
 *
 * Registra dos services con responsabilidades distintas:
 *  - ChatAiService      → Groq / LLM
 *  - ChatHistoryService → PostgreSQL / persistencia
 *
 * El token CHAT_REPOSITORY aplica Dependency Inversion:
 * ChatHistoryService depende de IChatRepository (abstracción),
 * no de ChatRepository (implementación).
 * Para tests: { provide: CHAT_REPOSITORY, useValue: mockRepo }
 */
@Module({
  imports: [
    PrismaModule, // @Global: disponible sin re-importar en el AppModule
    ConfigModule // Para ChatAiService (GROQ_API_KEY, AI_TEMPERATURE, etc.)
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatHistoryService,
    {
      provide: CHAT_REPOSITORY,
      useClass: ChatRepository
    }
  ],
  exports: [ChatService, ChatHistoryService] // Útil si otro módulo necesita leer el historial
})
export class ChatModule {}
