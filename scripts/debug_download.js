const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function debugDownload() {
    const jobId = '51709e85-1466-49e9-a296-f6b99ce5a5d1';
    console.log(`Debugging job: ${jobId}`);

    const { data: job, error: jobError } = await supabase
        .from('scraper_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

    if (jobError) {
        console.error('Job not found in DB:', jobError);
        return;
    }

    console.log(`Job Keyword: ${job.keyword}`);
    console.log(`Job User ID: ${job.user_id}`);

    const { data: results, error: resultsError, count } = await supabase
        .from('scraper_results')
        .select('*', { count: 'exact' })
        .eq('job_id', jobId);

    console.log(`Results count in DB: ${count}`);

    if (count > 0) {
        console.log('Sample result job_id:', results[0].job_id);
    }
}

debugDownload();
