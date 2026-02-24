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
        const apifyClient = new ApifyClient({
            token: apifyToken,
        });

        const body = await request.json();
        const {
            keyword,
            startUrls,
            category,
            location,
            status,
            goal,
            pledged,
            raised,
            sort,
            maxResults = 99999
        } = body;

        if (!keyword && (!startUrls || startUrls.length === 0)) {
            return NextResponse.json({ error: 'Either a keyword or Start URLs are required' }, { status: 400 });
        }

        // 1. Skip Credit Check for internal app

        // 2. Start Actor
        // Using 'epctex/kickstarter-scraper' as requested
        const actorInput = {
            query: keyword,
            startUrls: startUrls || [],
            category,
            location,
            status,
            goal,
            pledged,
            raised,
            sort,
            maxResults: Number(maxResults),
            proxyConfig: {
                useApifyProxy: true
            }
        };

        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/apify`;

        // Start the actor asynchronously
        // Note: ensuring we listen to all terminal states
        const run = await apifyClient.actor('epctex/kickstarter-scraper').start(actorInput, {
            webhooks: [
                {
                    eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.ABORTED'],
                    requestUrl: webhookUrl,
                },
            ],
        });

        // 3. Create Job Record in Supabase
        const jobLabel = keyword || (startUrls && startUrls.length > 0 ? 'URL List' : 'Advanced Search');

        const { data: job, error } = await supabase
            .from('scraper_jobs')
            .insert({
                keyword: jobLabel,
                target_count: maxResults,
                apify_run_id: run.id,
                status: 'running',
                user_id: user.id,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ message: 'Scraping started', jobId: job.id, apifyRunId: run.id });

    } catch (err: any) {
        console.error('Start Scrape Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
