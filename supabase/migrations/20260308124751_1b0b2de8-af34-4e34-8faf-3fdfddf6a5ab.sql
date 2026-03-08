
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS annual_food_spend integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_transport_spend integer DEFAULT 0;
