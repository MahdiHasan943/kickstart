import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Get the current user via the normal server client (checks session cookie)
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ role: null }, { status: 401 });
        }

        // 2. Use the SERVICE ROLE key to fetch the profile - bypasses ALL RLS
        // This is safe because it's server-side only
        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: profile, error: profileError } = await adminClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('Role fetch error:', profileError.message);
            return NextResponse.json({ role: 'agent' });
        }

        return NextResponse.json({ role: profile?.role || 'agent' });
    } catch (err: any) {
        console.error('Role API crash:', err.message);
        return NextResponse.json({ role: 'agent' });
    }
}
