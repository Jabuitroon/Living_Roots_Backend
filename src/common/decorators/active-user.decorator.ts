import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { RequestWithUser } from '../../auth/interfaces';

// Simpre necesitaré acceder al usuario autenticado, este decorador me permite hacerlo de forma sencilla en cualquier controlador o servicio
export const ActiveUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
