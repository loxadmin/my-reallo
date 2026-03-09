with new_survey as (
  insert into public.surveys (
    title,
    description,
    points_reward,
    completion_link,
    completion_instructions,
    is_active
  )
  values (
    'Test Survey',
    'Fresh survey after rebuild',
    1000,
    'https://example.com',
    'Open the link, complete the survey, then upload a screenshot.',
    true
  )
  returning id
),
q1 as (
  insert into public.survey_questions (survey_id, question_text, order_index)
  select id, 'How often do you use fintech apps?', 0
  from new_survey
  returning id
),
q2 as (
  insert into public.survey_questions (survey_id, question_text, order_index)
  select id, 'What matters most to you?', 1
  from new_survey
  returning id
)
insert into public.survey_options (question_id, option_text, is_correct)
select q1.id, x.option_text, false
from q1
cross join (
  values
    ('Daily'),
    ('Weekly'),
    ('Monthly'),
    ('Rarely')
) as x(option_text)

union all

select q2.id, x.option_text, false
from q2
cross join (
  values
    ('Speed'),
    ('Low fees'),
    ('Security'),
    ('Rewards')
) as x(option_text);
