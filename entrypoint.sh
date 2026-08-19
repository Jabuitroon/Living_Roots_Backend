#!/bin/sh
# Salir inmediatamente si un comando falla
set -e

echo "Ejecutando migraciones de base de datos..."
npx prisma migrate deploy

echo "Iniciando el servidor NestJS..."
exec node dist/main.js