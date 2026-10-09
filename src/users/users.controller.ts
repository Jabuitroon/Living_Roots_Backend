import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  Query
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'

import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Role } from '../auth/enums'
import { Roles } from '../auth/decorators/roles.decorator'
import { UpdateUserRoleDto } from './dto/update-user-role.dto'
import { UsersFilterDto } from './dto/users-filter.dto'

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Crear un usuario', description: 'Requiere rol Admin. Crea un usuario saltando el proceso de registro público.' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o email duplicado.' })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto)
  }

  @ApiOperation({ summary: 'Listar usuarios', description: 'Requiere rol Admin. Devuelve lista paginada de usuarios con filtros opcionales.' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios devuelta exitosamente.' })
  @Get()
  findAll(@Query() filters: UsersFilterDto) {
    return this.usersService.findAll(filters)
  }

  @ApiOperation({ summary: 'Obtener un usuario por ID', description: 'Requiere rol Admin. Busca un usuario específico por su UUID.' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id)
  }

  @ApiOperation({ summary: 'Actualizar información de usuario', description: 'Requiere rol Admin. Actualiza los datos de un usuario excluyendo el rol.' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado.' })
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto)
  }

  @ApiOperation({ summary: 'Actualizar rol de un usuario', description: 'Requiere rol Admin. Cambia el nivel de acceso (ej. de client a admin).' })
  @ApiResponse({ status: 200, description: 'Rol actualizado exitosamente.' })
  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto
  ) {
    return this.usersService.updateRole(id, dto)
  }

  @ApiOperation({ summary: 'Eliminar un usuario', description: 'Requiere rol Admin. Elimina un registro de la base de datos de manera definitiva o lógica (dependiendo del servicio).' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado.' })
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id)
  }
}