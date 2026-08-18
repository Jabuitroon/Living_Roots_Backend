-- Migration: add_herb_embedding
-- Reemplaza el contenido del archivo generado por
-- `npx prisma migrate dev --create-only --name add_herb_embedding`
-- con esto (Prisma no sabe generar el tipo vector ni el índice ivfflat por sí solo).

-- 1. Extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Enum
CREATE TYPE "EmbeddingSource" AS ENUM ('HERB_PROFILE', 'HERB_SYMPTOM');

-- 3. Tabla
CREATE TABLE "tbl_herb_embedding" (
    "embedding_id" TEXT NOT NULL,
    "herb_id"      TEXT NOT NULL,
    "source_type"  "EmbeddingSource" NOT NULL,
    "source_id"    TEXT NOT NULL,
    "content"      TEXT NOT NULL,
    "embedding"    vector(768) NOT NULL,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tbl_herb_embedding_pkey" PRIMARY KEY ("embedding_id")
);

-- 4. Unique compuesto: target de ON CONFLICT para el upsert idempotente del worker
CREATE UNIQUE INDEX "tbl_herb_embedding_herb_id_source_type_source_id_key"
  ON "tbl_herb_embedding"("herb_id", "source_type", "source_id");

-- 5. Índice de lookup simple (para el DELETE por herbId cuando action = 'delete')
CREATE INDEX "tbl_herb_embedding_herb_id_idx" ON "tbl_herb_embedding"("herb_id");

-- 6. Foreign key hacia Herb (cascade: si se borra la planta, se borran sus embeddings)
ALTER TABLE "tbl_herb_embedding"
  ADD CONSTRAINT "tbl_herb_embedding_herb_id_fkey"
  FOREIGN KEY ("herb_id") REFERENCES "tbl_herb"("herb_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Índice ivfflat para similitud por coseno
-- IMPORTANTE: ivfflat construye clusters ("lists") a partir de los datos existentes.
-- Con la tabla vacía, este índice queda mal calibrado (0 filas de referencia).
-- Dos opciones:
--   a) Ejecutar este bloque AHORA con lists bajo (funciona igual, solo subóptimo)
--      y luego, una vez cargado el corpus real (post cp0-cp2), correr:
--        REINDEX INDEX tbl_herb_embedding_embedding_cosine_idx;
--   b) Comentar este bloque y crearlo en una migración aparte después de cargar datos.
-- Con un corpus chico (decenas/cientos de plantas), "lists" bajo (10) es correcto —
-- la regla general es lists ≈ sqrt(filas), y ese número lo vas a saber recién en cp0_corpus.py.
CREATE INDEX "tbl_herb_embedding_embedding_cosine_idx"
  ON "tbl_herb_embedding"
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);