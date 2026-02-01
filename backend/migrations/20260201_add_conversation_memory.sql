-- Migration: Add conversation memory fields to semantic_requests
-- Date: 2026-02-01
-- Description: Add messageIndex and parentRequestId for multi-turn conversation tracking
-- Add new columns
ALTER TABLE semantic_requests
ADD COLUMN IF NOT EXISTS messageIndex INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS parentRequestId VARCHAR(36);
-- Create index for parent request lookups
CREATE INDEX IF NOT EXISTS idx_semantic_requests_parent ON semantic_requests(parentRequestId);
-- Create composite index for conversation ordering
CREATE INDEX IF NOT EXISTS idx_semantic_requests_conversation_order ON semantic_requests(conversationId, messageIndex);
-- Update existing records to have messageIndex = 0
UPDATE semantic_requests
SET messageIndex = 0
WHERE messageIndex IS NULL;
-- Add comment
COMMENT ON COLUMN semantic_requests.messageIndex IS 'Position of message in conversation (0-based)';
COMMENT ON COLUMN semantic_requests.parentRequestId IS 'ID of previous message in conversation thread';