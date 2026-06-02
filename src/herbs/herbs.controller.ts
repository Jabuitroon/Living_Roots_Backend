import {
  Get,
  Patch,
  Delete,
  UseGuards,
  Query,
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common'

import { CreateHerbDto } from './dto/create-herb.dto'
import { UpdateHerbDto } from './dto/update-herb.dto'
import { HerbsService } from './herbs.service'
import { Role } from '../auth/enums'
import { Roles } from '../auth/decorators/roles.decorator'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { AddSymptomDto } from '@app/symptoms/dto/create-symptom.dto'

@Controller('herbs')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
export class HerbsController {
  constructor(private readonly herbsService: HerbsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateHerbDto) {
    return this.herbsService.create(dto)
  }

  @Post(':id/symptoms')
  @HttpCode(HttpStatus.CREATED)
  addSymptom(
    @Param('id', ParseUUIDPipe) herbId: string,
    @Body() dto: AddSymptomDto
  ) {
    return this.herbsService.addSymptom(herbId, dto)
  }

  @Get()
  @Roles(Role.Admin, Role.Client)
  async findAll(@Query('search') search?: string) {
    return this.herbsService.findAll(search)
  }

  @Get('search')
  findBySymptom(@Query('symptom') symptom: string) {
    return this.herbsService.findBySymptom(symptom)
  }

  @Get(':id')
  @Roles(Role.Admin, Role.Client)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.herbsService.findOne(id)
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateHerbDto: UpdateHerbDto
  ) {
    return this.herbsService.update(id, updateHerbDto)
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.herbsService.remove(id)
  }
}
