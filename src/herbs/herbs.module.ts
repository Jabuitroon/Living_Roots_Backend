import { Module } from '@nestjs/common';
import { HerbsService } from './herbs.service';
import { HerbsController } from './herbs.controller';

@Module({
  controllers: [HerbsController],
  providers: [HerbsService],
})
export class HerbsModule {}
