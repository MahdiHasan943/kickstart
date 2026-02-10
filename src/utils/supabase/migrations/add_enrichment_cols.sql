alter table public.scraper_results 
add column if not exists website text,
add column if not exists email text,
add column if not exists phone text;
