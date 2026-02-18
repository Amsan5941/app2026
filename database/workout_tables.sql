-- ============================================================
-- Workout Tracking Tables
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- 1. workout_sessions: One row per workout session (e.g. "Push Day" on Feb 18)
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,               -- e.g. "Push Day", "Leg Day", "HIIT"
  notes TEXT,
  duration_seconds INTEGER,         -- total workout duration
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ws_user_id ON workout_sessions(user_id);
CREATE INDEX idx_ws_date ON workout_sessions(workout_date);
CREATE INDEX idx_ws_user_date ON workout_sessions(user_id, workout_date DESC);

-- 2. session_exercises: Individual exercises within a workout session
CREATE TABLE IF NOT EXISTS session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,      -- e.g. "Bench Press", "Squats"
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_se_session_id ON session_exercises(session_id);

-- 3. exercise_sets: Individual sets within an exercise
CREATE TABLE IF NOT EXISTS exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,      -- 1, 2, 3...
  reps INTEGER NOT NULL,
  weight DECIMAL(10, 2),            -- nullable for bodyweight exercises
  weight_unit TEXT NOT NULL DEFAULT 'lbs',
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_es_exercise_id ON exercise_sets(exercise_id);

-- ============================================================
-- Row-Level Security (RLS) Policies
-- ============================================================

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sets ENABLE ROW LEVEL SECURITY;

-- workout_sessions: users can only see/modify their own
CREATE POLICY "Users can view own workout sessions"
  ON workout_sessions FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert own workout sessions"
  ON workout_sessions FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update own workout sessions"
  ON workout_sessions FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete own workout sessions"
  ON workout_sessions FOR DELETE
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- session_exercises: accessible through workout_sessions ownership
CREATE POLICY "Users can view own session exercises"
  ON session_exercises FOR SELECT
  USING (session_id IN (
    SELECT id FROM workout_sessions
    WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  ));

CREATE POLICY "Users can insert own session exercises"
  ON session_exercises FOR INSERT
  WITH CHECK (session_id IN (
    SELECT id FROM workout_sessions
    WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  ));

CREATE POLICY "Users can update own session exercises"
  ON session_exercises FOR UPDATE
  USING (session_id IN (
    SELECT id FROM workout_sessions
    WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  ));

CREATE POLICY "Users can delete own session exercises"
  ON session_exercises FOR DELETE
  USING (session_id IN (
    SELECT id FROM workout_sessions
    WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  ));

-- exercise_sets: accessible through session_exercises -> workout_sessions ownership
CREATE POLICY "Users can view own exercise sets"
  ON exercise_sets FOR SELECT
  USING (exercise_id IN (
    SELECT se.id FROM session_exercises se
    JOIN workout_sessions ws ON ws.id = se.session_id
    WHERE ws.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  ));

CREATE POLICY "Users can insert own exercise sets"
  ON exercise_sets FOR INSERT
  WITH CHECK (exercise_id IN (
    SELECT se.id FROM session_exercises se
    JOIN workout_sessions ws ON ws.id = se.session_id
    WHERE ws.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  ));

CREATE POLICY "Users can update own exercise sets"
  ON exercise_sets FOR UPDATE
  USING (exercise_id IN (
    SELECT se.id FROM session_exercises se
    JOIN workout_sessions ws ON ws.id = se.session_id
    WHERE ws.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  ));

CREATE POLICY "Users can delete own exercise sets"
  ON exercise_sets FOR DELETE
  USING (exercise_id IN (
    SELECT se.id FROM session_exercises se
    JOIN workout_sessions ws ON ws.id = se.session_id
    WHERE ws.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  ));
