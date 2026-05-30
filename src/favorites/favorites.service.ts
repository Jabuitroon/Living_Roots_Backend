/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  ConflictException,
  NotFoundException
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ToggleFavoriteDto, FavoriteAction } from './dto/toggle-favorite'
import { JwtPayload } from '../auth/interfaces' // Ajusta la ruta a tu interfaz

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: JwtPayload) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId: user.sub },
      include: {
        herb: {
          include: {
            symptoms: true // Trae los síntomas asociados a la planta para cumplir con la interfaz Plant
          }
        }
      }
    })

    // Desestructuramos para retornar solo la lista de plantas (Herbs) al frontend
    return favorites.map((fav) => fav.herb)
  }

  async toggleFavorite(user: JwtPayload, toggleFavoriteDto: ToggleFavoriteDto) {
    const { plantId, action } = toggleFavoriteDto

    if (action === FavoriteAction.ADD) {
      return this.add(user.sub, plantId)
    }

    return this.remove(user.sub, plantId)
  }

  private async add(userId: string, herbId: string) {
    // Verificar si ya existe para evitar errores catastróficos en la DB
    const exists = await this.prisma.favorite.findUnique({
      where: { userId_herbId: { userId, herbId } }
    })

    if (exists) {
      throw new ConflictException('La planta ya se encuentra en tus favoritos')
    }

    return this.prisma.favorite.create({
      data: { userId, herbId }
    })
  }

  private async remove(userId: string, herbId: string) {
    try {
      return await this.prisma.favorite.delete({
        where: { userId_herbId: { userId, herbId } }
      })
    } catch (error) {
      // Prisma lanza un error si intentas borrar un registro que no existe
      throw new NotFoundException('El favorito no existe o ya fue eliminado')
    }
  }
}
