-- HU-11 · Datos de prueba para el dashboard (SOLO base de datos de DESARROLLO)
-- Todos los registros usan el prefijo 'seed-hu11-' para poder borrarlos sin tocar tus datos.
--
-- Efecto esperado en las métricas (sobre lo que ya tengas en la BD):
--   herbs                         +4
--   families                      +2   ("Familia Seed Pérez" con 3 variantes de escritura + "Familia Seed Cañas")
--   consultations.total           +6
--   consultations.inRange         days=7 -> +3 | days=30 -> +4 | days=90 -> +5   (el chat de hace 120 días queda fuera)
--   herbsWithoutSymptoms          +2   (Seed Sauco y Seed Ruda)
--   symptomsWithoutHerbs          +1   (Seed Sin plantas)
--
-- IMPORTANTE: este SQL no pasa por el backend, así que no dispara ninguna invalidación de caché.
-- Después de ejecutarlo (y después de limpiar) reinicia el backend o espera 10 minutos
-- antes de probar en Insomnia.
--
-- Nota: created_at es `timestamp` sin zona y Prisma lo guarda en UTC, por eso se usa
-- (now() AT TIME ZONE 'UTC') y no now() a secas.

-- Síntomas
INSERT INTO tbl_symptom (symptom_id, sym_name) VALUES
  ('seed-hu11-sym-1', 'Seed Tos'),
  ('seed-hu11-sym-2', 'Seed Sin plantas');

-- Plantas (3 escrituras distintas de la misma familia + una con ñ)
INSERT INTO tbl_herb (herb_id, herb_name, herb_description, herb_img, herb_cultivator, created_at, updated_at) VALUES
  ('seed-hu11-herb-1', 'Seed Manzanilla', 'Planta de prueba', 'seed.png', 'Familia Seed Pérez',   now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'),
  ('seed-hu11-herb-2', 'Seed Sauco',      'Planta de prueba', 'seed.png', ' familia seed perez ', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'),
  ('seed-hu11-herb-3', 'Seed Cidrón',     'Planta de prueba', 'seed.png', 'FAMILIA SEED PÉREZ',  now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'),
  ('seed-hu11-herb-4', 'Seed Ruda',       'Planta de prueba', 'seed.png', 'Familia Seed Cañas',   now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC');

-- Tratamientos: solo Manzanilla y Cidrón tienen síntoma (Sauco y Ruda quedan sin síntomas)
INSERT INTO tbl_treatment (herb_id, symptom_id, tre_parts_plant, tre_prepare) VALUES
  ('seed-hu11-herb-1', 'seed-hu11-sym-1', 'flores', 'infusión'),
  ('seed-hu11-herb-3', 'seed-hu11-sym-1', 'hojas',  'infusión');

-- Chats guardados: 2 de hoy, y otros de hace 3, 20, 60 y 120 días
INSERT INTO tbl_chat (chat_id, "userId", created_at, updated_at, last_active_at) VALUES
  ('seed-hu11-chat-1', 'seed-hu11-user', (now() AT TIME ZONE 'UTC'),                        (now() AT TIME ZONE 'UTC'), (now() AT TIME ZONE 'UTC')),
  ('seed-hu11-chat-2', 'seed-hu11-user', (now() AT TIME ZONE 'UTC'),                        (now() AT TIME ZONE 'UTC'), (now() AT TIME ZONE 'UTC')),
  ('seed-hu11-chat-3', 'seed-hu11-user', (now() AT TIME ZONE 'UTC') - interval '3 days',    (now() AT TIME ZONE 'UTC'), (now() AT TIME ZONE 'UTC')),
  ('seed-hu11-chat-4', 'seed-hu11-user', (now() AT TIME ZONE 'UTC') - interval '20 days',   (now() AT TIME ZONE 'UTC'), (now() AT TIME ZONE 'UTC')),
  ('seed-hu11-chat-5', 'seed-hu11-user', (now() AT TIME ZONE 'UTC') - interval '60 days',   (now() AT TIME ZONE 'UTC'), (now() AT TIME ZONE 'UTC')),
  ('seed-hu11-chat-6', 'seed-hu11-user', (now() AT TIME ZONE 'UTC') - interval '120 days',  (now() AT TIME ZONE 'UTC'), (now() AT TIME ZONE 'UTC'));

  -- HU-11 · Borra SOLO los datos creados por HU-11-datos-de-prueba.sql (prefijo 'seed-hu11-').
-- Los tratamientos se eliminan en cascada al borrar las plantas y los síntomas.
-- Como no pasa por el backend, reinicia el backend (o espera 10 minutos) para que la caché se renueve.

DELETE FROM tbl_chat    WHERE chat_id    LIKE 'seed-hu11-%';
DELETE FROM tbl_herb    WHERE herb_id    LIKE 'seed-hu11-%';
DELETE FROM tbl_symptom WHERE symptom_id LIKE 'seed-hu11-%';