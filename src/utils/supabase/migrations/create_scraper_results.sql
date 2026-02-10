create table
  public.scraper_results (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    job_id uuid not null,
    title text null,
    creator text null,
    description text null,
    url text null,
    pledged text null,
    goal text null,
    backers text null,
    days_to_go text null,
    location text null,
    category text null,
    image_url text null,
    status text null,
    constraint scraper_results_pkey primary key (id),
    constraint scraper_results_job_id_fkey foreign key (job_id) references public.scraper_jobs (id) on delete cascade
  ) tablespace pg_default;
