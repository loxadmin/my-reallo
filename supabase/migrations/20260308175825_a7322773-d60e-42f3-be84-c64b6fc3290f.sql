
-- Storage bucket for advertiser uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('advertiser-uploads', 'advertiser-uploads', true);

-- Storage policies
CREATE POLICY "Anyone can upload to advertiser-uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'advertiser-uploads');
CREATE POLICY "Anyone can read advertiser-uploads" ON storage.objects FOR SELECT USING (bucket_id = 'advertiser-uploads');
CREATE POLICY "Admins can delete advertiser-uploads" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'advertiser-uploads' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Advertiser onboarding tokens
CREATE TABLE public.advertiser_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advertiser_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage advertiser tokens" ON public.advertiser_tokens FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can read active advertiser tokens" ON public.advertiser_tokens FOR SELECT TO anon USING (status = 'active');

-- Advertiser submissions
CREATE TABLE public.advertiser_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid REFERENCES public.advertiser_tokens(id) NOT NULL,
  brand_name text NOT NULL,
  brand_logo_url text,
  website_url text NOT NULL,
  email text NOT NULL,
  contact_number text NOT NULL,
  ceo_name text NOT NULL,
  signature_url text,
  processed_signature_url text,
  status text NOT NULL DEFAULT 'pending_review',
  loi_pdf_url text,
  admin_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advertiser_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage advertiser submissions" ON public.advertiser_submissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can insert advertiser submissions" ON public.advertiser_submissions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read advertiser submissions" ON public.advertiser_submissions FOR SELECT TO anon USING (true);

-- Email verification codes
CREATE TABLE public.advertiser_email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  token_id uuid REFERENCES public.advertiser_tokens(id) NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advertiser_email_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage advertiser email verifs" ON public.advertiser_email_verifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can insert advertiser email verifs" ON public.advertiser_email_verifications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read advertiser email verifs" ON public.advertiser_email_verifications FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can update advertiser email verifs" ON public.advertiser_email_verifications FOR UPDATE TO anon USING (true) WITH CHECK (true);
