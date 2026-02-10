const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually
const envPath = path.resolve(__dirname, '../.env.local');
console.log('Loading env from:', envPath);

if (!fs.existsSync(envPath)) {
    console.error('File not found:', envPath);
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};

envContent.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const idx = line.indexOf('=');
    if (idx !== -1) {
        const key = line.substring(0, idx).trim();
        let val = line.substring(idx + 1).trim();
        // Remove quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        env[key] = val;
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
if (!supabaseKey) console.error('Missing SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking scraper_results table schema...');

    const requiredColumns = [
        'backers_count',
        'kickstarter_id',
        'currency',
        'deadline',
        'staff_pick',
        'location_short_name'
    ];

    let missing = [];

    // Try to insert a dummy row to test schema constraints/fields implicitly
    // Actually, select is safer to check existence.
    // However, select only checks if we can read it.
    // If column doesn't exist, select will throw.

    for (const col of requiredColumns) {
        try {
            // Select 1 row, specific column
            const { error } = await supabase
                .from('scraper_results')
                .select(col)
                .limit(1);

            if (error) {
                // If error contains "column does not exist", capture it.
                if (error.message.includes('column') && error.message.includes('does not exist')) {
                    missing.push(col);
                    console.error(`❌ Column MISSING: ${col}`);
                } else {
                    console.error(`Error checking ${col}: ${error.message}`);
                }
            } else {
                console.log(`✅ Column EXISTS: ${col}`);
            }
        } catch (e) {
            console.error(`Exception checking ${col}: ${e.message}`);
        }
    }

    if (missing.length > 0) {
        console.error('\n🚨 CRITICAL: The following columns are MISSING from the database:');
        console.error(missing.join(', '));
        console.error('You MUST run the migration SQL provided earlier!');
    } else {
        console.log('\n✅ All required columns seem to exist.');
    }

    console.log('\nChecking recent jobs...');
    const { data: jobs } = await supabase
        .from('scraper_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    if (jobs) {
        console.table(jobs.map(j => ({ id: j.id, status: j.status, count: j.results_count })));

        // Count actual rows for these jobs
        for (const job of jobs) {
            const { count } = await supabase
                .from('scraper_results')
                .select('*', { count: 'exact', head: true })
                .eq('job_id', job.id);
            console.log(`Job ${job.id}: Reported: ${job.results_count}, Actual DB rows: ${count}`);
        }
    }
}

checkSchema();
