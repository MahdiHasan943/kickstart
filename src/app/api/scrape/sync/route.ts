import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApifyClient } from 'apify-client';
import { getApifyToken } from '@/utils/settings';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Check auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apifyToken = await getApifyToken();
        const apifyClient = new ApifyClient({ token: apifyToken });

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
            return NextResponse.json({ error: 'No Run ID associated with this job' }, { status: 400 });
        }

        // 2. Fetch Run Status from Apify
        const run = await apifyClient.run(job.apify_run_id).get();

        if (!run) {
            return NextResponse.json({ error: 'Extraction run not found' }, { status: 404 });
        }

        console.log('Syncing Job:', jobId, 'Apify Status:', run.status);

        let newStatus = job.status;
        let resultsCount = job.results_count ?? 0;

        // ── Helper: get live item count from dataset metadata (lightweight, no items downloaded) ──
        const getLiveCount = async (datasetId: string): Promise<number> => {
            try {
                const info = await apifyClient.dataset(datasetId).get();
                return (info as any)?.itemCount ?? 0;
            } catch {
                return 0;
            }
        };

        // ── Helper: download & save dataset items to Supabase ──
        const saveDatasetItems = async (datasetId: string): Promise<number> => {
            try {
                const dataset = await apifyClient.dataset(datasetId).listItems();
                const count = dataset.count || dataset.items.length || 0;

                if (dataset.items.length > 0) {
                    // Only insert if not already stored
                    const { count: existing } = await supabase
                        .from('scraper_results')
                        .select('*', { count: 'exact', head: true })
                        .eq('job_id', jobId);

                    if (!existing || existing === 0) {
                        const resultsToInsert = dataset.items.map((item: any) => ({
                            job_id: jobId,
                            kickstarter_id: item.id?.toString() || '',
                            name: item.name || '',
                            title: item.title || item.name || '',
                            blurb: item.blurb || '',
                            description: item.blurb || item.description || '',
                            slug: item.slug || '',
                            url: item.urls?.web?.project || item.url || '',
                            goal: item.goal?.toString() || '0',
                            pledged: item.pledged?.toString() || '0',
                            usd_pledged: item.usd_pledged || '',
                            converted_pledged_amount: item.converted_pledged_amount || null,
                            currency: item.currency || '',
                            currency_symbol: item.currency_symbol || '',
                            fx_rate: item.fx_rate || null,
                            static_usd_rate: item.static_usd_rate || null,
                            state: item.state || '',
                            status: item.state || '',
                            backers: item.backers_count?.toString() || '0',
                            backers_count: item.backers_count || 0,
                            comments_count: item.comments_count || 0,
                            updates_count: item.updates_count || 0,
                            deadline: item.deadline ? new Date(item.deadline * 1000).toISOString() : null,
                            created_at: item.created_at ? new Date(item.created_at * 1000).toISOString() : new Date().toISOString(),
                            launched_at: item.launched_at ? new Date(item.launched_at * 1000).toISOString() : null,
                            state_changed_at: item.state_changed_at ? new Date(item.state_changed_at * 1000).toISOString() : null,
                            successful_at: item.successful_at ? new Date(item.successful_at * 1000).toISOString() : null,
                            days_to_go: item.daysLeft || (item.deadline ? Math.ceil((item.deadline * 1000 - Date.now()) / (1000 * 60 * 60 * 24)) : 0),
                            country: item.country_displayable_name || item.country || '',
                            location: item.location?.displayable_name || item.location?.name || item.location || '',
                            location_short_name: item.location?.short_name || '',
                            location_state: item.location?.state || '',
                            location_type: item.location?.type || '',
                            category: item.category?.name || item.category || '',
                            category_id: item.category?.id?.toString() || '',
                            category_slug: item.category?.slug || '',
                            parent_category: item.category?.parent_name || '',
                            creator: item.creator?.name || item.creator || '',
                            creator_id: item.creator?.id?.toString() || '',
                            creator_slug: item.creator?.slug || '',
                            creator_avatar: item.creator?.avatar?.medium || '',
                            website: item.creator?.urls?.web?.user || '',
                            image_url: item.photo?.full || item.imageUrl || '',
                            video_url: item.video?.high || '',
                            staff_pick: item.staff_pick || false,
                            spotlight: item.spotlight || false,
                        }));

                        const { error: insertError } = await supabase
                            .from('scraper_results')
                            .insert(resultsToInsert);

                        if (insertError) {
                            console.error('Insert error:', insertError.message);
                        } else {
                            console.log(`Saved ${resultsToInsert.length} items to DB`);
                        }
                    } else {
                        console.log('Results already exist for this job, skipping insert.');
                    }
                }
                return count;
            } catch (err: any) {
                console.error('saveDatasetItems error:', err.message);
                return 0;
            }
        };

        // ── Map Apify run status → our status ──────────────────────────
        if (run.status === 'SUCCEEDED') {
            newStatus = 'completed';
            if (run.defaultDatasetId) {
                resultsCount = await saveDatasetItems(run.defaultDatasetId);
            }

        } else if (run.status === 'ABORTED' || run.status === 'TIMED-OUT') {
            // Actor was manually stopped or timed out — save all collected items
            newStatus = 'aborted';
            if (run.defaultDatasetId) {
                const savedCount = await saveDatasetItems(run.defaultDatasetId);
                resultsCount = savedCount;
            }
            console.log(`Job aborted/timed-out with ${resultsCount} partial results saved`);

        } else if (run.status === 'FAILED') {
            newStatus = 'failed';
            // Try to save any partial results
            if (run.defaultDatasetId) {
                const savedCount = await saveDatasetItems(run.defaultDatasetId);
                if (savedCount > 0) resultsCount = savedCount;
            }

        } else {
            // RUNNING / READY — get live count from dataset metadata (fast, no download)
            newStatus = 'running';
            if (run.defaultDatasetId) {
                const liveCount = await getLiveCount(run.defaultDatasetId);
                console.log('Live dataset count:', liveCount);
                resultsCount = liveCount; // Always reflect current Apify count
            }
        }

        // 3. Update DB
        const { data: updatedJob, error: updateError } = await supabase
            .from('scraper_jobs')
            .update({
                status: newStatus,
                results_count: resultsCount,
                updated_at: new Date().toISOString(),
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
