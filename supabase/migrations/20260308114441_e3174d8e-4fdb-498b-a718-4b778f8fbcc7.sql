CREATE POLICY "Users can update own transactions"
ON public.verification_transactions FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());