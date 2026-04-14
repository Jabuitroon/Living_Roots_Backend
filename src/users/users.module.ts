import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { BcryptService } from '../providers/hashing/bcrypt.service';
import { HashingService } from '../providers/hashing/hashing.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    { provide: HashingService, useClass: BcryptService },
    UsersService,
  ],
  // Para que AuthService pueda usar UsersService, este último debe ser "público" dentro de su propio módulo.
  exports: [UsersService],
})
export class UsersModule {}
