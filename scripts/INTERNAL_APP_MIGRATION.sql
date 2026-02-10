-- Make user_id nullable and remove RLS for internal app use
ALTER TABLE scraper_jobs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE usage_logs ALTER COLUMN user_id DROP NOT NULL;

-- Disable RLS on tables to allow public access (Internal App)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs DISABLE ROW LEVEL SECURITY;

-- If 'leads' table exists (from policies.sql but not in schema.sql), disable it too
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leads') THEN
        ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;
