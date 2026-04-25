import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'

@Module({
  imports: [ConfigModule], // necesario para que ConfigService esté disponible
  controllers: [ChatController],
  providers: [ChatService]
})
export class ChatModule {}
