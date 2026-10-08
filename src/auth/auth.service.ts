import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { PrismaService } from '../prisma/prisma.service'
import { UAParser } from 'ua-parser-js'

import { HashingService } from '../providers/hashing/hashing.service'
import { UsersService } from '../users/users.service'
import { TwoFactorService } from '../two-factor/two-factor.service'

import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { VerifyTwoFactorDto } from '../two-factor/dto/verify-two-factor.dto'
import { UpdateUserDto } from '@app/users/dto/update-user.dto'

import { TrustedDeviceResult } from '../two-factor/interfaces'
import { JwtPayload, LoginResponse, TrustedDeviceResponse } from './interfaces'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly hashingService: HashingService,
    private readonly twoFactorService: TwoFactorService
  ) {}

  // Lógica para registrar un usuario. Como el 2FA es obligatorio para
  // todos, el registro ya no entrega el access_token de una vez: crea al
  // usuario y dispara el mismo flujo de 2FA que el login, devolviendo un
  // preAuthToken para que el cliente complete el segundo paso.
  async register(newUser: RegisterDto): Promise<LoginResponse> {
    let user: { user_id: string; email: string }

    try {
      user = await this.usersService.create(newUser)
    } catch (error) {
      throw new InternalServerErrorException(
        `Error al crear el usuario: ${error}`
      )
    }

    await this.twoFactorService.issueLoginCode(user.user_id, user.email)
    const preAuthToken = await this.twoFactorService.signPreAuthToken(
      user.user_id
    )

    return { requires2FA: true, preAuthToken }
  }

  // Primer paso del login: valida credenciales y, según el caso, entrega
  // directo el access_token (dispositivo confiable) o dispara el 2FA.
  async login(
    { email, password }: LoginDto,
    trustedDeviceToken?: string
  ): Promise<LoginResponse> {
    const user = await this.usersService.findByEmail(email)
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado')
    }

    const isPasswordValid = await this.hashingService.compare(
      password.trim(),
      user.passwordHash
    )

    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña incorrecta')
    }

    const lockedUntil = await this.twoFactorService.isLocked(user.user_id)
    if (lockedUntil) {
      throw new UnauthorizedException(
        `Cuenta bloqueada temporalmente. Intenta de nuevo después de ${lockedUntil.toLocaleTimeString()}`
      )
    }

    const isTrusted = await this.twoFactorService.isTrustedDevice(
      user.user_id,
      trustedDeviceToken
    )
    if (isTrusted) {
      return {
        requires2FA: false,
        access_token: await this.issueAccessToken(user)
      }
    }

    await this.twoFactorService.issueLoginCode(user.user_id, user.email)
    const preAuthToken = await this.twoFactorService.signPreAuthToken(
      user.user_id
    )

    return { requires2FA: true, preAuthToken }
  }

  // Segundo paso del login: valida el código de 6 dígitos.
  async verifyTwoFactor(
    userId: string,
    { code, rememberDevice }: VerifyTwoFactorDto,
    userAgent?: string
  ): Promise<{ access_token: string; trustedDevice?: TrustedDeviceResult }> {
    const lockedUntil = await this.twoFactorService.isLocked(userId)
    if (lockedUntil) {
      throw new UnauthorizedException(
        'Cuenta bloqueada temporalmente por intentos fallidos'
      )
    }

    const isValid = await this.twoFactorService.verifyLoginCode(userId, code)
    if (!isValid) {
      throw new UnauthorizedException('Código inválido o expirado')
    }

    const user = await this.usersService.findById(userId)
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado')
    }

    const access_token = await this.issueAccessToken(user)

    if (rememberDevice) {
      const trustedDevice = await this.twoFactorService.issueTrustedDevice(
        userId,
        userAgent
      )
      return { access_token, trustedDevice }
    }

    return { access_token }
  }

  // Reenvío del código (invalida el anterior y genera uno nuevo).
  async resendTwoFactorCode(userId: string): Promise<{ success: true }> {
    const lockedUntil = await this.twoFactorService.isLocked(userId)
    if (lockedUntil) {
      throw new UnauthorizedException('Cuenta bloqueada temporalmente')
    }

    const user = await this.usersService.findById(userId)
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado')
    }

    await this.twoFactorService.issueLoginCode(userId, user.email)
    return { success: true }
  }

  async getProfile({ sub }: { sub: string }) {
    const user = await this.usersService.findById(sub)
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado')
    }
    return {
      user_id: user.user_id,
      name: user.name,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar
    }
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    try {
      return await this.usersService.update(userId, updateUserDto)
    } catch (error) {
      throw new InternalServerErrorException(
        `Error al actualizar el usuario: ${error}`
      )
    }
  }

  private async hashToken(token: string): Promise<string> {
    return await this.hashingService.hash(token)
  }

  private parseUserAgent(ua: string | null) {
    if (!ua) {
      return {
        browser: 'Navegador desconocido',
        os: 'Sistema desconocido',
        deviceType: 'desktop' as const
      }
    }
    const { browser, os, device } = new UAParser(ua).getResult()

    const major = browser.version?.split('.')[0]
    const browserLabel = browser.name
      ? `${browser.name}${major ? ` ${major}` : ''}`
      : 'Navegador desconocido'
    const osLabel = os.name
      ? `${os.name}${os.version ? ` ${os.version}` : ''}`
      : 'Sistema desconocido'

    const deviceType =
      device.type === 'mobile'
        ? 'mobile'
        : device.type === 'tablet'
          ? 'tablet'
          : 'desktop'

    return { browser: browserLabel, os: osLabel, deviceType } as const
  }

  async getTrustedDevices(
    userId: string,
    currentToken?: string
  ): Promise<TrustedDeviceResponse[]> {
    const currentHash = currentToken ? await this.hashToken(currentToken) : null

    const rows = await this.prisma.trustedDevice.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        tokenHash: true,
        userAgent: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true
      }
    })

    // Prisma no soporta COALESCE en orderBy: la lista es pequeña, se ordena en memoria.
    rows.sort(
      (a, b) =>
        (b.lastUsedAt ?? b.createdAt).getTime() -
        (a.lastUsedAt ?? a.createdAt).getTime()
    )

    return rows.map((row) => ({
      id: row.id,
      ...this.parseUserAgent(row.userAgent),
      expiresAt: row.expiresAt,
      lastUsedAt: row.lastUsedAt,
      isCurrent: currentHash !== null && row.tokenHash === currentHash
    }))
  }

  async revokeTrustedDevice(userId: string, deviceId: string): Promise<void> {
    // deleteMany con userId garantiza que solo puedes revocar tus propios dispositivos
    const { count } = await this.prisma.trustedDevice.deleteMany({
      where: { id: deviceId, userId }
    })
    if (count === 0) throw new NotFoundException('Dispositivo no encontrado')
  }

  private async issueAccessToken(user: {
    user_id: string
    email: string
    role: string
  }): Promise<string> {
    const payload = { sub: user.user_id, email: user.email, role: user.role }
    return await this.jwtService.signAsync(payload)
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload: JwtPayload =
        await this.jwtService.verifyAsync(refreshToken)
      const { iat, exp, ...result } = payload
      return await this.jwtService.signAsync(result, {
        expiresIn: '8hrs'
      })
      // } catch (error) {
      //   throw new UnauthorizedException(`No refresh ${error}`)
      // }
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado')
    }
  }
}
