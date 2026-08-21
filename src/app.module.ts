import { Module, ValidationPipe } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { validate } from './config/env.load'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'
import { AuthModule } from './auth/auth.module'
import { HerbsModule } from './herbs/herbs.module'
import { ChatModule } from './chat/chat.module'
import { SymptomsModule } from './symptoms/symptoms.module'
import { APP_PIPE } from '@nestjs/core'
import { FavoritesModule } from './favorites/favorites.module'
import { StoriesModule } from './stories/stories.module'
import { HerbExportModule } from './herb-export/herb-export.module'
import { HerbsBackupRestoreModule } from './herbs-backup-restore/herbs-backup-restore.module'
import { BullModule } from '@nestjs/bullmq'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { RagModule } from './rag/rag.module'
import { TreatmentModule } from './treatment/treatment.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
      isGlobal: true
    }),
    BullModule.forRoot({
      connection: { url: process.env.REDIS_URL }
    }),
    EventEmitterModule.forRoot(), // omitir si ya lo tenés registrado en otro lado
    RagModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    HerbsModule,
    ChatModule,
    SymptomsModule,
    FavoritesModule,
    StoriesModule,
    HerbExportModule,
    HerbsBackupRestoreModule,
    RagModule,
    TreatmentModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      // ValidationPipe global con whitelist: elimina campos no declarados en el DTO
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true, // borra campos extra del body
        forbidNonWhitelisted: true, // lanza 400 si vienen campos extra
        transform: true // activa @Transform() en los DTOs
      })
    }
  ]
})
export class AppModule {}
