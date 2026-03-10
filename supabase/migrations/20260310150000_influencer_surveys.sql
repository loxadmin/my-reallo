begin;

create extension if not exists pgcrypto;

-- =====================================================
-- TABLES
-- =====================================================

create table if not exists public.influencer_surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  reward_amount numeric(12,2) not null default 0 check (reward_amount >= 0),
  completion_link text,
  completion_instructions text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.influencer_survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.influencer_surveys(id) on delete cascade,
  question_text text not null,
  order_index integer not null default 0 check (order_index >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.influencer_survey_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.influencer_survey_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.influencer_survey_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  survey_id uuid not null references public.influencer_surveys(id) on delete cascade,
  screenshot_url text,
  status text not null default 'pending',
  reward_amount numeric(12,2) not null default 0 check (reward_amount >= 0),
  quiz_completed_at timestamptz,
  completion_expires_at timestamptz,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  unique (user_id, survey_id)
);

create table if not exists public.influencer_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null,
  source_id uuid,
  amount numeric(12,2) not null,
  status text not null default 'completed',
  note text,
  created_at timestamptz not null default now()
);

alter table public.influencer_survey_responses
drop constraint if exists influencer_survey_responses_status_check;

alter table public.influencer_survey_responses
add constraint influencer_survey_responses_status_check
check (
  status in ('in_progress', 'pending', 'approved', 'rejected', 'failed_quiz')
);

alter table public.influencer_wallet_transactions
drop constraint if exists influencer_wallet_transactions_status_check;

alter table public.influencer_wallet_transactions
add constraint influencer_wallet_transactions_status_check
check (
  status in ('completed', 'reversed')
);

create index if not exists influencer_surveys_is_active_idx
  on public.influencer_surveys(is_active);

create index if not exists influencer_surveys_created_at_idx
  on public.influencer_surveys(created_at desc);

create index if not exists influencer_survey_questions_survey_id_idx
  on public.influencer_survey_questions(survey_id, order_index);

create index if not exists influencer_survey_options_question_id_idx
  on public.influencer_survey_options(question_id);

create index if not exists influencer_survey_responses_user_id_idx
  on public.influencer_survey_responses(user_id);

create index if not exists influencer_survey_responses_survey_id_idx
  on public.influencer_survey_responses(survey_id);

create index if not exists influencer_survey_responses_status_idx
  on public.influencer_survey_responses(status);

create index if not exists influencer_survey_responses_completion_expires_at_idx
  on public.influencer_survey_responses(completion_expires_at);

create index if not exists influencer_wallet_transactions_user_id_idx
  on public.influencer_wallet_transactions(user_id);

create index if not exists influencer_wallet_transactions_source_idx
  on public.influencer_wallet_transactions(source, source_id);

-- =====================================================
-- RLS
-- =====================================================

alter table public.influencer_surveys enable row level security;
alter table public.influencer_survey_questions enable row level security;
alter table public.influencer_survey_options enable row level security;
alter table public.influencer_survey_responses enable row level security;
alter table public.influencer_wallet_transactions enable row level security;

drop policy if exists "Influencers can read active influencer surveys" on public.influencer_surveys;
create policy "Influencers can read active influencer surveys"
on public.influencer_surveys
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.influencer_applications ia
    where ia.user_id = auth.uid()
      and ia.status = 'approved'
  )
);

drop policy if exists "Influencers can read influencer survey questions" on public.influencer_survey_questions;
create policy "Influencers can read influencer survey questions"
on public.influencer_survey_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.influencer_surveys s
    join public.influencer_applications ia on ia.user_id = auth.uid()
    where s.id = influencer_survey_questions.survey_id
      and s.is_active = true
      and ia.status = 'approved'
  )
);

drop policy if exists "Influencers can read influencer survey options" on public.influencer_survey_options;
create policy "Influencers can read influencer survey options"
on public.influencer_survey_options
for select
to authenticated
using (
  exists (
    select 1
    from public.influencer_survey_questions q
    join public.influencer_surveys s on s.id = q.survey_id
    join public.influencer_applications ia on ia.user_id = auth.uid()
    where q.id = influencer_survey_options.question_id
      and s.is_active = true
      and ia.status = 'approved'
  )
);

drop policy if exists "Influencers can read own influencer survey responses" on public.influencer_survey_responses;
create policy "Influencers can read own influencer survey responses"
on public.influencer_survey_responses
for select
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists "Influencers can insert own influencer survey responses" on public.influencer_survey_responses;
create policy "Influencers can insert own influencer survey responses"
on public.influencer_survey_responses
for insert
to authenticated
with check (
  user_id = auth.uid()
);

drop policy if exists "Influencers can update own influencer survey responses" on public.influencer_survey_responses;
create policy "Influencers can update own influencer survey responses"
on public.influencer_survey_responses
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

drop policy if exists "Influencers can read own wallet transactions" on public.influencer_wallet_transactions;
create policy "Influencers can read own wallet transactions"
on public.influencer_wallet_transactions
for select
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists "Admins can manage influencer surveys" on public.influencer_surveys;
create policy "Admins can manage influencer surveys"
on public.influencer_surveys
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

drop policy if exists "Admins can manage influencer survey questions" on public.influencer_survey_questions;
create policy "Admins can manage influencer survey questions"
on public.influencer_survey_questions
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

drop policy if exists "Admins can manage influencer survey options" on public.influencer_survey_options;
create policy "Admins can manage influencer survey options"
on public.influencer_survey_options
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

drop policy if exists "Admins can manage all influencer survey responses" on public.influencer_survey_responses;
create policy "Admins can manage all influencer survey responses"
on public.influencer_survey_responses
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

drop policy if exists "Admins can manage influencer wallet transactions" on public.influencer_wallet_transactions;
create policy "Admins can manage influencer wallet transactions"
on public.influencer_wallet_transactions
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- =====================================================
-- STORAGE
-- =====================================================

insert into storage.buckets (id, name, public)
values ('influencer_survey_screenshots', 'influencer_survey_screenshots', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Influencer survey screenshots are public" on storage.objects;
create policy "Influencer survey screenshots are public"
on storage.objects
for select
to public
using (
  bucket_id = 'influencer_survey_screenshots'
);

drop policy if exists "Influencers can upload own influencer survey screenshots" on storage.objects;
create policy "Influencers can upload own influencer survey screenshots"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'influencer_survey_screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Influencers can update own influencer survey screenshots" on storage.objects;
create policy "Influencers can update own influencer survey screenshots"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'influencer_survey_screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'influencer_survey_screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Influencers can delete own influencer survey screenshots" on storage.objects;
create policy "Influencers can delete own influencer survey screenshots"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'influencer_survey_screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

commit;

notify pgrst, 'reload schema';
