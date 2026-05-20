-- CreateTable
CREATE TABLE "tbl_chat" (
    "chat_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chat_title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_active_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tbl_chat_pkey" PRIMARY KEY ("chat_id")
);

-- CreateTable
CREATE TABLE "tbl_chatMessage" (
    "chatMess_id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "chatMess_role" TEXT NOT NULL,
    "chatMess_parts" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_chatMessage_pkey" PRIMARY KEY ("chatMess_id")
);

-- CreateIndex
CREATE INDEX "tbl_chat_userId_idx" ON "tbl_chat"("userId");

-- CreateIndex
CREATE INDEX "tbl_chatMessage_chatId_idx" ON "tbl_chatMessage"("chatId");

-- AddForeignKey
ALTER TABLE "tbl_chatMessage" ADD CONSTRAINT "tbl_chatMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "tbl_chat"("chat_id") ON DELETE CASCADE ON UPDATE CASCADE;
