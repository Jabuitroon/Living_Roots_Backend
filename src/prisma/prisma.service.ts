import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private configService: ConfigService) {
    // 1. Obtenemos la URL del ConfigService (ya validada por Zod)
    const connectionString = configService.get<string>('DATABASE_URL');

    // 2. Configuramos el adaptador con la URL segura
    const adapter = new PrismaPg({
      connectionString,
    });

    // 3. Pasamos el adaptador al constructor de PrismaClient
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Prisma connected successfully');
    } catch (error) {
      console.error('❌ Prisma connection error:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('Database disconnected');
  }
}
