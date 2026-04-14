-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'client');

-- CreateEnum
CREATE TYPE "UserStatusEnum" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AuthProviderEnum" AS ENUM ('LOCAL', 'GOOGLE', 'FACEBOOK', 'OTHER');

-- CreateTable
CREATE TABLE "tbl_user" (
    "user_id" TEXT NOT NULL,
    "usu_name" TEXT NOT NULL,
    "usu_last_name" TEXT NOT NULL,
    "usu_phone" TEXT,
    "usu_email" TEXT NOT NULL,
    "usu_password" TEXT NOT NULL,
    "usu_role" "UserRole" NOT NULL DEFAULT 'client',
    "usu_avatar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,
    "emailConfirm" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnable" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "status" "UserStatusEnum" NOT NULL DEFAULT 'ACTIVE',
    "authProvider" "AuthProviderEnum" NOT NULL DEFAULT 'LOCAL',

    CONSTRAINT "tbl_user_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "tbl_herb" (
    "herb_Id" TEXT NOT NULL,
    "herb_name" TEXT NOT NULL,
    "herb_description" TEXT,
    "herb_preparation" TEXT,
    "herb_usage" TEXT,
    "herb_cultivator" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tbl_herb_pkey" PRIMARY KEY ("herb_Id")
);

-- CreateTable
CREATE TABLE "tbl_symptom" (
    "symptom_id" TEXT NOT NULL,
    "sym_name" TEXT NOT NULL,
    "sym_description" TEXT,

    CONSTRAINT "tbl_symptom_pkey" PRIMARY KEY ("symptom_id")
);

-- CreateTable
CREATE TABLE "tbl_herb_symptom" (
    "herb_id" TEXT NOT NULL,
    "symptom_id" TEXT NOT NULL,

    CONSTRAINT "tbl_herb_symptom_pkey" PRIMARY KEY ("herb_id","symptom_id")
);

-- CreateTable
CREATE TABLE "tbl_favorite" (
    "user_id" TEXT NOT NULL,
    "herb_id" TEXT NOT NULL,

    CONSTRAINT "tbl_favorite_pkey" PRIMARY KEY ("user_id","herb_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_user_usu_email_key" ON "tbl_user"("usu_email");

-- CreateIndex
CREATE INDEX "tbl_user_usu_email_idx" ON "tbl_user"("usu_email");

-- CreateIndex
CREATE INDEX "tbl_user_created_at_idx" ON "tbl_user"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_symptom_sym_name_key" ON "tbl_symptom"("sym_name");

-- AddForeignKey
ALTER TABLE "tbl_herb_symptom" ADD CONSTRAINT "tbl_herb_symptom_herb_id_fkey" FOREIGN KEY ("herb_id") REFERENCES "tbl_herb"("herb_Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_herb_symptom" ADD CONSTRAINT "tbl_herb_symptom_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "tbl_symptom"("symptom_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_favorite" ADD CONSTRAINT "tbl_favorite_herb_id_fkey" FOREIGN KEY ("herb_id") REFERENCES "tbl_herb"("herb_Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_favorite" ADD CONSTRAINT "tbl_favorite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
