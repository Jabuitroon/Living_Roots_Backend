/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service' // ajustá el path si tu PrismaService está en otro lado
import { RagIndexQueueService } from '../src/rag/queue/rag-index.queue'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule)

  const prisma = app.get(PrismaService)
  const ragIndexQueue = app.get(RagIndexQueueService)

  const herbs = await prisma.herb.findMany({ select: { herb_id: true } })
  console.log(`Encolando ${herbs.length} plantas...`)

  for (const { herb_id } of herbs) {
    await ragIndexQueue.enqueueUpsert(herb_id)
  }

  console.log(
    'Backfill encolado. Revisá los logs de `python -m app.worker` para ver el procesamiento.'
  )
  await app.close()
}

bootstrap()
