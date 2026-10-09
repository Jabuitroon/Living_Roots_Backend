-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- DropForeignKey
ALTER TABLE "tbl_trusted_device" DROP CONSTRAINT "tbl_trusted_device_trd_user_id_fkey";

-- DropForeignKey
ALTER TABLE "tbl_two_factor_code" DROP CONSTRAINT "tbl_two_factor_code_tfc_user_id_fkey";

-- AddForeignKey
ALTER TABLE "tbl_two_factor_code" ADD CONSTRAINT "tbl_two_factor_code_tfc_user_id_fkey" FOREIGN KEY ("tfc_user_id") REFERENCES "tbl_user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_trusted_device" ADD CONSTRAINT "tbl_trusted_device_trd_user_id_fkey" FOREIGN KEY ("trd_user_id") REFERENCES "tbl_user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
