
REVOKE EXECUTE ON FUNCTION public.join_monthly_earner_program() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.evaluate_monthly_earner_cycles() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.monthly_earner_cycle_referrals(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.join_monthly_earner_program() TO authenticated;
GRANT EXECUTE ON FUNCTION public.monthly_earner_cycle_referrals(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_monthly_earner_cycles() TO service_role;
