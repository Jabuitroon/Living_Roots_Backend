/**
 * Consultas guardadas por bucket (día o semana) en la zona horaria del dashboard.
 *
 * Parámetros: $1 = 'day' | 'week', $2 = zona IANA, $3 = inicio de ventana (ISO, UTC).
 *
 * Ojo con la doble conversión: Prisma guarda `timestamp(3)` (sin zona) en UTC.
 * `created_at AT TIME ZONE 'UTC'` lo convierte a instante (timestamptz) y el segundo
 * `AT TIME ZONE $2` lo pasa a hora local. Con un solo AT TIME ZONE se interpretaría
 * la hora UTC como si fuera local y los buckets quedarían desfasados.
 *
 * `created_at` queda "desnuda" en el WHERE para poder usar el índice de tbl_chat.
 */
export const CONSULTATIONS_TREND_SQL = `
SELECT to_char(
         date_trunc($1, (created_at AT TIME ZONE 'UTC') AT TIME ZONE $2),
         'YYYY-MM-DD'
       ) AS bucket,
       COUNT(*)::int AS count
FROM tbl_chat
WHERE created_at >= $3::timestamp
GROUP BY 1
ORDER BY 1
`
