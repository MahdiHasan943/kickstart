-- Quick diagnostic: Check what's in your database RIGHT NOW
-- Copy and paste this into Supabase SQL Editor

-- 1. Show all jobs
SELECT 
    id,
    keyword,
    status,
    results_count as "Job Says Results",
    apify_run_id,
    created_at
FROM scraper_jobs
ORDER BY created_at DESC;

-- 2. Count actual results in database
SELECT 
    job_id,
    COUNT(*) as "Actual Results in DB"
FROM scraper_results
GROUP BY job_id;

-- 3. Show which columns currently exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scraper_results' 
ORDER BY column_name;

-- 4. If you see results, show a sample
SELECT * FROM scraper_results LIMIT 1;
