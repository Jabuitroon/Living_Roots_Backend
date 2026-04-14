import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CreateHerbDto } from './dto/create-herb.dto';
import { UpdateHerbDto } from './dto/update-herb.dto';
import { HerbsService } from './herbs.service';
import { Role } from '../auth/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('herbs')
export class HerbsController {
  constructor(private readonly herbsService: HerbsService) {}

  @Post()
  create(@Body() createHerbDto: CreateHerbDto) {
    return this.herbsService.create(createHerbDto);
  }

  @Get()
  @Public()
  findAll() {
    return this.herbsService.findAll();
  }

  @Get('search')
  findBySymptom(@Query('symptom') symptom: string) {
    return this.herbsService.findBySymptom(symptom);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.herbsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateHerbDto: UpdateHerbDto,
  ) {
    return this.herbsService.update(id, updateHerbDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.herbsService.remove(id);
  }
}
