/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common'
import { UsersService } from '../users/users.service'
import { JwtService } from '@nestjs/jwt'
import { RegisterDto } from './dto/register.dto'
import { HashingService } from '../providers/hashing/hashing.service'
import { LoginDto } from './dto/login.dto'
import { JwtPayload, LoginResponse } from './interfaces'
import { TwoFactorService } from '../two-factor/two-factor.service'
import { VerifyTwoFactorDto } from '../two-factor/dto/verify-two-factor.dto'
import { TrustedDeviceResult } from '../two-factor/interfaces'
import { RefreshTokenDto } from './dto/refresh-token.dto'

@Injectable()
export class AuthService {
  constructor(
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
      id: user.user_id,
      email: user.email,
      role: user.role
    }
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
