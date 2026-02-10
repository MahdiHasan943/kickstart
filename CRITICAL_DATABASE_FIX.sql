-- CRITICAL FIX: Add Missing Columns AND Allow Users to Save Results

-- 1. Enable RLS on scraper_results (just in case)
ALTER TABLE scraper_results ENABLE ROW LEVEL SECURITY;

-- 2. Add INSERT policy so you can manually sync/save results
-- This fixes the issue where "Sync Status" button fails silently
DROP POLICY IF EXISTS "Users can insert results for their own jobs" ON scraper_results;
CREATE POLICY "Users can insert results for their own jobs"
ON public.scraper_results
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scraper_jobs
    WHERE scraper_jobs.id = job_id
    AND scraper_jobs.user_id = auth.uid()
  )
);

-- 3. Add missing columns (if not already added)
DO $$ 
BEGIN
  -- Basic IDs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'kickstarter_id') THEN
    ALTER TABLE scraper_results ADD COLUMN kickstarter_id TEXT;
  END IF;
  
  -- Financials
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'currency') THEN
    ALTER TABLE scraper_results ADD COLUMN currency TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'currency_symbol') THEN
    ALTER TABLE scraper_results ADD COLUMN currency_symbol TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'usd_pledged') THEN
    ALTER TABLE scraper_results ADD COLUMN usd_pledged TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'converted_pledged_amount') THEN
    ALTER TABLE scraper_results ADD COLUMN converted_pledged_amount NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'fx_rate') THEN
    ALTER TABLE scraper_results ADD COLUMN fx_rate NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'static_usd_rate') THEN
    ALTER TABLE scraper_results ADD COLUMN static_usd_rate NUMERIC;
  END IF;

  -- Counts (Integers)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'backers_count') THEN
    ALTER TABLE scraper_results ADD COLUMN backers_count INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'comments_count') THEN
    ALTER TABLE scraper_results ADD COLUMN comments_count INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'updates_count') THEN
    ALTER TABLE scraper_results ADD COLUMN updates_count INTEGER;
  END IF;

  -- Dates
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'deadline') THEN
    ALTER TABLE scraper_results ADD COLUMN deadline TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'launched_at') THEN
    ALTER TABLE scraper_results ADD COLUMN launched_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'state_changed_at') THEN
    ALTER TABLE scraper_results ADD COLUMN state_changed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'successful_at') THEN
    ALTER TABLE scraper_results ADD COLUMN successful_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Location & Category & Creator
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'country') THEN
    ALTER TABLE scraper_results ADD COLUMN country TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'location_short_name') THEN
    ALTER TABLE scraper_results ADD COLUMN location_short_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'location_state') THEN
    ALTER TABLE scraper_results ADD COLUMN location_state TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'location_type') THEN
    ALTER TABLE scraper_results ADD COLUMN location_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'category_id') THEN
    ALTER TABLE scraper_results ADD COLUMN category_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'category_slug') THEN
    ALTER TABLE scraper_results ADD COLUMN category_slug TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'parent_category') THEN
    ALTER TABLE scraper_results ADD COLUMN parent_category TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'creator_id') THEN
    ALTER TABLE scraper_results ADD COLUMN creator_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'creator_slug') THEN
    ALTER TABLE scraper_results ADD COLUMN creator_slug TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'creator_avatar') THEN
    ALTER TABLE scraper_results ADD COLUMN creator_avatar TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'website') THEN
    ALTER TABLE scraper_results ADD COLUMN website TEXT;
  END IF;

  -- Media & Flags
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'video_url') THEN
    ALTER TABLE scraper_results ADD COLUMN video_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'staff_pick') THEN
    ALTER TABLE scraper_results ADD COLUMN staff_pick BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'spotlight') THEN
    ALTER TABLE scraper_results ADD COLUMN spotlight BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Just in case from other migrations
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'slug') THEN
    ALTER TABLE scraper_results ADD COLUMN slug TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'name') THEN
    ALTER TABLE scraper_results ADD COLUMN name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'blurb') THEN
    ALTER TABLE scraper_results ADD COLUMN blurb TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scraper_results' AND column_name = 'state') THEN
    ALTER TABLE scraper_results ADD COLUMN state TEXT;
  END IF;
END $$;
