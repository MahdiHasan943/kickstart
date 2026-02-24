import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Helper: get admin supabase client
function getAdminClient() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// Helper: verify the current session user is an admin
async function verifyAdmin() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const adminClient = getAdminClient();
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return profile?.role === 'admin' ? user : null;
}

// POST /api/auth/users — create a new user
export async function POST(request: NextRequest) {
    try {
        const caller = await verifyAdmin();
        if (!caller) {
            return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 403 });
        }

        const { email, password, role } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }

        const adminClient = getAdminClient();

        // Create the user via the Admin API (no email confirmation needed)
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // skip email confirmation
        });

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 400 });
        }

        // Upsert the profile with the chosen role
        const chosenRole = role === 'admin' ? 'admin' : 'agent';
        const { error: profileError } = await adminClient
            .from('profiles')
            .upsert({
                id: newUser.user!.id,
                email,
                role: chosenRole,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

        if (profileError) {
            console.error('Profile upsert error:', profileError.message);
        }

        return NextResponse.json({
            user: {
                id: newUser.user!.id,
                email: newUser.user!.email,
                role: chosenRole,
                updated_at: new Date().toISOString(),
            }
        });
    } catch (err: any) {
        console.error('Create user API crash:', err.message);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// PATCH /api/auth/users — update a user's role
export async function PATCH(request: NextRequest) {
    try {
        const caller = await verifyAdmin();
        if (!caller) {
            return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 403 });
        }

        const { userId, role } = await request.json();

        if (!userId || !role) {
            return NextResponse.json({ error: 'userId and role are required.' }, { status: 400 });
        }

        const adminClient = getAdminClient();
        const { error } = await adminClient
            .from('profiles')
            .update({ role, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Update role API crash:', err.message);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// DELETE /api/auth/users — delete a user
export async function DELETE(request: NextRequest) {
    try {
        const caller = await verifyAdmin();
        if (!caller) {
            return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 403 });
        }

        const { userId } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
        }

        // Prevent self-deletion
        if (userId === caller.id) {
            return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
        }

        const adminClient = getAdminClient();
        const { error } = await adminClient.auth.admin.deleteUser(userId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Delete user API crash:', err.message);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
