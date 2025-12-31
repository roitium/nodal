CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "idx_memos_content_trgm" ON "memos" USING gin ("content" gin_trgm_ops);