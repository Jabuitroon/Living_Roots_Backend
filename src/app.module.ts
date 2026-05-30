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

@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
      isGlobal: true
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    HerbsModule,
    ChatModule,
    SymptomsModule,
    FavoritesModule
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
