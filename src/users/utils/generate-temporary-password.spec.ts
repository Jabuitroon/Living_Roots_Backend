import { generateTemporaryPassword } from './generate-temporary-password'

describe('generateTemporaryPassword', () => {
  it('genera 12 caracteres por defecto', () => {
    expect(generateTemporaryPassword()).toHaveLength(12)
  })

  it('respeta la longitud pedida', () => {
    expect(generateTemporaryPassword(20)).toHaveLength(20)
  })

  it('incluye mayúscula, minúscula, número y símbolo, sin caracteres ambiguos', () => {
    for (let i = 0; i < 200; i++) {
      const pwd = generateTemporaryPassword()
      expect(pwd).toMatch(/[A-Z]/)
      expect(pwd).toMatch(/[a-z]/)
      expect(pwd).toMatch(/[0-9]/)
      expect(pwd).toMatch(/[!@#$%*?\-_]/)
      expect(pwd).not.toMatch(/[IOlo01]/)
    }
  })

  it('no repite contraseñas', () => {
    const set = new Set(
      Array.from({ length: 500 }, () => generateTemporaryPassword())
    )
    expect(set.size).toBe(500)
  })
})
