-- Enable replication for Realtime on critical live-updating tables
-- This allows clients to subscribe to changes via Supabase Realtime channels

BEGIN;

-- Ensure the publication exists (Supabase creates this by default, but safe to check/create)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add the tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

COMMIT;
