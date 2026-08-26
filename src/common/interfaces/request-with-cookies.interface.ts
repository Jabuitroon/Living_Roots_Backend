import type { Request } from 'express'

// cookie-parser tipa `req.cookies` como `any` en sus @types
export interface RequestWithCookies extends Request {
  cookies: Record<string, string | undefined>
}
