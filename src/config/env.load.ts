import { z } from 'zod'

// Esquema de validación de variables de entorno con ZOD
export const envSchema = z.object({
  PORT: z.coerce.number().min(1, 'PORT is required.').default(3000),
  // Un str que se transformará en un array de dominios separados por comandos
  ALLOWED_ORIGINS: z.string().min(1, 'ALLOWED_ORIGINS is required.'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required.'),
  RESEND_FROM_EMAIL: z.string().min(1, 'RESEND_FROM_EMAIL is required.'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required.'),
  JWT_EXPIRES_IN: z.string().min(1, 'JWT_EXPIRES_IN is required.'),
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required.')
})

export type Env = z.infer<typeof envSchema>

export function validate(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config)

  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format())
    throw new Error('Invalid environment variables')
  }

  return result.data
}
