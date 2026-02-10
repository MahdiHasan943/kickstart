-- Quick diagnostic query to check your current database state
-- Run this in Supabase SQL Editor to see what's in your database

-- 1. Check all scraper jobs
SELECT 
    id,
    keyword,
    status,
    results_count,
    apify_run_id,
    created_at,
    updated_at
FROM scraper_jobs
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if any results exist
SELECT 
    COUNT(*) as total_results,
    job_id
FROM scraper_results
GROUP BY job_id;

-- 3. Check the structure of scraper_results table
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'scraper_results' 
ORDER BY ordinal_position;

-- 4. If you have results, see a sample
SELECT * FROM scraper_results LIMIT 1;
