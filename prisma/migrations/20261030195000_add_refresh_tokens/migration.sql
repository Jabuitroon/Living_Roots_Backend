CREATE TABLE "tbl_refresh_token" (
    "id" TEXT NOT NULL,
    "rft_user_id" TEXT NOT NULL,
    "rft_token_hash" TEXT NOT NULL,
    "rft_expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_refresh_token_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tbl_refresh_token_rft_token_hash_key"
    ON "tbl_refresh_token"("rft_token_hash");

CREATE INDEX "tbl_refresh_token_rft_user_id_rft_expires_at_idx"
    ON "tbl_refresh_token"("rft_user_id", "rft_expires_at");

ALTER TABLE "tbl_refresh_token"
    ADD CONSTRAINT "tbl_refresh_token_rft_user_id_fkey"
    FOREIGN KEY ("rft_user_id") REFERENCES "tbl_user"("user_id")
    ON DELETE CASCADE ON UPDATE CASCADE;
