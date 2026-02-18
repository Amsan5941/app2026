# Fitness App Database Schema

## Core Tables

### 1. **users** (Already exists)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL UNIQUE REFERENCES auth.users,
  firstname TEXT NOT NULL,
  lastname TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 2. **bio_profile** (User fitness profile)
```sql
CREATE TABLE bio_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER,
  weight DECIMAL(10, 2),
  weight_unit TEXT NOT NULL DEFAULT 'lbs', -- 'lbs' or 'kg'
  height INTEGER, -- stored in inches (UI collects as feet + inches)
  height_unit TEXT NOT NULL DEFAULT 'inches', -- 'inches' or 'cm'
  sex TEXT, -- 'male', 'female', 'other'
  goal TEXT, -- 'cutting', 'bulking', 'maintaining'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bio_profile_user_id ON bio_profile(user_id);
CREATE UNIQUE INDEX idx_bio_profile_unique_user ON bio_profile(user_id);
```

---

### 3. **workout_sessions** (Workout session per day)
```sql
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,               -- e.g. "Push Day", "Leg Day"
  notes TEXT,
  duration_seconds INTEGER,         -- total workout duration
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ws_user_id ON workout_sessions(user_id);
CREATE INDEX idx_ws_date ON workout_sessions(workout_date);
CREATE INDEX idx_ws_user_date ON workout_sessions(user_id, workout_date DESC);
```

---

### 4. **session_exercises** (Individual exercises within a workout session)
```sql
CREATE TABLE session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,      -- e.g. "Bench Press", "Squats"
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_se_session_id ON session_exercises(session_id);
```

---

### 5. **exercise_sets** (Individual sets within an exercise)
```sql
CREATE TABLE exercise_sets (
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
```

---

### 6. ~~personal_records~~ (Legacy — see workout_sessions/session_exercises/exercise_sets above)
```sql
CREATE TABLE personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL, -- e.g., "Bench Press"
  weight DECIMAL(10, 2) NOT NULL,
  weight_unit TEXT NOT NULL DEFAULT 'lbs',
  reps INTEGER NOT NULL DEFAULT 1,
  achieved_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_personal_records_user_id ON personal_records(user_id);
CREATE INDEX idx_personal_records_exercise_name ON personal_records(exercise_name);
CREATE UNIQUE INDEX idx_pr_unique ON personal_records(user_id, exercise_name);
```

---

### 7. **body_weight** (Daily body weight tracking)
```sql
CREATE TABLE body_weight (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight DECIMAL(10, 2) NOT NULL,
  weight_unit TEXT NOT NULL DEFAULT 'lbs', -- 'lbs', 'kg'
  recorded_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_body_weight_user_id ON body_weight(user_id);
CREATE INDEX idx_body_weight_recorded_date ON body_weight(recorded_date);
CREATE UNIQUE INDEX idx_body_weight_daily ON body_weight(user_id, recorded_date);
```

---

### 8. **steps** (Daily step tracking)
```sql
CREATE TABLE steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step_count INTEGER NOT NULL DEFAULT 0,
  recorded_date DATE NOT NULL,
  source TEXT, -- 'manual', 'apple_health', 'google_fit', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_steps_user_id ON steps(user_id);
CREATE INDEX idx_steps_recorded_date ON steps(recorded_date);
CREATE UNIQUE INDEX idx_steps_daily ON steps(user_id, recorded_date);
```

---

### 9. **food_logs** (Main food log entry)
```sql
CREATE TABLE food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT, -- URL in Supabase storage
  total_calories DECIMAL(10, 2),
  total_protein DECIMAL(10, 2),
  total_carbs DECIMAL(10, 2),
  total_fat DECIMAL(10, 2),
  ai_confidence DECIMAL(5, 2), -- 0-100 confidence score from AI
  logged_date DATE NOT NULL,
  meal_type TEXT, -- 'breakfast', 'lunch', 'dinner', 'snack'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_food_logs_user_id ON food_logs(user_id);
CREATE INDEX idx_food_logs_logged_date ON food_logs(logged_date);
```

---

### 10. **food_items** (Individual foods within a meal)
```sql
CREATE TABLE food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_log_id UUID NOT NULL REFERENCES food_logs(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL, -- e.g., "Chicken Breast"
  serving_size TEXT, -- e.g., "100g", "1 cup"
  calories DECIMAL(10, 2),
  protein DECIMAL(10, 2),
  carbs DECIMAL(10, 2),
  fat DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_food_items_food_log_id ON food_items(food_log_id);
```

---

## Summary Table

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| **users** | Authentication & profiles | id, auth_id, firstname, lastname |
| **bio_profile** | User fitness profile | weight, height, sex, goal |
| **workout_sessions** | Workout sessions per day | name, workout_date, duration_seconds |
| **session_exercises** | Exercises within a session | exercise_name, sort_order |
| **exercise_sets** | Individual sets per exercise | set_number, reps, weight |
| **personal_records** | Best lifts | exercise_name, weight, achieved_date |
| **body_weight** | Daily weight | weight, weight_unit, recorded_date |
| **steps** | Daily steps | step_count, recorded_date |
| **food_logs** | Meals with images | image_url, total_calories, meal_type |
| **food_items** | Foods in each meal | food_name, calories, protein, carbs, fat |

---

## Key Design Decisions

1. **Composite Unique Indexes** on daily tracking tables (`body_weight`, `steps`) to prevent duplicate entries per day
2. **Foreign Keys with CASCADE DELETE** to maintain referential integrity
3. **Proper Indexes** on frequently queried columns (user_id, dates, exercise names)
4. **Flexible Units** (lbs/kg) stored in each record for international support
5. **AI Confidence Score** in food_logs to indicate reliability of AI-detected calories
6. **Separate food_items Table** - allows granular tracking of each food in a meal
7. **meal_type Field** - helps categorize food logs for insights (breakfast vs dinner)
8. **Storage URLs** for food images (stored in Supabase Storage bucket)

---

## Recommended Indexes for Performance

```sql
-- User-specific queries
CREATE INDEX idx_workouts_user_created ON workouts(user_id, created_at DESC);
CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, logged_date DESC);
CREATE INDEX idx_body_weight_user_date ON body_weight(user_id, recorded_date DESC);
CREATE INDEX idx_steps_user_date ON steps(user_id, recorded_date DESC);
```

---

## Storage Bucket (Supabase Storage)

Create a bucket called `food_images`:
```
/food_images/{user_id}/{timestamp}.jpg
```

---

## Future Extensions

- `workout_templates` - Save custom workout routines
- `water_intake` - Track daily water consumption
- `sleep_logs` - Track sleep patterns
- `goals` - User fitness goals & progress tracking
- `nutrition_targets` - Daily macro/calorie goals per user
