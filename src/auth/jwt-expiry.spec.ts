import { JwtService } from '@nestjs/jwt'
import { parseJwtExpiry } from './jwt-expiry'

describe('parseJwtExpiry', () => {
  it('treats a numeric environment value as seconds', () => {
    const jwt = new JwtService({ secret: 'test-secret' })
    const token = jwt.sign({}, { expiresIn: parseJwtExpiry('3600') })
    const payload = jwt.decode(token)

    if (
      !payload ||
      typeof payload === 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      throw new Error('JWT payload is missing issued-at or expiry claims')
    }
    expect(payload.exp - payload.iat).toBe(3600)
  })

  it('preserves explicit duration units', () => {
    expect(parseJwtExpiry('3600s')).toBe('3600s')
  })
})
