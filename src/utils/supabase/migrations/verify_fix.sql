-- Test script to verify the fix is working
-- Run this AFTER you've run fix_scraper_results_schema.sql

-- Step 1: Verify all required columns exist
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    required_columns TEXT[] := ARRAY[
        'kickstarter_id', 'name', 'title', 'blurb', 'description', 'slug', 'url',
        'goal', 'pledged', 'usd_pledged', 'converted_pledged_amount',
        'currency', 'currency_symbol', 'fx_rate', 'static_usd_rate',
        'state', 'status', 'backers', 'backers_count', 'comments_count', 'updates_count',
        'deadline', 'created_at', 'launched_at', 'state_changed_at', 'successful_at', 'days_to_go',
        'country', 'location', 'location_short_name', 'location_state', 'location_type',
        'category', 'category_id', 'category_slug', 'parent_category',
        'creator', 'creator_id', 'creator_slug', 'creator_avatar', 'website',
        'image_url', 'video_url', 'staff_pick', 'spotlight'
    ];
    col TEXT;
    col_exists BOOLEAN;
BEGIN
    FOREACH col IN ARRAY required_columns
    LOOP
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'scraper_results' 
            AND column_name = col
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE '❌ MIGRATION INCOMPLETE - Missing columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ SUCCESS - All required columns exist!';
    END IF;
END $$;

-- Step 2: Show current table structure
SELECT 
    column_name, 
    data_type,
    CASE 
        WHEN is_nullable = 'YES' THEN '✓ Nullable'
        ELSE '✗ Not Null'
    END as nullable_status
FROM information_schema.columns 
WHERE table_name = 'scraper_results' 
ORDER BY ordinal_position;

-- Step 3: Show recent jobs and their result counts
SELECT 
    j.id,
    j.keyword,
    j.status,
    j.results_count as "Results in Job",
    COUNT(r.id) as "Actual Results in DB",
    CASE 
        WHEN j.results_count > 0 AND COUNT(r.id) = 0 THEN '❌ Missing Results'
        WHEN j.results_count > 0 AND COUNT(r.id) > 0 THEN '✅ Has Results'
        ELSE '⏳ Pending'
    END as "Status Check"
FROM scraper_jobs j
LEFT JOIN scraper_results r ON r.job_id = j.id
GROUP BY j.id, j.keyword, j.status, j.results_count
ORDER BY j.created_at DESC
LIMIT 10;
