-- Solution: Use Database Trigger to Auto-Create User Profile + Bio Profile
-- This ensures users AND bio_profile entries are created automatically when auth user is created

-- Step 1: Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Insert into users table with just the auth_id
  -- firstname/lastname will be updated by the app after
  INSERT INTO public.users (auth_id, firstname, lastname)
  VALUES (NEW.id, '', '')
  RETURNING id INTO new_user_id;

  -- Also create an empty bio_profile so the profile screen can
  -- immediately update it instead of requiring a separate insert path.
  INSERT INTO public.bio_profile (user_id)
  VALUES (new_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.bio_profile TO postgres, anon, authenticated, service_role;

-- Step 4: Test by checking if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
