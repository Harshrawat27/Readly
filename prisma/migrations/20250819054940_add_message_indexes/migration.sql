-- CreateIndex
CREATE INDEX "message_chatId_createdAt_idx" ON "message"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "message_userId_createdAt_idx" ON "message"("userId", "createdAt");
