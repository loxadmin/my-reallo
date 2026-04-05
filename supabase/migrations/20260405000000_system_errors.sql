CREATE TABLE IF NOT EXISTS public.system_errors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  message text NOT NULL,
  stack text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  url text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert
CREATE POLICY "Anyone can insert system errors" ON public.system_errors
  FOR INSERT WITH CHECK (true);

-- Policy: Only admins can view
CREATE POLICY "Admins can view system errors" ON public.system_errors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Only admins can delete
CREATE POLICY "Admins can delete system errors" ON public.system_errors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
