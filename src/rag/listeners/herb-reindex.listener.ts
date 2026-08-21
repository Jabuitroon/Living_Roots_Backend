import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { RagIndexQueueService } from '../queue/rag-index.queue'

export interface HerbUpsertedEvent {
  herbId: string
}

export interface HerbDeletedEvent {
  herbId: string
}

/**
 * Traduce eventos de dominio a jobs de reindexado. Se dispara tanto desde
 * HerbService (create/update/delete de la planta) como desde
 * HerbSymptomService (create/update/delete de un tratamiento puntual) —
 * en ambos casos se emite 'herb.upserted' con el herb_id padre, porque
 * el worker de Python siempre recalcula el perfil + TODOS los tratamientos
 * juntos (ver decisión de la spec, sección 8: no se diffea qué síntoma
 * cambió puntualmente).
 *
 * Ver EMIT-EVENTS.md para dónde agregar el this.eventEmitter.emit(...)
 * en los servicios existentes — ese archivo es una guía, no reemplaza tu
 * HerbService/HerbSymptomService real.
 */
@Injectable()
export class HerbReindexListener {
  private readonly logger = new Logger(HerbReindexListener.name)

  constructor(private readonly ragIndexQueue: RagIndexQueueService) {}

  @OnEvent('herb.upserted')
  async handleHerbUpserted(payload: HerbUpsertedEvent): Promise<void> {
    this.logger.debug(`Encolando reindex (upsert) para herb ${payload.herbId}`)
    await this.ragIndexQueue.enqueueUpsert(payload.herbId)
  }

  @OnEvent('herb.deleted')
  async handleHerbDeleted(payload: HerbDeletedEvent): Promise<void> {
    this.logger.debug(`Encolando reindex (delete) para herb ${payload.herbId}`)
    await this.ragIndexQueue.enqueueDelete(payload.herbId)
  }
}
