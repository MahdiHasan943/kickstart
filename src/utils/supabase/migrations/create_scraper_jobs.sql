create table
  public.scraper_jobs (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone null,
    user_id uuid null default auth.uid (),
    keyword text null,
    target_count numeric null,
    status text not null default 'pending'::text,
    results_count numeric null,
    apify_run_id text null,
    constraint scraper_jobs_pkey primary key (id),
    constraint scraper_jobs_user_id_fkey foreign key (user_id) references auth.users (id)
  ) tablespace pg_default;
