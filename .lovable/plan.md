# Karbali OAuth Partner Platform

Build a "Sign in with Karbali" identity + value-exchange provider. Phase 1 scope below — only what you asked for, nothing else touched.

## 1. Database (new tables only)

All in `public`, RLS on, admin-only write, service_role full access.

- `oauth_apps` — app_uuid, name, description, company_name, website_url, logo_url, contact_email, environment (`sandbox`|`production`), status (`pending`|`approved`|`suspended`|`revoked`), client_id, client_secret_hash, public_key, owner_user_id, created_at
- `oauth_app_domains` — app_id, domain, verification_token, verified_at
- `oauth_app_redirect_uris` — app_id, uri
- `oauth_app_scopes` — app_id, scope, approved (bool) — scopes enum: `profile.read`, `email.read`, `username.read`, `points.read`, `points.balance.read`, `points.matured.read`
- `oauth_authorization_codes` — code_hash, app_id, user_id, scopes[], redirect_uri, code_challenge, code_challenge_method, expires_at, used_at
- `oauth_access_tokens` — token_hash, app_id, user_id, scopes[], expires_at, revoked_at
- `oauth_refresh_tokens` — token_hash, app_id, user_id, scopes[], expires_at, revoked_at
- `oauth_user_consents` — user_id, app_id, scopes[], granted_at, revoked_at (unique on user_id+app_id)
- `oauth_points_ledger` — **immutable** debit/credit log: id, user_id, app_id, amount (negative=debit), type (`spend`|`reversal`), reference, created_at. No updates/deletes allowed (RLS + trigger).
- `oauth_webhook_events` — app_id, event_type, payload, signature, delivered_at, attempts
- `oauth_api_usage` — app_id, endpoint, status, ip, created_at (for rate-limit + dashboard metrics)

Matured-points rule: a point is "matured" if the originating `waitlist_activity`/credit row is ≥ 6 months old. Implement as SQL function `get_matured_points(user_id)` derived from existing points history. Spendable = `matured_points - sum(oauth_points_ledger debits)`.

## 2. Edge Functions

All under `supabase/functions/oauth-*`, public (verify_jwt=false), CORS open, HMAC/PKCE validated in code.

- `oauth-authorize` — GET; validates client_id, redirect_uri, scopes, PKCE challenge; requires Karbali user session; renders consent (returns JSON the frontend consent page consumes).
- `oauth-consent` — POST; user Allow/Cancel; issues short-lived authorization code (10 min).
- `oauth-token` — POST; exchanges code+verifier for access_token (1h) + refresh_token (30d); also handles `grant_type=refresh_token`.
- `oauth-userinfo` — GET `/oauth/user`; bearer token; returns fields per granted scopes including `pointsBalance` and `maturedPoints`.
- `oauth-spend` — POST `/oauth/spend`; bearer token w/ `points.matured.read` + spend grant; validates matured balance; inserts immutable ledger debit; fires `points.spent` webhook.
- `oauth-revoke` — POST; revoke token/consent.
- `oauth-verify-domain` — POST; admin triggers DNS TXT lookup for `karbali-verification=<token>`; marks domain verified.
- `oauth-webhook-dispatch` — internal; HMAC-SHA256 signs payload with app's client_secret; retries with backoff.

Rate limiting: simple in-function check against `oauth_api_usage` (e.g. 60 req/min per app per endpoint). Device/IP captured into usage table.

## 3. Frontend — Admin Panel

New route `src/pages/admin/OAuthApps.tsx` linked from existing Admin page under "Partner Integrations":
- List apps with status badges
- Create/edit app drawer (all fields above)
- Reveal client_id, regenerate client_secret (shown once)
- Manage redirect URIs, allowed domains (with verification token + "Verify" button + status)
- Approve/suspend/revoke
- Approve/reject requested scopes
- View ledger + API usage per app

## 4. Frontend — User Consent Screen

New public route `src/pages/oauth/Authorize.tsx`:
- Reads query params (`client_id`, `redirect_uri`, `scope`, `state`, `code_challenge`, `code_challenge_method`)
- If not signed in → redirect to /auth with return URL
- Calls `oauth-authorize` to fetch app metadata + requested scopes
- Renders consent UI: app logo, name, "<App> wants access to:" with per-scope checklist, **Allow** / **Cancel**
- On Allow → calls `oauth-consent`, redirects back to `redirect_uri?code=...&state=...`

## 5. Frontend — Partner Dashboard

New route `src/pages/partner/Dashboard.tsx` (access via partner login = app owner_user_id):
- Total users connected, OAuth sign-ins, points redeemed, active users, conversion, API usage charts
- Webhook delivery log
- Pull credentials, rotate secret

## 6. Security

- PKCE required (S256 only)
- Redirect URI exact-match against `oauth_app_redirect_uris`
- Domain must be verified before app moves to `approved`
- client_secret stored as bcrypt hash; shown once on creation/rotation
- Access tokens stored as SHA-256 hash
- Authorization codes single-use, 10-min TTL
- Webhook HMAC signature header `X-Karbali-Signature`
- Rate limiting per app+endpoint
- Immutable ledger enforced by trigger that blocks UPDATE/DELETE on `oauth_points_ledger`

## 7. Out of scope (Phase 2+)
Goals/savings/transactions scopes, marketplace, universal wallet UI — schemas reserved, endpoints stubbed to return 403 `scope_not_yet_available`.

## Technical notes
- Matured-points calc: derive from existing `profiles.points_balance` minus a cached "locked_points" view computed from `waitlist_activity` entries newer than 6 months. If existing points history doesn't carry timestamps per credit, we'll add a lightweight `points_credits` audit table going forward and treat pre-existing balance as fully matured (documented in admin UI).
- All new code isolated under `oauth_*` tables, `oauth-*` edge functions, and `src/pages/oauth/`, `src/pages/admin/OAuthApps.tsx`, `src/pages/partner/` — no existing files modified except Admin.tsx (add nav link) and App.tsx (add routes).
