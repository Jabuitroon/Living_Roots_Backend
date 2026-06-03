// src/stories/stories.controller.ts
// Principio SRP: única responsabilidad → recibir HTTP, delegar, responder.
// Principio OCP: nuevas rutas se añaden sin modificar la lógica de negocio.

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
  UseGuards
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { StoryStatus } from '../../src/generated/prisma/client'
import { StoryExceptionFilter } from './filters/story-exception.filter'
import { Role } from '../auth/enums'
import { Roles } from '../auth/decorators/roles.decorator'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CreateStoryDto } from './dto/create-story.dto'
import { UpdateStoryDto } from './dto/update-story.dto'
import { StoryQueryDto } from './dto/story-query.dto'
import { StoriesService } from './stories.service'
import { ActiveUser } from '@app/common/decorators/active-user.decorator'
import type { JwtPayload } from '@app/auth/interfaces'

// Ajusta a la ruta de tu JwtAuthGuard existente
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Stories')
@UseGuards(AuthGuard, RolesGuard)
@UseFilters(StoryExceptionFilter)
@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un nuevo relato (borrador)' })
  @ApiResponse({ status: 201, description: 'Historia creada exitosamente.' })
  @HttpCode(HttpStatus.CREATED)
  create(@ActiveUser() user: JwtPayload, @Body() dto: CreateStoryDto) {
    return this.storiesService.create(user, dto)
  }

  // ── GET /stories/published ────────────────────────────────
  @Get('published')
  @ApiOperation({ summary: 'Listar historias publicadas (público)' })
  findPublished(@Query() query: StoryQueryDto) {
    return this.storiesService.findPublished(query)
  }

  // ── GET /stories/mine ─────────────────────────────────────
  @Get('mine')
  @UseGuards(/** JwtAuthGuard, */ RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mis historias (autor autenticado)' })
  findMine(@ActiveUser() user: JwtPayload, @Query() query: StoryQueryDto) {
    return this.storiesService.findMine(user, query)
  }

  // ── GET /stories (solo admin) ─────────────────────────────
  @Get()
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todas las historias (admin)' })
  findAll(@Query() query: StoryQueryDto) {
    return this.storiesService.findAll(query)
  }

  // ── GET /stories/:id ──────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una historia por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: JwtPayload
  ) {
    return this.storiesService.findOne(id, user)
  }

  // ── PUT /stories/:id ──────────────────────────────────────
  @Put(':id')
  @UseGuards(/** JwtAuthGuard, */ RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar una historia (autor o admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: JwtPayload,
    @Body() dto: UpdateStoryDto
  ) {
    return this.storiesService.update(id, user, dto)
  }

  // ── PATCH /stories/:id/status ─────────────────────────────
  @Patch(':id/status')
  @UseGuards(/** JwtAuthGuard, */ RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar estado: DRAFT → PUBLISHED → ARCHIVED' })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: JwtPayload,
    @Query('status', new ParseEnumPipe(StoryStatus)) status: StoryStatus
  ) {
    return this.storiesService.changeStatus(id, user, status)
  }

  // ── DELETE /stories/:id ───────────────────────────────────
  @Delete(':id')
  @UseGuards(/** JwtAuthGuard, */ RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar historia (autor o admin)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: JwtPayload
  ) {
    return this.storiesService.remove(id, user)
  }
}
