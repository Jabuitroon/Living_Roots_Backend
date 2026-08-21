import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

export const REINDEX_HERB_QUEUE = 'reindex-herb'

type ReindexHerbJobData =
  | { herbId: string; action: 'upsert' }
  | { herbId: string; action: 'delete' }

/**
 * Productor de la cola que consume worker.py (rag-service/app/worker.py).
 * El contrato del payload está fijado en la spec (sección 8) y NO debe
 * cambiar sin actualizar también el lado Python — es el punto de acople
 * entre los dos proyectos.
 */
@Injectable()
export class RagIndexQueueService {
  constructor(
    @InjectQueue(REINDEX_HERB_QUEUE)
    private readonly queue: Queue<ReindexHerbJobData>
  ) {}

  async enqueueUpsert(herbId: string): Promise<void> {
    await this.queue.add(
      'reindex-herb',
      { herbId, action: 'upsert' },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    )
  }

  async enqueueDelete(herbId: string): Promise<void> {
    await this.queue.add(
      'reindex-herb',
      { herbId, action: 'delete' },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    )
  }
}
