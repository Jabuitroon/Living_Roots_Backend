import { UnauthorizedException } from '@nestjs/common'
import { createHash } from 'crypto'
import { AuthService } from './auth.service'

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {}
}))
jest.mock('../users/users.service', () => ({
  UsersService: class UsersService {}
}))
jest.mock('../providers/hashing/hashing.service', () => ({
  HashingService: class HashingService {}
}))
jest.mock('../two-factor/two-factor.service', () => ({
  TwoFactorService: class TwoFactorService {}
}))

interface StoredRefreshToken {
  id: string
  userId: string
  expiresAt: Date
}

interface FindRefreshTokenArgs {
  where: { tokenHash: string }
}

interface UpdateRefreshTokenArgs {
  where: {
    id: string
    tokenHash: string
    expiresAt: { gt: Date }
  }
  data: { tokenHash: string; expiresAt: Date }
}

describe('AuthService refresh tokens', () => {
  const refreshToken = 'current-refresh-token'
  const tokenHash = createHash('sha256').update(refreshToken).digest('hex')
  const storedToken = {
    id: 'refresh-session-id',
    userId: 'user-id',
    expiresAt: new Date(Date.now() + 60_000)
  }

  let prisma: {
    refreshToken: {
      findUnique: jest.Mock<
        Promise<StoredRefreshToken | null>,
        [FindRefreshTokenArgs]
      >
      updateMany: jest.Mock<
        Promise<{ count: number }>,
        [UpdateRefreshTokenArgs]
      >
      deleteMany: jest.Mock<
        Promise<{ count: number }>,
        [{ where: { tokenHash: string } }]
      >
    }
  }
  let usersService: {
    findById: jest.Mock<
      Promise<{ user_id: string; email: string; role: string } | null>,
      [string]
    >
  }
  let jwtService: { signAsync: jest.Mock<Promise<string>, [object]> }
  let service: AuthService

  beforeEach(() => {
    prisma = {
      refreshToken: {
        findUnique: jest
          .fn<Promise<StoredRefreshToken | null>, [FindRefreshTokenArgs]>()
          .mockResolvedValue(storedToken),
        updateMany: jest
          .fn<Promise<{ count: number }>, [UpdateRefreshTokenArgs]>()
          .mockResolvedValue({ count: 1 }),
        deleteMany: jest
          .fn<Promise<{ count: number }>, [{ where: { tokenHash: string } }]>()
          .mockResolvedValue({ count: 1 })
      }
    }
    usersService = {
      findById: jest
        .fn<
          Promise<{ user_id: string; email: string; role: string } | null>,
          [string]
        >()
        .mockResolvedValue({
          user_id: 'user-id',
          email: 'user@example.com',
          role: 'client'
        })
    }
    jwtService = {
      signAsync: jest
        .fn<Promise<string>, [object]>()
        .mockResolvedValue('new-access-token')
    }
    service = new AuthService(
      prisma as never,
      usersService as never,
      jwtService as never,
      {} as never,
      {} as never
    )
  })

  it('rotates a valid refresh token and returns a new token pair', async () => {
    const result = await service.refreshToken(refreshToken)
    const update = prisma.refreshToken.updateMany.mock.calls[0][0]

    expect(result.access_token).toBe('new-access-token')
    expect(result.refresh_token).not.toBe(refreshToken)
    expect(update.where.id).toBe(storedToken.id)
    expect(update.where.tokenHash).toBe(tokenHash)
    expect(update.where.expiresAt.gt).toBeInstanceOf(Date)
    expect(update.data.tokenHash).toBe(
      createHash('sha256').update(result.refresh_token).digest('hex')
    )
    expect(update.data.expiresAt).toBeInstanceOf(Date)
  })

  it('rejects expired refresh tokens without rotating them', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      ...storedToken,
      expiresAt: new Date(Date.now() - 1)
    })

    await expect(service.refreshToken(refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException
    )
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled()
  })

  it('rejects a token already used by a concurrent refresh request', async () => {
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 })

    await expect(service.refreshToken(refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })

  it('revokes only the hash of the supplied token', async () => {
    await service.revokeRefreshToken(refreshToken)

    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash }
    })
  })
})
