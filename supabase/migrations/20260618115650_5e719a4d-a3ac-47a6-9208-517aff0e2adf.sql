
-- ============ OAuth Provider schema ============

-- Enums
CREATE TYPE public.oauth_environment AS ENUM ('sandbox','production');
CREATE TYPE public.oauth_app_status AS ENUM ('pending','approved','suspended','revoked');
CREATE TYPE public.oauth_scope AS ENUM (
  'profile.read','email.read','username.read',
  'points.read','points.balance.read','points.matured.read',
  'savings.read','goals.read','transactions.read'
);
CREATE TYPE public.oauth_ledger_type AS ENUM ('spend','reversal');

-- Apps
CREATE TABLE public.oauth_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  company_name text,
  website_url text,
  logo_url text,
  contact_email text,
  environment oauth_environment NOT NULL DEFAULT 'sandbox',
  status oauth_app_status NOT NULL DEFAULT 'pending',
  client_id text NOT NULL UNIQUE,
  client_secret_hash text NOT NULL,
  public_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_apps TO authenticated;
GRANT ALL ON public.oauth_apps TO service_role;
ALTER TABLE public.oauth_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage apps" ON public.oauth_apps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "owners read their apps" ON public.oauth_apps FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

-- Domains
CREATE TABLE public.oauth_app_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  domain text NOT NULL,
  verification_token text NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(app_id, domain)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_app_domains TO authenticated;
GRANT ALL ON public.oauth_app_domains TO service_role;
ALTER TABLE public.oauth_app_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage domains" ON public.oauth_app_domains FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "owners read domains" ON public.oauth_app_domains FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.oauth_apps a WHERE a.id = app_id AND a.owner_user_id = auth.uid()));

-- Redirect URIs
CREATE TABLE public.oauth_app_redirect_uris (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  uri text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(app_id, uri)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_app_redirect_uris TO authenticated;
GRANT ALL ON public.oauth_app_redirect_uris TO service_role;
ALTER TABLE public.oauth_app_redirect_uris ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage redirects" ON public.oauth_app_redirect_uris FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "owners read redirects" ON public.oauth_app_redirect_uris FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.oauth_apps a WHERE a.id = app_id AND a.owner_user_id = auth.uid()));

-- App Scopes (requested + approval status)
CREATE TABLE public.oauth_app_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  scope oauth_scope NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(app_id, scope)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_app_scopes TO authenticated;
GRANT ALL ON public.oauth_app_scopes TO service_role;
ALTER TABLE public.oauth_app_scopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage app scopes" ON public.oauth_app_scopes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "owners read app scopes" ON public.oauth_app_scopes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.oauth_apps a WHERE a.id = app_id AND a.owner_user_id = auth.uid()));

-- Authorization codes
CREATE TABLE public.oauth_authorization_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  app_id uuid NOT NULL REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scopes text[] NOT NULL DEFAULT '{}',
  redirect_uri text NOT NULL,
  code_challenge text NOT NULL,
  code_challenge_method text NOT NULL DEFAULT 'S256',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.oauth_authorization_codes TO service_role;
ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
-- service-role only (no policies needed beyond grants)

-- Access tokens
CREATE TABLE public.oauth_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  app_id uuid NOT NULL REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scopes text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.oauth_access_tokens TO service_role;
ALTER TABLE public.oauth_access_tokens ENABLE ROW LEVEL SECURITY;

-- Refresh tokens
CREATE TABLE public.oauth_refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  app_id uuid NOT NULL REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scopes text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.oauth_refresh_tokens TO service_role;
ALTER TABLE public.oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;

-- User consents
CREATE TABLE public.oauth_user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id uuid NOT NULL REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  scopes text[] NOT NULL DEFAULT '{}',
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE(user_id, app_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_user_consents TO authenticated;
GRANT ALL ON public.oauth_user_consents TO service_role;
ALTER TABLE public.oauth_user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own consents" ON public.oauth_user_consents FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins read all consents" ON public.oauth_user_consents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Immutable ledger
CREATE TABLE public.oauth_points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id uuid NOT NULL REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  amount integer NOT NULL, -- negative = debit, positive = reversal
  type oauth_ledger_type NOT NULL,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.oauth_points_ledger TO authenticated;
GRANT ALL ON public.oauth_points_ledger TO service_role;
ALTER TABLE public.oauth_points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own ledger" ON public.oauth_points_ledger FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.oauth_ledger_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'oauth_points_ledger is immutable';
END;
$$;
CREATE TRIGGER oauth_ledger_no_update BEFORE UPDATE ON public.oauth_points_ledger
  FOR EACH ROW EXECUTE FUNCTION public.oauth_ledger_immutable();
CREATE TRIGGER oauth_ledger_no_delete BEFORE DELETE ON public.oauth_points_ledger
  FOR EACH ROW EXECUTE FUNCTION public.oauth_ledger_immutable();

-- Webhook events
CREATE TABLE public.oauth_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  signature text,
  delivered_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.oauth_webhook_events TO authenticated;
GRANT ALL ON public.oauth_webhook_events TO service_role;
ALTER TABLE public.oauth_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read webhooks" ON public.oauth_webhook_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR
    EXISTS (SELECT 1 FROM public.oauth_apps a WHERE a.id = app_id AND a.owner_user_id = auth.uid()));

-- API usage
CREATE TABLE public.oauth_api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  status integer NOT NULL,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX oauth_api_usage_app_time_idx ON public.oauth_api_usage(app_id, created_at DESC);
GRANT SELECT ON public.oauth_api_usage TO authenticated;
GRANT ALL ON public.oauth_api_usage TO service_role;
ALTER TABLE public.oauth_api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins/owners read usage" ON public.oauth_api_usage FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR
    EXISTS (SELECT 1 FROM public.oauth_apps a WHERE a.id = app_id AND a.owner_user_id = auth.uid()));

-- Matured points helper
-- Treats existing profiles.points_balance as fully matured baseline minus
-- any oauth_points_ledger debits already taken.
CREATE OR REPLACE FUNCTION public.oauth_get_matured_points(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(
    0,
    COALESCE((SELECT points_balance FROM public.profiles WHERE id = _user_id), 0)
    + COALESCE((SELECT SUM(amount) FROM public.oauth_points_ledger WHERE user_id = _user_id), 0)
  )::int;
$$;

-- Touch updated_at on apps
CREATE OR REPLACE FUNCTION public.oauth_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER oauth_apps_touch BEFORE UPDATE ON public.oauth_apps
  FOR EACH ROW EXECUTE FUNCTION public.oauth_touch_updated_at();
