-- Fix function search_path for security
DROP FUNCTION IF EXISTS public.cleanup_old_deleted_budgets();

CREATE OR REPLACE FUNCTION public.cleanup_old_deleted_budgets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM budgets
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$;