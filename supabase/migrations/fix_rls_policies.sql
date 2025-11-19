-- Fix RLS policies for transactions and budgets tables
-- Run this in Supabase SQL Editor

-- Enable RLS on transactions table if not already enabled
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

-- Create comprehensive RLS policies for transactions
CREATE POLICY "Users can view own transactions" 
ON transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" 
ON transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" 
ON transactions 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" 
ON transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable RLS on budgets table if not already enabled
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can insert own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;

-- Create comprehensive RLS policies for budgets
CREATE POLICY "Users can view own budgets" 
ON budgets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" 
ON budgets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" 
ON budgets 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" 
ON budgets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Grant necessary permissions to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON transactions, budgets TO authenticated;
GRANT SELECT ON profiles TO anon, authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);

-- Create function to handle failed requests logging
CREATE OR REPLACE FUNCTION log_failed_request(
  table_name text,
  operation text,
  error_message text,
  user_id uuid
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.request_logs (table_name, operation, error_message, user_id, created_at)
  VALUES (table_name, operation, error_message, user_id, NOW());
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the original operation if logging fails
  RAISE WARNING 'Failed to log error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create request_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.request_logs (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  error_message TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on request_logs
ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;

-- Policy for request_logs (only admins can view, users can view their own)
CREATE POLICY "Admins can view all request logs" ON request_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

CREATE POLICY "Users can view own request logs" ON request_logs
FOR SELECT USING (auth.uid() = user_id);
