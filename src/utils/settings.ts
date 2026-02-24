import { createClient } from './supabase/server';

export async function getAppSetting(key: string): Promise<string | null> {
    const supabase = await createClient();

    // Use service role if needed, but for now we assume the caller has access or we use a more permissive approach for internal API logic
    const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single();

    if (error) {
        console.error(`Error fetching app setting ${key}:`, error);
        return null;
    }

    return data?.value || null;
}

export async function getApifyToken(): Promise<string> {
    // Try to get from Supabase first
    const token = await getAppSetting('apify_api_token');

    // Fallback to env variable if not found in db
    return token || process.env.APIFY_API_TOKEN || '';
}
