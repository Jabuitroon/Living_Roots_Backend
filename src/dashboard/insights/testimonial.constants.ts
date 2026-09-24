// AJUSTAR: ruta al cliente generado por Prisma (la de `output` en tu generator).
import type { Prisma } from '../../generated/prisma/client'

/**
 * Única fuente de verdad de qué `Story` cuenta como testimonio (HU-11).
 * La usan el cron de extracción y las consultas de agregación.
 * Si cambia el criterio (p. ej. un campo `type`), se cambia solo aquí.
 *
 * `satisfies` hace que TypeScript valide el objeto contra Prisma justo aquí
 * (un typo en el enum falla en esta línea) y `as const` conserva los literales.
 */
export const TESTIMONIAL_STORY_WHERE = {
  status: 'PUBLISHED',
  category: 'TRADITIONAL_MEDICINE'
} as const satisfies Prisma.StoryWhereInput
