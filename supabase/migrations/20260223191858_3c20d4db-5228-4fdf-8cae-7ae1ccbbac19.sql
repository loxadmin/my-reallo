
SELECT cron.schedule(
  'daily-queue-progression',
  '0 0 * * *',
  $$
  SELECT
    extensions.http_post(
      url := 'https://mrcypdyivfprvvirnwtq.supabase.co/functions/v1/process-queue',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yY3lwZHlpdmZwcnZ2aXJud3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4Mzk2NTUsImV4cCI6MjA4NzQxNTY1NX0.qnUvMhjs-zl4Cdd8DiIJ10Qe3Cl_uAiMGU3CksfXOkw"}'::jsonb,
      body := concat('{"time": "', now(), '"}')::jsonb
    ) AS request_id;
  $$
);
