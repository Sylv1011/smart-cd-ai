-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

UPDATE offers SET status = 'active' WHERE status IS NULL;
