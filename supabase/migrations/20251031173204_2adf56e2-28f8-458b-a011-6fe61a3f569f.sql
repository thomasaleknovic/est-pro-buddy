-- Add 'sent' status to budgets table
-- First, let's check if we need to modify the check constraint or if it's flexible
-- We'll alter the status column to accept the new 'sent' value

-- Drop existing check constraint if it exists
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_status_check;

-- Add new check constraint with 'sent' status
ALTER TABLE budgets ADD CONSTRAINT budgets_status_check 
CHECK (status IN ('draft', 'approved', 'sent'));