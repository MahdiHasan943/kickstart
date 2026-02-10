'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { KICKSTARTER_CATEGORIES } from '@/constants/categories';

export default function Dashboard() {
    const [keyword, setKeyword] = useState('');
    const [startUrls, setStartUrls] = useState('');
    const [category, setCategory] = useState('');
    const [location, setLocation] = useState('');
    const [status, setStatus] = useState('All');
    const [goal, setGoal] = useState('All');
    const [pledged, setPledged] = useState('All');
    const [raised, setRaised] = useState('All');
    const [sort, setSort] = useState('magic');
    const [maxResults, setMaxResults] = useState(10);
    const [loading, setLoading] = useState(false);
    const [jobs, setJobs] = useState<any[]>([]);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const supabase = createClient();
    const router = useRouter();

    // Fetch jobs function (reusable)
    const fetchJobs = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            // router.push('/login'); // Avoid redirect loop in useEffect if session text is delayed
            return;
        }

        const { data, error } = await supabase
            .from('scraper_jobs')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setJobs(data);
    }, [supabase, router]);

    // Initial load and Realtime Subscription
    useEffect(() => {
        fetchJobs();

        // 1. Realtime Subscription
        const channel = supabase
            .channel('scraper_jobs_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'scraper_jobs',
                },
                (payload) => {
                    console.log('Realtime update:', payload);
                    fetchJobs();
                }
            )
            .subscribe();

        // 2. Polling Fallback (every 5 seconds)
        // This ensures that if realtime disconnects or is flaky, we still get updates
        const intervalId = setInterval(() => {
            fetchJobs();
        }, 5000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(intervalId);
        };
    }, [fetchJobs, supabase]);

    const handleScrape = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Prepare startUrls array
            const urls = startUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0);

            const payload = {
                keyword,
                startUrls: urls,
                category,
                location,
                status,
                goal,
                pledged,
                raised,
                sort,
                maxResults: Number(maxResults)
            };

            const res = await fetch(`/api/scrape/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to start scrape');
            }

            const data = await res.json();
            console.log('Job started:', data);

            // Immediate update of the list
            fetchJobs();

            // Reset form (optional, maybe keep values for repeated scraping?)
            // setKeyword('');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async (jobId: string) => {
        try {
            // Show loading indicator
            setJobs(prev => prev.map(j =>
                j.id === jobId ? { ...j, status: 'syncing' } : j
            ));

            const res = await fetch('/api/scrape/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to sync job');
            }

            const { job } = await res.json();

            // Update local state immediately
            setJobs(prev => prev.map(j => j.id === job.id ? job : j));

            // Show success message with results count
            if (job.results_count > 0) {
                alert(`✅ Success! Fetched ${job.results_count} results from Apify. You can now download!`);
            } else {
                alert(`⚠️ Job synced but no results found. The Apify run might not have completed yet or returned 0 results.`);
            }
        } catch (error: any) {
            console.error(error);
            alert(`❌ Sync failed: ${error.message}`);
            // Refresh jobs to get current state
            fetchJobs();
        }
    };

    const handleDownload = async (jobId: string) => {
        try {
            const res = await fetch('/api/scrape/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId }),
            });

            if (!res.ok) {
                let errorMessage = 'Failed to download Excel';
                try {
                    const errorJson = await res.json();
                    if (errorJson.error) {
                        errorMessage = errorJson.error;
                    }
                } catch (e) {
                    // Fallback to default message
                }
                throw new Error(errorMessage);
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `leads-${jobId.slice(0, 8)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error: any) {
            console.error(error);
            alert(`Download failed: ${error.message}`);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-10">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-8">
                    Kickstarter Scraper Dashboard
                </h1>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            </span>
                            New Search Task
                        </h2>
                    </div>

                    <form onSubmit={handleScrape} className="p-6 space-y-6">
                        {/* Primary Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Keyword / Query
                                </label>
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    placeholder="e.g. 'board games' or 'smart home'"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Max Results
                                </label>
                                <input
                                    type="number"
                                    value={maxResults}
                                    onChange={(e) => setMaxResults(Number(e.target.value))}
                                    min={1}
                                    max={1000}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Start URLs */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Start URLs (Optional)
                            </label>
                            <textarea
                                value={startUrls}
                                onChange={(e) => setStartUrls(e.target.value)}
                                placeholder="https://www.kickstarter.com/discover/categories/games&#10;One URL per line"
                                rows={3}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 transition-colors font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500">Paste direct Kickstarter URLs to scrape specific pages.</p>
                        </div>

                        {/* Advanced Toggle */}
                        <div>
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-500 transition-colors"
                            >
                                {showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className={`ml-1 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                                >
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </button>
                        </div>

                        {/* Advanced Filters */}
                        {showAdvanced && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select a category...</option>
                                        {KICKSTARTER_CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="e.g. San Francisco, CA"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="All">Any Status</option>
                                        <option value="Live">Live</option>
                                        <option value="Successful">Successful</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sort By</label>
                                    <select
                                        value={sort}
                                        onChange={(e) => setSort(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="magic">Magic (Relevance)</option>
                                        <option value="popularity">Popularity</option>
                                        <option value="newest">Newest</option>
                                        <option value="end_date">End Date</option>
                                        <option value="most_funded">Most Funded</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Goal Amount</label>
                                    <select
                                        value={goal}
                                        onChange={(e) => setGoal(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="All">Any Goal</option>
                                        <option value="< $1,000 goal">&lt; $1,000 goal</option>
                                        <option value="$1,000 to $10,000 goal">$1,000 to $10,000 goal</option>
                                        <option value="$10,000 to $100,000 goal">$10,000 to $100,000 goal</option>
                                        <option value="$100,000 to $1,000,000 goal">$100,000 to $1,000,000 goal</option>
                                        <option value="> $1,000,000 goal">&gt; $1,000,000 goal</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pledged Amount</label>
                                    <select
                                        value={pledged}
                                        onChange={(e) => setPledged(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="All">Any Amount</option>
                                        <option value="< $1,000 pledged">&lt; $1,000 pledged</option>
                                        <option value="$1,000 to $10,000 pledged">$1,000 to $10,000 pledged</option>
                                        <option value="$10,000 to $100,000 pledged">$10,000 to $100,000 pledged</option>
                                        <option value="$100,000 to $1,000,000 pledged">$100,000 to $1,000,000 pledged</option>
                                        <option value="> $1,000,000 pledged">&gt; $1,000,000 pledged</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">% Raised</label>
                                    <select
                                        value={raised}
                                        onChange={(e) => setRaised(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="All">Any %</option>
                                        <option value="< 75% raised">&lt; 75% raised</option>
                                        <option value="75% to 100% raised">75% to 100% raised</option>
                                        <option value="> 100% raised">&gt; 100% raised</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading || (!keyword && !startUrls)}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Starting Scraper...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                        Start Extraction
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Jobs Table Section */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                    Recent Jobs
                </h2>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800/80">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Results</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {jobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(job.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate" title={job.keyword}>
                                            {job.keyword || 'Custom Search'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full 
                          ${job.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                                    job.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>

                                                {/* Animation for running state */}
                                                {job.status === 'running' && (
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                                    </span>
                                                )}

                                                {job.status === 'completed' && (
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                )}

                                                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {job.results_count || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            {job.status === 'completed' && (
                                                <>
                                                    <button
                                                        onClick={() => handleDownload(job.id)}
                                                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold transition-colors inline-flex items-center gap-1"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                        Download
                                                    </button>

                                                    {/* Always show Sync button for completed jobs to allow re-fetching */}
                                                    <button
                                                        onClick={() => handleSync(job.id)}
                                                        className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 font-semibold transition-colors inline-flex items-center gap-1 ml-2"
                                                        title="Re-fetch data from Apify"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                                                        Sync
                                                    </button>
                                                </>
                                            )}
                                            {(job.status === 'running' || job.status === 'pending') && (
                                                <button
                                                    onClick={() => handleSync(job.id)}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors flex items-center gap-1"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                                                    Sync Status
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {jobs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <svg className="h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                                <p>No scraping jobs found. Start your first extraction above!</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
