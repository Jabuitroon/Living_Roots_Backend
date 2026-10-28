import { randomInt } from 'crypto'

// Sin caracteres ambiguos (I, O, l, o, 0, 1) para que sea fácil de leer en el correo.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnpqrstuvwxyz'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%*?-_'
const ALL = UPPER + LOWER + DIGITS + SYMBOLS

const pick = (set: string): string => set[randomInt(set.length)]

// Genera una contraseña temporal (12 caracteres por defecto) con al menos
// una mayúscula, una minúscula, un número y un símbolo.
export function generateTemporaryPassword(length = 12): string {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)]
  while (chars.length < length) chars.push(pick(ALL))

  // Fisher-Yates con randomInt (criptográficamente seguro)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
