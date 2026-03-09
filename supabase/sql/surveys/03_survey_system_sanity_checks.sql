select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('surveys', 'survey_questions', 'survey_options', 'survey_responses')
order by table_name;

select
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name in ('survey_questions', 'survey_options', 'survey_responses')
order by tc.table_name, kcu.column_name;

select id, name, public
from storage.buckets
where id = 'survey_screenshots';
