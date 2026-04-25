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
            { description: { contains: search, mode: 'insensitive' } },
            { usageMethod: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {}

    return this.prisma.herb.findMany({
      where, // Aplicamos el filtro aquí
      include: {
        _count: {
          select: { favorites: true, symptoms: true }
        }
      },
      // Tip: Podrías agregar un límite para evitar saturar si no hay búsqueda
      take: search ? undefined : 50
    })
  }

  async findOne(id: string) {
    const herb = await this.prisma.herb.findUnique({
      where: { herb_Id: id },
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
      where: { herb_Id: id },
      data: updateHerbDto
    })
  }

  async remove(id: string) {
    await this.findOne(id)

    return this.prisma.herb.delete({
      where: { herb_Id: id }
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
