
-- Fix the cron job: use net.http_post instead of extensions.http_post
SELECT cron.unschedule('daily-queue-progression');

SELECT cron.schedule(
  'daily-queue-progression',
  '0 0 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://mrcypdyivfprvvirnwtq.supabase.co/functions/v1/process-queue',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yY3lwZHlpdmZwcnZ2aXJud3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4Mzk2NTUsImV4cCI6MjA4NzQxNTY1NX0.qnUvMhjs-zl4Cdd8DiIJ10Qe3Cl_uAiMGU3CksfXOkw"}'::jsonb,
      body := concat('{"time": "', now(), '"}')::jsonb
    ) AS request_id;
  $$
);

-- Create goal_categories table for admin-managed goal prices
CREATE TABLE IF NOT EXISTS public.goal_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_type text NOT NULL,
  subcategory text,
  label text NOT NULL,
  max_price integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.goal_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read goal categories
CREATE POLICY "Anyone can read goal categories" ON public.goal_categories
  FOR SELECT USING (true);

-- Admins can manage goal categories
CREATE POLICY "Admins can manage goal categories" ON public.goal_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default goal categories
INSERT INTO public.goal_categories (goal_type, subcategory, label, max_price) VALUES
  ('education', 'nigerian_school', 'Nigerian School', 5000000),
  ('education', 'abroad', 'Schooling Abroad', 25000000),
  ('vacation', 'dubai', 'Travel to Dubai', 3000000),
  ('vacation', 'morocco', 'Travel to Morocco', 2000000),
  ('vacation', 'london', 'Travel to London', 5000000),
  ('vacation', 'maldives', 'Travel to Maldives', 6000000),
  ('rent', null, 'Rent Support', 3000000),
  ('business', null, 'Business Funding', 15000000);
