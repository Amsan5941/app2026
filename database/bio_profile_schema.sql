-- Bio Profile Table for User Fitness Information
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE bio_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER,
  weight DECIMAL(10, 2), -- in lbs or kg
  goal_weight DECIMAL(10, 2), -- user's target weight (lbs or kg)
  weight_unit TEXT NOT NULL DEFAULT 'lbs', -- 'lbs' or 'kg'
  height INTEGER, -- in feet or cm
  height_unit TEXT NOT NULL DEFAULT 'feet', -- 'feet' or 'cm'
  sex TEXT, -- 'male', 'female', 'other', 'prefer_not_to_say'
  goal TEXT, -- 'cutting', 'bulking', 'maintaining'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX idx_bio_profile_user_id ON bio_profile(user_id);

-- Ensure one bio profile per user
CREATE UNIQUE INDEX idx_bio_profile_unique_user ON bio_profile(user_id);

-- Optional: Add a trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_bio_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bio_profile_updated_at
  BEFORE UPDATE ON bio_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_bio_profile_updated_at();
