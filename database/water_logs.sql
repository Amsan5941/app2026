-- ============================================================
-- Water Tracking Table
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- water_logs: one row per glass of water logged
CREATE TABLE IF NOT EXISTS water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  glasses INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: one row per user per day
CREATE UNIQUE INDEX idx_wl_user_date ON water_logs(user_id, logged_date);
CREATE INDEX idx_wl_user_id ON water_logs(user_id);

-- ============================================================
-- Row-Level Security (RLS) Policies
-- ============================================================

ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own water logs"
  ON water_logs FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert own water logs"
  ON water_logs FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update own water logs"
  ON water_logs FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete own water logs"
  ON water_logs FOR DELETE
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
