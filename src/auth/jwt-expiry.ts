import type { JwtSignOptions } from '@nestjs/jwt'

export function parseJwtExpiry(value: string): JwtSignOptions['expiresIn'] {
  const normalized = value.trim()
  return /^\d+$/.test(normalized)
    ? Number(normalized)
    : (normalized as JwtSignOptions['expiresIn'])
}
