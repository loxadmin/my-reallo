-- Chrome Extension Integration: Points System
-- 1. Ensure the points column exists in profiles (main user table)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points NUMERIC DEFAULT 0;

-- 2. Ensure points are never negative (Data Integrity Requirement)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'points_non_negative') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT points_non_negative CHECK (points >= 0);
    END IF;
END $$;

-- 3. Required function: add_user_points
-- Increments user's points balance securely and handles null values safely
CREATE OR REPLACE FUNCTION public.add_user_points(
  p_user_id uuid,
  p_points numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET points = COALESCE(points, 0) + COALESCE(p_points, 0)
  WHERE id = p_user_id;
END;
$$;

-- 4. Permissions
-- Grant execute permissions to authenticated users and the service role
GRANT EXECUTE ON FUNCTION public.add_user_points(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_points(uuid, numeric) TO service_role;
