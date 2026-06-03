// Principio ISP: contratos mínimos y cohesivos.
// Principio DIP: el servicio depende de esta abstracción, no de Prisma directamente.

import { Story, StoryStatus } from '../../generated/prisma/client'
import { CreateStoryDto } from '../dto/create-story.dto'
import { UpdateStoryDto } from '../dto/update-story.dto'
import { StoryQueryDto } from '../dto/story-query.dto'

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  lastPage: number
}

export interface IStoryRepository {
  create(authorId: string, dto: CreateStoryDto): Promise<Story>
  findAll(query: StoryQueryDto): Promise<PaginatedResult<Story>>
  findOne(storyId: string)
  findByAuthor(
    authorId: string,
    query: StoryQueryDto
  ): Promise<PaginatedResult<Story>>
  update(storyId: string, dto: UpdateStoryDto): Promise<Story>
  updateStatus(storyId: string, status: StoryStatus): Promise<Story>
  delete(storyId: string): Promise<void>
  existsByIdAndAuthor(storyId: string, authorId: string): Promise<boolean>
}

export const STORY_REPOSITORY = Symbol('IStoryRepository')
