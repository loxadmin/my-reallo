
-- Create storage bucket for user referral screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('referral_screenshots', 'referral_screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for referral_screenshots
-- Allow public to read screenshots
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'referral_screenshots');

-- Allow authenticated users to upload their own screenshots
CREATE POLICY "Users can upload own screenshots" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'referral_screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins full access
CREATE POLICY "Admins can manage referral screenshots" ON storage.objects FOR ALL USING (
  bucket_id = 'referral_screenshots' AND
  public.has_role(auth.uid(), 'admin')
);
