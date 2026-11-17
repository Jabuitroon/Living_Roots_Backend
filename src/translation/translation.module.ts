import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '../prisma/prisma.module'
import { TranslationService } from './translation.service'

@Module({
  imports: [ConfigModule, HttpModule, PrismaModule],
  providers: [TranslationService],
  exports: [TranslationService]
})
export class TranslationModule {}
