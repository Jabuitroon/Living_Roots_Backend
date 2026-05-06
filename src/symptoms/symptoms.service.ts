import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class SymptomsService {
  constructor(private readonly prisma: PrismaService) {}

  search(query: string) {
    if (!query || query.length < 2) return []

    return this.prisma.symptom.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive' // case-insensitive para PostgreSQL
        }
      },
      select: {
        symptom_id: true,
        name: true,
        description: true
      },
      take: 8, // máximo 8 sugerencias en el dropdown
      orderBy: { name: 'asc' }
    })
  }
}
