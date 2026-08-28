import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Headers,
  Req,
  Res,
  UnauthorizedException
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { Throttle } from '@nestjs/throttler'
import type { RequestWithCookies } from '../common/interfaces/request-with-cookies.interface'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import type { UserActiveInterface } from './interfaces'
import type { LoginResponse } from './interfaces'
import { LoginDto } from './dto/login.dto'
import { AuthGuard } from './guards/auth.guard'
import { ActiveUser } from '../common/decorators/active-user.decorator'
import { PreAuthGuard } from '../two-factor/guards/pre-auth.guard'
import { PreAuthUser } from '../two-factor/decorators/pre-auth-user.decorator'
import type { PreAuthPayload } from '../two-factor/interfaces'
import { VerifyTwoFactorDto } from '../two-factor/dto/verify-two-factor.dto'

const TRUSTED_DEVICE_COOKIE = 'trusted_device_token'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 300_000 } }) // 5 req / 5 min por IP
  @Post('register')
  async register(@Body() payload: RegisterDto): Promise<LoginResponse> {
    return this.authService.register(payload)
  }

  // Primer paso: email + password. Responde con el access_token directo
  // (si el dispositivo es confiable) o con un preAuthToken para completar
  // el segundo paso.
  @Throttle({ default: { limit: 5, ttl: 300_000 } }) // 5 req / 5 min por IP
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() payload: LoginDto,
    @Req() request: RequestWithCookies
  ): Promise<LoginResponse> {
    const trustedDeviceToken = request.cookies?.[TRUSTED_DEVICE_COOKIE]
    return this.authService.login(payload, trustedDeviceToken)
  }

  // Segundo paso: valida el código de 6 dígitos usando el preAuthToken
  // (Bearer) emitido por /auth/login. Si rememberDevice es true, setea la
  // cookie httpOnly del dispositivo confiable.
  @Throttle({ default: { limit: 10, ttl: 300_000 } }) // 10 req / 5 min por IP
  @HttpCode(HttpStatus.OK)
  @Post('login/verify-2fa')
  @UseGuards(PreAuthGuard)
  async verifyTwoFactor(
    @Body() payload: VerifyTwoFactorDto,
    @PreAuthUser() preAuth: PreAuthPayload,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.authService.verifyTwoFactor(
      preAuth.sub,
      payload,
      request.headers['user-agent']
    )

    if (result.trustedDevice) {
      response.cookie(TRUSTED_DEVICE_COOKIE, result.trustedDevice.rawToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        expires: result.trustedDevice.expiresAt
      })
    }

    return { access_token: result.access_token }
  }

  // Reenvía el código (invalida el anterior). También requiere el
  // preAuthToken del primer paso.
  @Throttle({ default: { limit: 3, ttl: 600_000 } }) // 3 req / 10 min por IP
  @HttpCode(HttpStatus.OK)
  @Post('login/resend-code')
  @UseGuards(PreAuthGuard)
  async resendCode(@PreAuthUser() preAuth: PreAuthPayload) {
    return this.authService.resendTwoFactorCode(preAuth.sub)
  }

  @Get('profile')
  @UseGuards(AuthGuard) // Asegura que solo los usuarios autenticados puedan acceder a esta ruta
  // Decorador personalizado para fijar metadatos de roles requeridos, injectar user a la request
  getProfile(@ActiveUser() user: UserActiveInterface) {
    return this.authService.getProfile(user)
  }

  @Post('refresh')
  async refresh(@Headers('authorization') authorization?: string) {
    if (!authorization) {
      throw new UnauthorizedException('Header Authorization no provisto')
    }

    const [type, token] = authorization.split(' ')

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Formato de token inválido')
    }

    return this.authService.refreshToken(token)
  }
}
