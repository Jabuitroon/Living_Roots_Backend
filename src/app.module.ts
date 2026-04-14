import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validate } from './config/env.load';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { HerbsModule } from './herbs/herbs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    HerbsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
