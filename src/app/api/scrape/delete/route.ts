import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { jobId } = await request.json();

        if (!jobId) {
            return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
        }

        // Delete the job (and its results due to cascade)
        const { error } = await supabase
            .from('scraper_jobs')
            .delete()
            .eq('id', jobId);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Delete Job Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
