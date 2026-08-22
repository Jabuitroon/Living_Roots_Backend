import { HttpModule } from '@nestjs/axios'
import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { HerbReindexListener } from './listeners/herb-reindex.listener'
import { RagIndexQueueService } from './queue/rag-index.queue'
import { RagController } from './rag.controller'
import { RagService } from './rag.service'
import { ChatModule } from '@app/chat/chat.module'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'reindex-herb' }),
    HttpModule.register({ timeout: 15_000 }),
    ChatModule
  ],
  providers: [RagIndexQueueService, HerbReindexListener, RagService],
  controllers: [RagController],
  // Exportado para que HerbModule/HerbSymptomModule puedan inyectar
  // RagIndexQueueService directo, si en algún punto preferís llamarlo
  // desde el service en vez de pasar por el EventEmitter.
  exports: [RagIndexQueueService]
})
export class RagModule {}
