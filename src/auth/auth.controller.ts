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
  UnauthorizedException,
  Patch,
  Delete,
  Param,
  ParseUUIDPipe
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler'
import { PreAuthGuard } from '../two-factor/guards/pre-auth.guard'
import { AuthGuard } from './guards/auth.guard'
import { ActiveUser } from '../common/decorators/active-user.decorator'
import { PreAuthUser } from '../two-factor/decorators/pre-auth-user.decorator'
import { AuthService } from './auth.service'
import type { RequestWithCookies } from '../common/interfaces/request-with-cookies.interface'
import type { UserActiveInterface } from './interfaces'
import type { LoginResponse } from './interfaces'
import type { PreAuthPayload } from '../two-factor/interfaces'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { VerifyTwoFactorDto } from '../two-factor/dto/verify-two-factor.dto'
import { UpdateUserDto } from '@app/users/dto/update-user.dto'

const TRUSTED_DEVICE_COOKIE = 'trusted_device_token'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Registrar un nuevo usuario', description: 'Crea una cuenta con rol por defecto (client).' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o el email ya existe.' })
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @Post('register')
  async register(@Body() payload: RegisterDto): Promise<LoginResponse> {
    return this.authService.register(payload)
  }

  @ApiOperation({ summary: 'Iniciar sesión (Paso 1)', description: 'Valida credenciales. Retorna el access_token directo o un preAuthToken si el 2FA está activo.' })
  @ApiResponse({ status: 200, description: 'Login exitoso o requiere validación 2FA.' })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas.' })
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() payload: LoginDto,
    @Req() request: RequestWithCookies
  ): Promise<LoginResponse> {
    const trustedDeviceToken = request.cookies?.[TRUSTED_DEVICE_COOKIE]
    return this.authService.login(payload, trustedDeviceToken)
  }

  @ApiOperation({ summary: 'Verificar código 2FA (Paso 2)', description: 'Valida el código de 6 dígitos enviado por email.' })
  @ApiBearerAuth('PreAuthToken')
  @ApiResponse({ status: 200, description: 'Código verificado, retorna access_token.' })
  @ApiResponse({ status: 401, description: 'Código inválido o expirado.' })
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
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

  @ApiOperation({ summary: 'Reenviar código 2FA por email', description: 'Invalida el código anterior y genera uno nuevo.' })
  @ApiBearerAuth('PreAuthToken')
  @ApiResponse({ status: 200, description: 'Código reenviado exitosamente.' })
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login/resend-code')
  @UseGuards(PreAuthGuard)
  async resendCode(@PreAuthUser() preAuth: PreAuthPayload) {
    return this.authService.resendTwoFactorCode(preAuth.sub)
  }

  @ApiOperation({ summary: 'Obtener perfil del usuario activo' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Retorna los datos del usuario incluyendo su rol (admin/client).' })
  @Get('profile')
  @UseGuards(AuthGuard)
  getProfile(@ActiveUser() user: UserActiveInterface) {
    return this.authService.getProfile(user)
  }

  @ApiOperation({ summary: 'Listar dispositivos confiables', description: 'Dispositivos que superaron el 2FA y recordaron sesión.' })
  @ApiBearerAuth()
  @ApiCookieAuth(TRUSTED_DEVICE_COOKIE)
  @Get('profile/trusted-devices')
  @UseGuards(AuthGuard)
  getTrustedDevices(
    @ActiveUser() user: UserActiveInterface,
    @Req() request: RequestWithCookies
  ) {
    return this.authService.getTrustedDevices(
      user.sub,
      request.cookies?.[TRUSTED_DEVICE_COOKIE]
    )
  }

  @ApiOperation({ summary: 'Revocar acceso a un dispositivo confiable' })
  @ApiBearerAuth()
  @ApiResponse({ status: 204, description: 'Dispositivo revocado exitosamente.' })
  @Delete('profile/trusted-devices/:id')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  revokeTrustedDevice(
    @ActiveUser() user: UserActiveInterface,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.authService.revokeTrustedDevice(user.sub, id)
  }

  @ApiOperation({ summary: 'Actualizar perfil del usuario' })
  @ApiBearerAuth()
  @Patch('profile')
  @UseGuards(AuthGuard)
  updateProfile(
    @ActiveUser() user: UserActiveInterface,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.authService.updateProfile(user.sub, updateUserDto)
  }

  @ApiOperation({ summary: 'Refrescar access token', description: 'Requiere pasar el refresh_token en el header de Authorization (Bearer).' })
  @ApiResponse({ status: 200, description: 'Nuevo access_token generado.' })
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
