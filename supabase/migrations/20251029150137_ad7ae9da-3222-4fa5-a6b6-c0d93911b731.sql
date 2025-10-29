-- Add deleted_at column to budgets table
ALTER TABLE public.budgets 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX idx_budgets_deleted_at ON public.budgets(deleted_at);

-- Create function to permanently delete budgets older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_deleted_budgets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.budgets
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Create a scheduled job to run cleanup daily (requires pg_cron extension)
-- Note: This will be executed manually or via cron job setup
COMMENT ON FUNCTION public.cleanup_old_deleted_budgets() IS 'Deletes budgets that have been in trash for more than 30 days';