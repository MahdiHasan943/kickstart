'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const [apifyToken, setApifyToken] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const checkAdminAndFetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            // Check if user is admin
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'admin') {
                setError('You do not have permission to access this page.');
                setLoading(false);
                return;
            }

            setIsAdmin(true);

            // Fetch settings
            const { data: settings, error: settingsError } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'apify_api_token')
                .single();

            if (settings) {
                setApifyToken(settings.value);
            }

            setLoading(false);
        };

        checkAdminAndFetchData();
    }, [supabase, router]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        const { error } = await supabase
            .from('app_settings')
            .upsert({
                key: 'apify_api_token',
                value: apifyToken,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

        if (error) {
            setError(error.message);
        } else {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!isAdmin && !loading) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                <p className="text-gray-600 dark:text-gray-400">
                    {error || 'You do not have administrator privileges to view this page.'}
                </p>
                <button
                    onClick={() => router.push('/')}
                    className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Settings</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Manage your application configuration and API keys.
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">API Configuration</h2>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                    <div>
                        <label htmlFor="apifyToken" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Apify API Token
                        </label>
                        <div className="relative">
                            <input
                                id="apifyToken"
                                type="password"
                                value={apifyToken}
                                onChange={(e) => setApifyToken(e.target.value)}
                                className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                placeholder="Enter your Apify API Token"
                            />
                        </div>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            This token is used to authenticate with Apify for Kickstarter scraping jobs.
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
                            Settings saved successfully!
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className={`px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-all focus:ring-4 focus:ring-indigo-500/50 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="mt-8 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-6 rounded-xl">
                <h3 className="text-lg font-medium text-indigo-900 dark:text-indigo-300 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Multi-tenant System Info
                </h3>
                <p className="mt-2 text-sm text-indigo-800 dark:text-indigo-400">
                    You are currently logged in as an <strong>Admin</strong>. Admins can manage all jobs and settings. Agent accounts can only manage their own jobs and cannot access this settings page.
                </p>
            </div>
        </div>
    );
}
