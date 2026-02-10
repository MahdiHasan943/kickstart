import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const apifyClient = new ApifyClient({
        token: process.env.APIFY_API_TOKEN,
    });

    // Use Service Role to bypass RLS for webhook updates
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const body = await request.json();
        const { eventType, eventData, resource } = body;

        // Handle different webhook structures (Apify sends 'resource' usually)
        const runId = resource?.id || eventData?.actorRunId;

        if (!runId) {
            return NextResponse.json({ message: 'Invalid payload: No run ID found' }, { status: 400 });
        }

        console.log(`Webhook received for run: ${runId}`);

        // 1. Find the job in our DB
        const { data: job, error: fetchError } = await supabaseAdmin
            .from('scraper_jobs')
            .select('*')
            .eq('apify_run_id', runId)
            .single();

        if (fetchError || !job) {
            console.log('Job not found for this run ID:', runId);
            return NextResponse.json({ message: 'Job not tracked, ignoring.' }, { status: 200 });
        }

        // 2. Fetch Run Info
        const run = await apifyClient.run(runId).get();

        if (!run) {
            return NextResponse.json({ error: 'Extraction run not found' }, { status: 404 });
        }

        let newStatus = job.status;
        let resultsCount = job.results_count;

        // Map Apify status
        if (run.status === 'SUCCEEDED') {
            newStatus = 'completed';

            if (run.defaultDatasetId) {
                const dataset = await apifyClient.dataset(run.defaultDatasetId).listItems();
                resultsCount = dataset.count || 0;

                // Save results to scraper_results table
                if (dataset.items.length > 0) {
                    // Check if exists first to avoid double insert
                    const { count } = await supabaseAdmin
                        .from('scraper_results')
                        .select('*', { count: 'exact', head: true })
                        .eq('job_id', job.id);

                    if (count === 0) {
                        const resultsToInsert = dataset.items.map((item: any) => ({
                            job_id: job.id,

                            // Basic Info
                            kickstarter_id: item.id?.toString() || '',
                            name: item.name || '',
                            title: item.title || item.name || '',
                            blurb: item.blurb || '',
                            description: item.blurb || item.description || '',
                            slug: item.slug || '',
                            url: item.urls?.web?.project || item.url || '',

                            // Financial Data
                            goal: item.goal?.toString() || '0',
                            pledged: item.pledged?.toString() || '0',
                            usd_pledged: item.usd_pledged || '',
                            converted_pledged_amount: item.converted_pledged_amount || null,
                            currency: item.currency || '',
                            currency_symbol: item.currency_symbol || '',
                            fx_rate: item.fx_rate || null,
                            static_usd_rate: item.static_usd_rate || null,

                            // Status & Counts
                            state: item.state || '',
                            status: item.state || '',
                            backers: item.backers_count?.toString() || '0',
                            backers_count: item.backers_count || 0,
                            comments_count: item.comments_count || 0,
                            updates_count: item.updates_count || 0,

                            // Dates
                            deadline: item.deadline ? new Date(item.deadline * 1000).toISOString() : null,
                            created_at: item.created_at ? new Date(item.created_at * 1000).toISOString() : new Date().toISOString(), // Fallback to now if missing
                            launched_at: item.launched_at ? new Date(item.launched_at * 1000).toISOString() : null,
                            state_changed_at: item.state_changed_at ? new Date(item.state_changed_at * 1000).toISOString() : null,
                            successful_at: item.successful_at ? new Date(item.successful_at * 1000).toISOString() : null,
                            days_to_go: item.daysLeft || (item.deadline ? Math.ceil((item.deadline * 1000 - Date.now()) / (1000 * 60 * 60 * 24)) : 0),

                            // Location
                            country: item.country_displayable_name || item.country || '',
                            location: item.location?.displayable_name || item.location?.name || item.location || '',
                            location_short_name: item.location?.short_name || '',
                            location_state: item.location?.state || '',
                            location_type: item.location?.type || '',

                            // Category
                            category: item.category?.name || item.category || '',
                            category_id: item.category?.id?.toString() || '',
                            category_slug: item.category?.slug || '',
                            parent_category: item.category?.parent_name || '',

                            // Creator
                            creator: item.creator?.name || item.creator || '',
                            creator_id: item.creator?.id?.toString() || '',
                            creator_slug: item.creator?.slug || '',
                            creator_avatar: item.creator?.avatar?.medium || '',
                            website: item.creator?.urls?.web?.user || '',

                            // Media
                            image_url: item.photo?.full || item.imageUrl || '',
                            video_url: item.video?.high || '',

                            // Flags
                            staff_pick: item.staff_pick || false,
                            spotlight: item.spotlight || false
                        }));

                        const { error: insertError } = await supabaseAdmin
                            .from('scraper_results')
                            .insert(resultsToInsert);

                        if (insertError) {
                            console.error('Webhook Error saving results:', insertError);
                        } else {
                            console.log('Webhook: Results saved to DB successfully');
                        }
                    } else {
                        console.log('Webhook: Results already exist for this job.');
                    }
                }
            }
        } else if (run.status === 'FAILED' || run.status === 'TIMED-OUT' || run.status === 'ABORTED') {
            newStatus = 'failed';
        }

        // 3. Update Job Status
        const { error: updateError } = await supabaseAdmin
            .from('scraper_jobs')
            .update({
                status: newStatus,
                results_count: resultsCount,
                updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

        if (updateError) {
            console.error('Error updating job status:', updateError);
            throw updateError;
        }

        return NextResponse.json({ message: 'Webhook processed', status: newStatus }, { status: 200 });

    } catch (err: any) {
        console.error('Webhook Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
