/*
  Warnings:

  - A unique constraint covering the columns `[chatId,chatMess_client_id]` on the table `tbl_chatMessage` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "tbl_chatMessage" ADD COLUMN     "chatMess_client_id" TEXT;

-- CreateIndex
CREATE INDEX "tbl_chatMessage_chatId_created_at_idx" ON "tbl_chatMessage"("chatId", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_chatMessage_chatId_chatMess_client_id_key" ON "tbl_chatMessage"("chatId", "chatMess_client_id");
