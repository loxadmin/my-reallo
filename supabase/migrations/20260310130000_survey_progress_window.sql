begin;

alter table public.survey_responses
  drop constraint if exists survey_responses_status_check;

alter table public.survey_responses
  add column if not exists quiz_completed_at timestamptz,
  add column if not exists completion_expires_at timestamptz;

alter table public.survey_responses
  add constraint survey_responses_status_check
  check (status in ('in_progress', 'pending', 'approved', 'rejected', 'failed_quiz'));

create index if not exists survey_responses_completion_expires_at_idx
  on public.survey_responses (completion_expires_at);

update public.survey_responses
set
  quiz_completed_at = coalesce(quiz_completed_at, created_at),
  completion_expires_at = coalesce(completion_expires_at, created_at + interval '20 days'),
  status = case
    when status = 'pending' and screenshot_url is null then 'in_progress'
    else status
  end
where status in ('pending', 'approved', 'rejected');

commit;

notify pgrst, 'reload schema';
