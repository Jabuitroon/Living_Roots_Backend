import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { CreateHerbDto } from './dto/create-herb.dto'
import { UpdateHerbDto } from './dto/update-herb.dto'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma } from '../generated/prisma/client'

@Injectable()
export class HerbsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateHerbDto) {
    console.log('Creando planta', dto)

    const existing = await this.prisma.herb.findFirst({
      where: { name: dto.name }
    })

    console.log('existente', existing)

    if (existing)
      throw new ConflictException(
        'La planta medicinal ya existe en el catálogo'
      )

    return await this.prisma.herb.create({
      data: dto
    })
  }

  async findAll(search?: string) {
    // Definimos el filtro condicional
    const where: Prisma.HerbWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            // Si tienes un campo de descripción, también podrías buscar ahí:
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {}

    return this.prisma.herb.findMany({
      where,
      select: {
        herb_id: true,
        name: true,
        description: true,
        img: true,
        symptoms: {
          select: {
            prepare: true,
            apply: true,
            symptom: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      },
      // Límite para evitar saturar si no hay búsqueda
      take: search ? undefined : 30
    })
  }
  // Para obtener favoritos, podrías agregar un endpoint específico que filtre por usuario, por ejemplo:
  // async findFavoritesByUser(userId: string) {
  //   return this.prisma.herb.findMany({
  //     where: {
  //       favorites: {
  //         some: {
  //           userId: userId
  //         }
  //       }
  //     },
  //     select: {
  //       name: true,
  //       symptoms: {
  //         select: {
  //           prepare: true,
  //           apply: true,
  //           symptom: {
  //             select: {
  //               name: true
  //             }
  //           }
  //         }
  //       }
  //     },
  //     orderBy: {
  //       name: 'asc'
  //     }
  //   })
  // }

  async findOne(id: string) {
    const herb = await this.prisma.herb.findUnique({
      where: { herb_id: id },
      include: {
        symptoms: {
          include: {
            symptom: true // Trae el detalle del síntoma asociado
          }
        }
      }
    })

    if (!herb) {
      throw new NotFoundException(`Planta con ID ${id} no encontrada`)
    }

    return herb
  }

  async update(id: string, updateHerbDto: UpdateHerbDto) {
    await this.findOne(id)

    return this.prisma.herb.update({
      where: { herb_id: id },
      data: updateHerbDto
    })
  }

  async remove(id: string) {
    await this.findOne(id)

    return this.prisma.herb.delete({
      where: { herb_id: id }
    })
  }

  async findBySymptom(symptomName: string) {
    return this.prisma.herb.findMany({
      where: {
        symptoms: {
          some: {
            symptom: {
              name: {
                contains: symptomName,
                mode: 'insensitive'
              }
            }
          }
        }
      }
    })
  }
}
