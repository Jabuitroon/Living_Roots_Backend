import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from '@nestjs/common'

import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { Role } from '../enums'
import { RequestWithUser } from '../interfaces'
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    // Verificar si la ruta es pública y tomar tiempo inicial
    const start = performance.now()

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ])

    if (isPublic) {
      return true
    }

    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ])

    if (!roles) {
      return true
    }

    // El context existe porque el AuthGuard se ejecuta antes que el RolesGuard, y el AuthGuard (Tuvo que haberse autenticado)agrega el usuario al request
    const request = context.switchToHttp().getRequest<RequestWithUser>()

    const { user } = request
    const duration = performance.now() - start

    if (!user) {
      console.log(`[SECURITY] Unauthorized access attempt`, {
        method: request.method,
        route: request.originalUrl ?? request.url,
        durationMs: Number(duration.toFixed(2)),
        reason: 'USER_NOT_AUTHENTICATED'
      })

      throw new ForbiddenException()
    }

    const authorized = roles.includes(user.role)

    if (!authorized) {
      console.log(`[SECURITY] Unauthorized access attempt`, {
        userId: user.sub ?? user.sub,
        role: user.role,
        method: request.method,
        route: request.originalUrl ?? request.url,
        requiredRoles: roles,
        durationMs: Number(duration.toFixed(2)),
        reason: 'INSUFFICIENT_ROLE'
      })

      throw new ForbiddenException(
        'No tienes permisos para realizar esta operación'
      )
    }
    return true
  }
}
