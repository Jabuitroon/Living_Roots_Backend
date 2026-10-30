-- AlterEnum
-- Los valores nuevos van en su propia migración: PostgreSQL no permite usar
-- un valor de enum recién agregado dentro de la misma transacción.
ALTER TYPE "CulturalCategory" ADD VALUE IF NOT EXISTS 'THERAPEUTIC';
ALTER TYPE "CulturalCategory" ADD VALUE IF NOT EXISTS 'PREVENTIVE';
ALTER TYPE "CulturalCategory" ADD VALUE IF NOT EXISTS 'SPIRITUAL';
