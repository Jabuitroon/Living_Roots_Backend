import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common'

import { Prisma } from '../generated/prisma/client'

import { PrismaService } from '../prisma/prisma.service'
import { HashingService } from '../providers/hashing/hashing.service'

import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UpdateUserRoleDto } from './dto/update-user-role.dto'
import {
  SortDirection,
  UserSortField,
  UsersFilterDto
} from './dto/users-filter.dto'

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingService
  ) {}

  // Selector común para reutilizar y no repetir código, select de prisma recibe un obj
  private readonly userSelector = {
    user_id: true,
    name: true,
    lastName: true,
    phone: true,
    email: true,
    role: true,
    avatar: true,
    createdAt: true,
    updateAt: true,
    favorites: true
  } satisfies Prisma.UserSelect

  async findById(id: string, select?: Prisma.UserSelect) {
    return this.prisma.user.findUnique({
      where: {
        user_id: id
      },
      select // Si no se pasa, trae todo el objeto
    })
  }

  async findByEmail(email: string, select?: Prisma.UserSelect) {
    return this.prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim()
      },
      select
    })
  }

  async create(payload: CreateUserDto) {
    const { password, ...userData } = payload
    // Buscar si el email ya existe de forma proactiva
    const existingUser = await this.findByEmail(payload.email)

    if (existingUser) {
      throw new BadRequestException('El correo electrónico ya existe')
    }

    try {
      // Hashear la contraseña
      const hashedPassword = await this.hashingService.hash(password.trim())
      // Guardar en PostgreSQL usando Prisma
      return await this.prisma.user.create({
        data: {
          ...userData,
          passwordHash: hashedPassword
        },
        select: this.userSelector
      })
    } catch (error) {
      throw new InternalServerErrorException(
        `Error al crear el usuario: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }

  async findAll(filters: UsersFilterDto) {
    const { page, limit, search, sortBy, sortDir } = filters

    const skip = (page - 1) * limit

    const where: Prisma.UserWhereInput = {}

    if (search?.trim()) {
      const normalizedSearch = search.trim()

      where.OR = [
        {
          name: {
            contains: normalizedSearch,
            mode: 'insensitive'
          }
        },
        {
          lastName: {
            contains: normalizedSearch,
            mode: 'insensitive'
          }
        },
        {
          email: {
            contains: normalizedSearch,
            mode: 'insensitive'
          }
        }
      ]
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = this.buildOrderBy(
      sortBy,
      sortDir
    )

    try {
      const [users, total] = await this.prisma.$transaction([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: this.userSelector
        }),

        this.prisma.user.count({
          where
        })
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data: users,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    } catch (error) {
      throw new BadRequestException(
        `Error al buscar usuarios: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }

  private buildOrderBy(
    sortBy: UserSortField,
    sortDir: SortDirection
  ): Prisma.UserOrderByWithRelationInput {
    switch (sortBy) {
      case UserSortField.Name:
        return {
          name: sortDir
        }

      case UserSortField.LastName:
        return {
          lastName: sortDir
        }

      case UserSortField.Email:
        return {
          email: sortDir
        }

      case UserSortField.Role:
        return {
          role: sortDir
        }

      case UserSortField.CreatedAt:
      default:
        return {
          createdAt: sortDir
        }
    }
  }

  async findOne(id: string) {
    const userById = await this.prisma.user.findUnique({
      where: { user_id: id },
      select: this.userSelector
    })
    if (!userById) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`)
    }
    return userById
  }

  async update(id: string, payload: UpdateUserDto) {
    const { password, ...userData } = payload
    const dataToUpdate: Prisma.UserUpdateInput = {
      ...userData
    }

    if (password) {
      dataToUpdate.passwordHash = await this.hashingService.hash(
        password.trim()
      )
    }

    try {
      return await this.prisma.user.update({
        where: { user_id: id },
        data: dataToUpdate,
        select: this.userSelector
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Usuario con id ${id} no existe`)
      }
      throw new InternalServerErrorException('Error al actualizar')
    }
  }

  async updateRole(id: string, payload: UpdateUserRoleDto) {
    try {
      const user = await this.prisma.user.update({
        where: {
          user_id: id
        },
        data: {
          role: payload.role
        },
        select: this.userSelector
      })

      return user
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Usuario con id ${id} no existe`)
      }
      throw new InternalServerErrorException(
        'Error al actualizar el rol del usuario'
      )
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.user.delete({
        where: { user_id: id }
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Usuario con id ${id} no existe para eliminar`
        )
      }
      throw new InternalServerErrorException()
    }
  }
}
