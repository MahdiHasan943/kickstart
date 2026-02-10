import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApifyClient } from 'apify-client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const apifyClient = new ApifyClient({
        token: process.env.APIFY_API_TOKEN,
    });
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { jobId } = await request.json();

        // 1. Get Job from DB
        const { data: job, error: fetchError } = await supabase
            .from('scraper_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        if (fetchError || !job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        if (!job.apify_run_id) {
            return NextResponse.json({ error: 'No Apify Run ID associated with this job' }, { status: 400 });
        }

        // 2. Fetch Run Status from Apify
        const run = await apifyClient.run(job.apify_run_id).get();

        if (!run) {
            return NextResponse.json({ error: 'Apify run not found' }, { status: 404 });
        }

        let newStatus = job.status;
        let resultsCount = job.results_count;

        console.log('Syncing Job:', jobId, 'Run Status:', run.status);

        // Map Apify status to our status
        if (run.status === 'SUCCEEDED') {
            newStatus = 'completed';
            // Get dataset items count
            if (run.defaultDatasetId) {
                const dataset = await apifyClient.dataset(run.defaultDatasetId).listItems();
                resultsCount = dataset.count || 0;

                console.log('Dataset items count:', resultsCount);

                // Save results to Supabase if not already saved
                if (dataset.items.length > 0) {
                    // Check if duplicate first
                    const { count } = await supabase
                        .from('scraper_results')
                        .select('*', { count: 'exact', head: true })
                        .eq('job_id', jobId);

                    if (count === 0) {
                        const resultsToInsert = dataset.items.map((item: any) => ({
                            job_id: jobId,

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

                        // Limit batch size if necessary
                        const { error: insertError } = await supabase
                            .from('scraper_results')
                            .insert(resultsToInsert);

                        if (insertError) {
                            console.error('Error saving results:', insertError);
                            // Return error to client to help debugging
                            return NextResponse.json({
                                error: `Database Insert Error: ${insertError.message}. Details: ${insertError.details || ''}, Hint: ${insertError.hint || ''}`
                            }, { status: 500 });
                        } else {
                            console.log('Results saved to DB successfully');
                        }
                    } else {
                        console.log('Results already exist for this job.');
                    }
                } else {
                    console.warn('Run succeeded but returned 0 items.');
                }
            }
        } else if (run.status === 'FAILED' || run.status === 'TIMED-OUT' || run.status === 'ABORTED') {
            newStatus = 'failed';
        } else {
            newStatus = 'running';
        }

        // 3. Update DB if status changed or just to sync count
        const { data: updatedJob, error: updateError } = await supabase
            .from('scraper_jobs')
            .update({
                status: newStatus,
                results_count: resultsCount,
                updated_at: new Date().toISOString()
            })
            .eq('id', jobId)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, job: updatedJob });

    } catch (err: any) {
        console.error('Sync Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
