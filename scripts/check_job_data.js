const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx !== -1) {
        const key = line.substring(0, idx).trim();
        let val = line.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
        env[key] = val;
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkJobData() {
    console.log('Checking recent jobs...');

    // 1. Get recent jobs
    const { data: jobs, error } = await supabase
        .from('scraper_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching jobs:', error);
        return;
    }

    console.table(jobs.map(j => ({
        id: j.id,
        keyword: j.keyword,
        status: j.status,
        reported_count: j.results_count
    })));

    // 2. For each job, check actual results count in DB
    for (const job of jobs) {
        const { count, error: countError } = await supabase
            .from('scraper_results')
            .select('*', { count: 'exact', head: true })
            .eq('job_id', job.id);

        if (countError) {
            console.error(`Error counting results for job ${job.id}:`, countError);
        } else {
            console.log(`Job [${job.keyword || 'No Keyword'}] (${job.id}):`);
            console.log(`   - Status: ${job.status}`);
            console.log(`   - Dashboard says: ${job.results_count} results`);
            console.log(`   - DB actually has: ${count} rows`);

            if (job.results_count > 0 && count === 0) {
                console.log(`   ⚠️ MISMATCH! Data missing from DB.`);
            } else if (count > 0) {
                console.log(`   ✅ Data exists!`);
            }
        }
    }
}

checkJobData();
