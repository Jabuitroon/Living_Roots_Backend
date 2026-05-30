import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { FavoritesService } from './favorites.service'
import { ToggleFavoriteDto } from './dto/toggle-favorite'
import { AuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { ActiveUser } from '../common/decorators/active-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '../auth/enums'
import type { JwtPayload } from '../auth/interfaces'

@Controller('favorites')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @Roles(Role.Client, Role.Admin)
  async getFavorites(@ActiveUser() user: JwtPayload) {
    console.log('=== [CONTROLADOR] Usuario recibido:', user)
    return this.favoritesService.findAll(user)
  }

  @Post()
  @Roles(Role.Client, Role.Admin)
  async toggleFavorite(
    @ActiveUser() user: JwtPayload,
    @Body() toggleFavoriteDto: ToggleFavoriteDto
  ) {
    await this.favoritesService.toggleFavorite(user, toggleFavoriteDto)
    return { success: true, message: 'Operación realizada con éxito' }
  }
}
