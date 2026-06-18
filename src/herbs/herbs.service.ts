import { Injectable, NotFoundException } from '@nestjs/common'
import { CreateHerbDto } from './dto/create-herb.dto'
import { UpdateHerbDto } from './dto/update-herb.dto'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma } from '../generated/prisma/client'
import { AddSymptomDto } from '@app/symptoms/dto/create-symptom.dto'

interface Rows {
  status: string
  herb_id: string
  symptoms_processed: number
  message: string
}

@Injectable()
export class HerbsService {
  constructor(private prisma: PrismaService) {}

  // Llama al SP que crea la planta — los síntomas se agregan después

  async create(dto: CreateHerbDto) {
    const result = await this.prisma.$queryRaw<
      [{ fn_create_herb_with_symptoms_bulk: Rows }]
    >(
      Prisma.sql`
        SELECT fn_create_herb_with_symptoms_bulk(
          ${dto.name},
          ${dto.description},
          ${dto.img},
          ${'[]'}::jsonb,
          ${dto.cultivator ?? null},
          ${dto.important ?? null}
        )
      `
    )

    const newHerb = result[0].fn_create_herb_with_symptoms_bulk
    console.log(
      `Planta creada con ID: ${JSON.stringify(newHerb)}`,
      typeof newHerb
    )
    return this.findById(newHerb)
  }

  async addSymptom(herbId: string, dto: AddSymptomDto) {
    const herb = await this.prisma.herb.findUnique({
      where: { herb_id: herbId }
    })
    if (!herb)
      throw new NotFoundException(`Planta con ID ${herbId} no encontrada`)

    // Usa una transacción para garantizar atomicidad
    return this.prisma.$transaction(async (tx) => {
      // Upsert del síntoma por nombre (unique)
      const symptom = await tx.symptom.upsert({
        where: { name: dto.name },
        create: {
          name: dto.name,
          description: dto.description
        },
        update: {} // Si existe, no modifica la descripción global
      })

      // Crea o actualiza el tratamiento (relación herb ↔ symptom)
      const treatment = await tx.herbSymptom.upsert({
        where: {
          herbId_symptomId: {
            herbId: herb.herb_id,
            symptomId: symptom.symptom_id
          }
        },
        create: {
          herbId: herb.herb_id,
          symptomId: symptom.symptom_id,
          partsplant: dto.parts_plant,
          prepare: dto.prepare,
          apply: dto.apply
        },
        update: {
          partsplant: dto.parts_plant,
          prepare: dto.prepare,
          apply: dto.apply
        },
        include: { symptom: true }
      })

      return treatment
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

  private findById(herbId: Rows) {
    return this.prisma.herb.findUniqueOrThrow({
      where: { herb_id: herbId.herb_id },
      include: {
        symptoms: { include: { symptom: true } }
      }
    })
  }

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
