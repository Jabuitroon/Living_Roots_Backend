import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { Request } from 'express'
import { TwoFactorService } from '../two-factor.service'

// A propósito NO reutiliza el AuthGuard existente: el pre-auth token se
// firma y valida con un secreto distinto (JWT_PRE_AUTH_SECRET), así que
// aunque alguien intentara usarlo como Bearer token en una ruta protegida
// normal, el AuthGuard actual jamás podría verificarlo.
@Injectable()
export class PreAuthGuard implements CanActivate {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest()
    const token = this.extractTokenFromHeader(request)

    if (!token) {
      throw new UnauthorizedException('Token de verificación no proporcionado')
    }

    try {
      const payload = await this.twoFactorService.verifyPreAuthToken(token)
      if (payload.typ !== 'pre_2fa') {
        throw new UnauthorizedException()
      }
      request['preAuth'] = payload
    } catch {
      throw new UnauthorizedException(
        'Token de verificación inválido o expirado'
      )
    }

    return true
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }
}
