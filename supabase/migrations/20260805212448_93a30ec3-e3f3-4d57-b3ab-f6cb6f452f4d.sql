
CREATE POLICY "task_evidence_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "task_evidence_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'task-evidence' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "task_evidence_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'task-evidence' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
