begin;

create extension if not exists pgcrypto;

-- Ensure base tables exist for projects where old/incomplete migrations ran.
create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  points_reward integer not null default 0,
  completion_link text,
  completion_instructions text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null,
  question_text text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.survey_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null,
  option_text text not null,
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  survey_id uuid not null,
  screenshot_url text,
  status text not null default 'pending',
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Ensure expected columns/constraints exist.
alter table public.surveys
  alter column is_active set default true,
  alter column points_reward set default 0;

alter table public.survey_questions
  alter column order_index set default 0;

alter table public.survey_options
  alter column is_correct set default false;

alter table public.survey_responses
  alter column status set default 'pending',
  alter column points_awarded set default 0;

-- Add CHECK constraints safely.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'survey_questions_order_index_check'
  ) then
    alter table public.survey_questions
      add constraint survey_questions_order_index_check check (order_index >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'survey_responses_status_check'
  ) then
    alter table public.survey_responses
      add constraint survey_responses_status_check check (status in ('pending', 'approved', 'rejected'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'survey_responses_points_awarded_check'
  ) then
    alter table public.survey_responses
      add constraint survey_responses_points_awarded_check check (points_awarded >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'surveys_points_reward_check'
  ) then
    alter table public.surveys
      add constraint surveys_points_reward_check check (points_reward >= 0);
  end if;
end
$$;

-- Ensure FK relationships exist.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'survey_questions_survey_id_fkey') then
    alter table public.survey_questions
      add constraint survey_questions_survey_id_fkey
      foreign key (survey_id) references public.surveys(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'survey_options_question_id_fkey') then
    alter table public.survey_options
      add constraint survey_options_question_id_fkey
      foreign key (question_id) references public.survey_questions(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'survey_responses_survey_id_fkey') then
    alter table public.survey_responses
      add constraint survey_responses_survey_id_fkey
      foreign key (survey_id) references public.surveys(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'survey_responses_user_id_fkey') then
    alter table public.survey_responses
      add constraint survey_responses_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'survey_responses_user_id_survey_id_key') then
    alter table public.survey_responses
      add constraint survey_responses_user_id_survey_id_key unique (user_id, survey_id);
  end if;
end
$$;

-- Helpful indexes.
create index if not exists surveys_is_active_idx on public.surveys (is_active);
create index if not exists surveys_created_at_idx on public.surveys (created_at desc);
create index if not exists survey_questions_survey_id_idx on public.survey_questions (survey_id);
create index if not exists survey_questions_survey_id_order_idx on public.survey_questions (survey_id, order_index);
create index if not exists survey_options_question_id_idx on public.survey_options (question_id);
create index if not exists survey_responses_user_id_idx on public.survey_responses (user_id);
create index if not exists survey_responses_survey_id_idx on public.survey_responses (survey_id);

-- Trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_surveys_updated_at on public.surveys;
create trigger trg_surveys_updated_at
before update on public.surveys
for each row
execute function public.set_updated_at();

-- RLS reset and hardened policies.
alter table public.surveys enable row level security;
alter table public.survey_questions enable row level security;
alter table public.survey_options enable row level security;
alter table public.survey_responses enable row level security;

drop policy if exists "Anyone can read active surveys" on public.surveys;
drop policy if exists "Public can read active surveys" on public.surveys;
create policy "Public can read active surveys"
on public.surveys
for select
to authenticated
using (is_active = true);

drop policy if exists "Anyone can read survey questions" on public.survey_questions;
drop policy if exists "Public can read questions for active surveys" on public.survey_questions;
create policy "Public can read questions for active surveys"
on public.survey_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.surveys s
    where s.id = survey_questions.survey_id
      and s.is_active = true
  )
);

drop policy if exists "Anyone can read survey options" on public.survey_options;
drop policy if exists "Public can read options for active surveys" on public.survey_options;
create policy "Public can read options for active surveys"
on public.survey_options
for select
to authenticated
using (
  exists (
    select 1
    from public.survey_questions q
    join public.surveys s on s.id = q.survey_id
    where q.id = survey_options.question_id
      and s.is_active = true
  )
);

drop policy if exists "Users can manage own responses" on public.survey_responses;
drop policy if exists "Users can read own survey responses" on public.survey_responses;
drop policy if exists "Users can insert own survey responses" on public.survey_responses;
drop policy if exists "Users can update own survey responses" on public.survey_responses;
drop policy if exists "Users can delete own survey responses" on public.survey_responses;

create policy "Users can read own survey responses"
on public.survey_responses
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own survey responses"
on public.survey_responses
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own survey responses"
on public.survey_responses
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own survey responses"
on public.survey_responses
for delete
to authenticated
using (user_id = auth.uid());

-- Keep admin capabilities if role function is configured in project.
drop policy if exists "Admins can manage surveys" on public.surveys;
create policy "Admins can manage surveys"
on public.surveys
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can manage survey questions" on public.survey_questions;
create policy "Admins can manage survey questions"
on public.survey_questions
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can manage survey options" on public.survey_options;
create policy "Admins can manage survey options"
on public.survey_options
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can manage all responses" on public.survey_responses;
drop policy if exists "Admins can manage all survey responses" on public.survey_responses;
create policy "Admins can manage all survey responses"
on public.survey_responses
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

commit;
