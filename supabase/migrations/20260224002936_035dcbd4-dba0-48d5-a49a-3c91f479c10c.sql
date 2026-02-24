
-- Insert missing profile for existing user
INSERT INTO public.profiles (id, email, referral_code, queue_position)
VALUES (
  'da74e2fb-0723-4d23-a3a8-e58424be5fcf',
  'adahosabex@gmail.com',
  (SELECT generate_referral_code()),
  (SELECT get_next_queue_position())
)
ON CONFLICT (id) DO NOTHING;

-- Insert missing user role
INSERT INTO public.user_roles (user_id, role)
VALUES ('da74e2fb-0723-4d23-a3a8-e58424be5fcf', 'user')
ON CONFLICT DO NOTHING;
