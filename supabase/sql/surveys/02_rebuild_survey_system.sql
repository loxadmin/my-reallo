begin;

-- =========================================================
-- SAFETY / HELPERS
-- =========================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- SURVEYS
-- =========================================================

create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  points_reward integer not null default 0 check (points_reward >= 0),
  completion_link text,
  completion_instructions text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index surveys_is_active_idx on public.surveys (is_active);
create index surveys_created_at_idx on public.surveys (created_at desc);

drop trigger if exists trg_surveys_updated_at on public.surveys;
create trigger trg_surveys_updated_at
before update on public.surveys
for each row
execute function public.set_updated_at();

alter table public.surveys enable row level security;

drop policy if exists "Public can read active surveys" on public.surveys;
create policy "Public can read active surveys"
on public.surveys
for select
using (
  is_active = true
);

drop policy if exists "Admins can manage surveys" on public.surveys;
create policy "Admins can manage surveys"
on public.surveys
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
)
with check (
  public.has_role(auth.uid(), 'admin')
);

-- =========================================================
-- SURVEY QUESTIONS
-- =========================================================

create table public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  question_text text not null,
  order_index integer not null default 0 check (order_index >= 0),
  created_at timestamptz not null default now()
);

create index survey_questions_survey_id_idx on public.survey_questions (survey_id);
create index survey_questions_survey_id_order_idx on public.survey_questions (survey_id, order_index);

alter table public.survey_questions enable row level security;

drop policy if exists "Public can read questions for active surveys" on public.survey_questions;
create policy "Public can read questions for active surveys"
on public.survey_questions
for select
using (
  exists (
    select 1
    from public.surveys s
    where s.id = survey_questions.survey_id
      and s.is_active = true
  )
);

drop policy if exists "Admins can manage survey questions" on public.survey_questions;
create policy "Admins can manage survey questions"
on public.survey_questions
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
)
with check (
  public.has_role(auth.uid(), 'admin')
);

-- =========================================================
-- SURVEY OPTIONS
-- =========================================================

create table public.survey_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.survey_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);

create index survey_options_question_id_idx on public.survey_options (question_id);

alter table public.survey_options enable row level security;

drop policy if exists "Public can read options for active surveys" on public.survey_options;
create policy "Public can read options for active surveys"
on public.survey_options
for select
using (
  exists (
    select 1
    from public.survey_questions q
    join public.surveys s on s.id = q.survey_id
    where q.id = survey_options.question_id
      and s.is_active = true
  )
);

drop policy if exists "Admins can manage survey options" on public.survey_options;
create policy "Admins can manage survey options"
on public.survey_options
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
)
with check (
  public.has_role(auth.uid(), 'admin')
);

-- =========================================================
-- SURVEY RESPONSES
-- =========================================================

create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  survey_id uuid not null references public.surveys(id) on delete cascade,
  screenshot_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  points_awarded integer not null default 0 check (points_awarded >= 0),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (user_id, survey_id)
);

create index survey_responses_user_id_idx on public.survey_responses (user_id);
create index survey_responses_survey_id_idx on public.survey_responses (survey_id);
create index survey_responses_status_idx on public.survey_responses (status);
create index survey_responses_created_at_idx on public.survey_responses (created_at desc);

alter table public.survey_responses enable row level security;

drop policy if exists "Users can read own survey responses" on public.survey_responses;
create policy "Users can read own survey responses"
on public.survey_responses
for select
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists "Users can insert own survey responses" on public.survey_responses;
create policy "Users can insert own survey responses"
on public.survey_responses
for insert
to authenticated
with check (
  user_id = auth.uid()
);

drop policy if exists "Users can update own survey responses" on public.survey_responses;
create policy "Users can update own survey responses"
on public.survey_responses
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

drop policy if exists "Users can delete own survey responses" on public.survey_responses;
create policy "Users can delete own survey responses"
on public.survey_responses
for delete
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists "Admins can manage all survey responses" on public.survey_responses;
create policy "Admins can manage all survey responses"
on public.survey_responses
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
)
with check (
  public.has_role(auth.uid(), 'admin')
);

-- =========================================================
-- STORAGE BUCKET
-- =========================================================

insert into storage.buckets (id, name, public)
values ('survey_screenshots', 'survey_screenshots', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Survey screenshots are public" on storage.objects;
create policy "Survey screenshots are public"
on storage.objects
for select
using (
  bucket_id = 'survey_screenshots'
);

drop policy if exists "Users can upload own survey screenshots" on storage.objects;
create policy "Users can upload own survey screenshots"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'survey_screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own survey screenshots" on storage.objects;
create policy "Users can update own survey screenshots"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'survey_screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'survey_screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own survey screenshots" on storage.objects;
create policy "Users can delete own survey screenshots"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'survey_screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Admins can manage survey screenshots" on storage.objects;
create policy "Admins can manage survey screenshots"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'survey_screenshots'
  and public.has_role(auth.uid(), 'admin')
)
with check (
  bucket_id = 'survey_screenshots'
  and public.has_role(auth.uid(), 'admin')
);

commit;
