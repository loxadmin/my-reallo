with s as (
  insert into public.influencer_surveys (
    title,
    description,
    reward_amount,
    completion_link,
    completion_instructions,
    is_active
  )
  values (
    'Brand Preference Survey',
    'Quick influencer survey for campaign qualification.',
    5000,
    'https://example.com',
    'Complete the external survey, then upload a screenshot.',
    true
  )
  returning id
),
q1 as (
  insert into public.influencer_survey_questions (survey_id, question_text, order_index)
  select id, 'Which audience fits this campaign best?', 0
  from s
  returning id
)
insert into public.influencer_survey_options (question_id, option_text, is_correct)
select q1.id, v.option_text, v.is_correct
from q1
cross join (
  values
    ('Teen gaming audience', false),
    ('Young adults interested in fintech', true),
    ('Retirees with no social media usage', false)
) as v(option_text, is_correct);

notify pgrst, 'reload schema';
