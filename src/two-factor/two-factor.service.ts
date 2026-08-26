import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { createHash, randomBytes, randomInt } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { HashingService } from '../providers/hashing/hashing.service'
import { MailerService } from '../providers/mailer/mailer.service'
import { PreAuthPayload, TrustedDeviceResult } from './interfaces'

const CODE_TTL_MINUTES = 5
const TRUSTED_DEVICE_TTL_DAYS = 60
const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService
  ) {}

  // ── Pre-auth token (JWT corto, secreto separado del access token) ──

  async signPreAuthToken(userId: string): Promise<string> {
    const payload: PreAuthPayload = { sub: userId, typ: 'pre_2fa' }
    return await this.jwtService.signAsync(payload)
  }

  async verifyPreAuthToken(token: string): Promise<PreAuthPayload> {
    return await this.jwtService.verifyAsync<PreAuthPayload>(token)
  }

  // ── Bloqueo temporal de cuenta ──

  async isLocked(userId: string): Promise<Date | null> {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { loginLockedUntil: true }
    })
    if (user?.loginLockedUntil && user.loginLockedUntil > new Date()) {
      return user.loginLockedUntil
    }
    return null
  }

  private async registerFailedAttempt(
    userId: string,
    codeId: string,
    attempts: number
  ): Promise<void> {
    if (attempts >= MAX_ATTEMPTS) {
      await this.prisma.$transaction([
        this.prisma.twoFactorCode.update({
          where: { id: codeId },
          data: { attempts, consumedAt: new Date() }
        }),
        this.prisma.user.update({
          where: { user_id: userId },
          data: {
            loginLockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
          }
        })
      ])
      return
    }

    await this.prisma.twoFactorCode.update({
      where: { id: codeId },
      data: { attempts }
    })
  }

  // ── Ciclo de vida del código ──

  async issueLoginCode(userId: string, email: string): Promise<void> {
    // Invalida cualquier código LOGIN previo sin consumir (resend-code
    // pasa por aquí también, así que un usuario nunca tiene dos códigos
    // válidos a la vez).
    await this.prisma.twoFactorCode.updateMany({
      where: { userId, purpose: 'LOGIN', consumedAt: null },
      data: { consumedAt: new Date() }
    })

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const codeHash = await this.hashingService.hash(code)

    await this.prisma.twoFactorCode.create({
      data: {
        userId,
        codeHash,
        purpose: 'LOGIN',
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000)
      }
    })

    await this.mailerService.sendTwoFactorCode(email, code)
  }

  async verifyLoginCode(userId: string, rawCode: string): Promise<boolean> {
    const activeCode = await this.prisma.twoFactorCode.findFirst({
      where: {
        userId,
        purpose: 'LOGIN',
        consumedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!activeCode) {
      return false
    }

    const isValid = await this.hashingService.compare(
      rawCode,
      activeCode.codeHash
    )

    if (!isValid) {
      await this.registerFailedAttempt(
        userId,
        activeCode.id,
        activeCode.attempts + 1
      )
      return false
    }

    await this.prisma.twoFactorCode.update({
      where: { id: activeCode.id },
      data: { consumedAt: new Date() }
    })

    return true
  }

  // ── Dispositivo confiable ──
  // El token del dispositivo es alta entropía (32 bytes aleatorios), a
  // diferencia del código de 6 dígitos o la contraseña. Por eso se guarda
  // con SHA-256 (permite buscarlo directo por igualdad en la BD) en vez
  // de bcrypt, que exige traer candidatos y comparar uno por uno.

  async issueTrustedDevice(
    userId: string,
    userAgent?: string
  ): Promise<TrustedDeviceResult> {
    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(
      Date.now() + TRUSTED_DEVICE_TTL_DAYS * 24 * 60 * 60_000
    )

    await this.prisma.trustedDevice.create({
      data: { userId, tokenHash, userAgent, expiresAt }
    })

    return { rawToken, expiresAt }
  }

  async isTrustedDevice(
    userId: string,
    rawToken: string | undefined
  ): Promise<boolean> {
    if (!rawToken) return false

    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const device = await this.prisma.trustedDevice.findUnique({
      where: { tokenHash }
    })

    if (!device || device.userId !== userId || device.expiresAt < new Date()) {
      return false
    }

    await this.prisma.trustedDevice.update({
      where: { id: device.id },
      data: { lastUsedAt: new Date() }
    })

    return true
  }
}
