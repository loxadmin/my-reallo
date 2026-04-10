-- Chrome Extension Integration: Points System
-- 1. Ensure the points column exists in profiles with a non-negative constraint
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points NUMERIC DEFAULT 0;

-- 2. Add a check constraint to ensure points are never negative
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'points_non_negative') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT points_non_negative CHECK (points >= 0);
    END IF;
END $$;

-- 3. Required function: add_user_points
-- Increments user's points balance securely
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
  SET
    points = COALESCE(points, 0) + COALESCE(p_points, 0),
    -- Sync with legacy points_balance for existing UI compatibility
    points_balance = COALESCE(points_balance, 0) + floor(COALESCE(p_points, 0))::integer
  WHERE id = p_user_id;
END;
$$;

-- 4. Permissions
-- Grant execute to authenticated and service_role as specified in the request
GRANT EXECUTE ON FUNCTION public.add_user_points(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_points(uuid, numeric) TO service_role;
