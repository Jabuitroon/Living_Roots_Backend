import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { PreAuthPayload } from '../interfaces'

export const PreAuthUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PreAuthPayload => {
    const request = ctx.switchToHttp().getRequest()
    return request.preAuth
  }
)
