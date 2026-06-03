/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/stories/stories.service.ts
import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import {
  Prisma,
  StoryStatus,
  UserRole
} from '../../src/generated/prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateStoryDto } from './dto/create-story.dto'
import { UpdateStoryDto } from './dto/update-story.dto'
import { StoryQueryDto } from './dto/story-query.dto'

export interface JwtPayload {
  sub: string
  email: string
  role: UserRole
}

@Injectable()
export class StoriesService extends PrismaService {
  async create(author: JwtPayload, dto: CreateStoryDto) {
    const { tags = [], title, body, category, coverImage } = dto

    return this.$transaction(async (tx) => {
      const tagIds = await Promise.all(
        tags.map((name) =>
          tx.tag.upsert({
            where: { name },
            update: {},
            create: { name },
            select: { tag_id: true }
          })
        )
      )

      const { story_id } = await tx.story.create({
        data: {
          title,
          body,
          category,
          coverImage,
          readingTime: this.estimateReadingTime(body),
          author: { connect: { user_id: author.sub } },

          tags: {
            create: tagIds.map((t) => ({
              tag: { connect: { tag_id: t.tag_id } }
            }))
          }
        },
        select: { story_id: true }
      })

      return tx.story.findUniqueOrThrow({ where: { story_id } })
    })
  }

  async findPublished(query: StoryQueryDto) {
    return this.paginate({ ...query, status: StoryStatus.PUBLISHED })
  }

  async findAll(query: StoryQueryDto) {
    return this.paginate(query)
  }

  async findMine(author: JwtPayload, query: StoryQueryDto) {
    return this.paginate(query, author.sub)
  }

  async findOne(storyId: string, requester?: JwtPayload) {
    const story = await this.story.findUnique({ where: { story_id: storyId } })

    if (!story) throw new NotFoundException('Historia no encontrada.')

    if (story.status === StoryStatus.DRAFT) {
      const isOwner = requester?.sub === story.authorId
      const isAdmin = requester?.role === UserRole.admin
      if (!isOwner && !isAdmin)
        throw new NotFoundException('Historia no encontrada.')
    }

    return story
  }

  async update(storyId: string, requester: JwtPayload, dto: UpdateStoryDto) {
    await this.assertOwnerOrAdmin(storyId, requester)
    const { tags, title, body, category, coverImage } = dto

    return this.$transaction(async (tx) => {
      if (tags) {
        await tx.storyTag.deleteMany({ where: { storyId } })
        const tagIds = await Promise.all(
          tags.map((name) =>
            tx.tag.upsert({
              where: { name },
              update: {},
              create: { name },
              select: { tag_id: true }
            })
          )
        )
        await tx.storyTag.createMany({
          data: tagIds.map((t) => ({ storyId, tagId: t.tag_id }))
        })
      }

      await tx.story.update({
        where: { story_id: storyId },
        data: {
          ...(title && { title }),
          ...(body && { body, readingTime: this.estimateReadingTime(body) }),
          ...(category && { category }),
          ...(coverImage !== undefined && { coverImage })
        }
      })

      return tx.story.findUniqueOrThrow({ where: { story_id: storyId } })
    })
  }

  async changeStatus(
    storyId: string,
    requester: JwtPayload,
    status: StoryStatus
  ) {
    await this.assertOwnerOrAdmin(storyId, requester)

    return this.story.update({
      where: { story_id: storyId },
      data: {
        status,
        publishedAt: status === StoryStatus.PUBLISHED ? new Date() : undefined
      }
    })
  }

  async remove(storyId: string, requester: JwtPayload): Promise<void> {
    await this.assertOwnerOrAdmin(storyId, requester)
    await this.story.delete({ where: { story_id: storyId } })
  }

  // ── Helpers privados ──────────────────────────────────────────

  private async paginate(
    query: StoryQueryDto & { status?: StoryStatus },
    authorId?: string
  ) {
    const where: Prisma.StoryWhereInput = {
      ...(authorId && { authorId }),
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
      ...(query.search && {
        title: { contains: query.search, mode: 'insensitive' }
      })
    }

    const page = query.page ?? 1
    const limit = query.limit ?? 10

    const [data, total] = await this.$transaction([
      this.story.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.story.count({ where })
    ])

    return { data, total, page, lastPage: Math.ceil(total / limit) }
  }

  private async assertOwnerOrAdmin(
    storyId: string,
    requester: JwtPayload
  ): Promise<void> {
    if (requester.role === UserRole.admin) return

    const story = await this.story.findUnique({
      where: { story_id: storyId },
      select: { authorId: true }
    })

    if (!story) throw new NotFoundException('Historia no encontrada.')
    if (story.authorId !== requester.sub)
      throw new ForbiddenException('No tienes permiso sobre esta historia.')
  }

  private estimateReadingTime(body: string): number {
    return Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 200))
  }
}
