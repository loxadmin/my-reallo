begin;

-- Drop storage policies first
drop policy if exists "Survey screenshots are public" on storage.objects;
drop policy if exists "Users can upload own survey screenshots" on storage.objects;
drop policy if exists "Users can update own survey screenshots" on storage.objects;
drop policy if exists "Users can delete own survey screenshots" on storage.objects;
drop policy if exists "Admins can manage survey screenshots" on storage.objects;

-- Remove bucket files + bucket record
delete from storage.objects where bucket_id = 'survey_screenshots';
delete from storage.buckets where id = 'survey_screenshots';

-- Drop survey tables in dependency order
drop table if exists public.survey_responses cascade;
drop table if exists public.survey_options cascade;
drop table if exists public.survey_questions cascade;
drop table if exists public.surveys cascade;

commit;
