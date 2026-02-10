'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { KICKSTARTER_CATEGORIES } from '@/constants/categories';

export default function Home() {
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
  const [scraperShowSuccess, setScraperShowSuccess] = useState(false);
  const [errorModal, setErrorModal] = useState<{ show: boolean, title: string, message: string }>({
    show: false,
    title: '',
    message: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const JOBS_PER_PAGE = 6;

  // 1. Memoize Supabase to prevent massive re-renders and hook resets
  const supabase = useMemo(() => createClient(), []);

  const jobsRef = useRef<any[]>([]);
  const isSyncingRef = useRef<Record<string, boolean>>({});

  // Keep ref in sync for interval access
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const showError = useCallback((title: string, message: string) => {
    let cleanMessage = message;
    if (message.includes('category') && message.includes('art') && message.length > 200) {
      cleanMessage = 'Invalid category selected. Please choose a valid category from the dropdown.';
    }
    if (cleanMessage.length > 500) {
      cleanMessage = cleanMessage.substring(0, 500) + '... (message truncated)';
    }
    setErrorModal({ show: true, title, message: cleanMessage });
  }, []);

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from('scraper_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setJobs(data);
  }, [supabase]);

  const handleSync = useCallback(async (jobId: string, showSuccess = true) => {
    // Prevent overlapping syncs for the same job
    if (isSyncingRef.current[jobId]) return;

    try {
      isSyncingRef.current[jobId] = true;

      // Show loading indicator only for manual sync
      if (showSuccess) {
        setJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, status: 'syncing' } : j
        ));
      }

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
      if (job) {
        setJobs(prev => prev.map(j => j.id === job.id ? job : j));
      }

      if (showSuccess) {
        if (job.results_count > 0) {
          alert(`✅ Success! Fetched ${job.results_count} results. You can now download!`);
        } else {
          showError('No Results Found', 'Job synced but no results found. The extraction might not have completed yet.');
        }
      }
    } catch (error: any) {
      console.error('Sync Error:', error);
      if (showSuccess) showError('Refresh Failed', error.message);
      fetchJobs();
    } finally {
      isSyncingRef.current[jobId] = false;
    }
  }, [fetchJobs, showError]);

  const handleDelete = useCallback(async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job and all its results?')) return;
    try {
      const res = await fetch('/api/scrape/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) throw new Error('Failed to delete job');
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (error: any) {
      showError('Delete Failed', error.message);
    }
  }, [showError]);

  const handleDownload = useCallback(async (jobId: string) => {
    try {
      const res = await fetch('/api/scrape/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) throw new Error('Failed to download Excel');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${jobId.slice(0, 8)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error: any) {
      showError('Download Failed', error.message);
    }
  }, [showError]);

  // Initial load and Realtime
  useEffect(() => {
    fetchJobs();
    const channel = supabase.channel('scraper_jobs_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'scraper_jobs' }, () => { fetchJobs(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchJobs, supabase]);

  // STABLE Background Auto-Sync (Every 5 seconds)
  // We use a ref for handleSync logic to ensure the interval NEVER resets even if dependencies change
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);

    syncTimerRef.current = setInterval(() => {
      // Logic: Only sync jobs that are NOT completed/failed
      const jobsToSync = jobsRef.current.filter(j =>
        j.status === 'running' || j.status === 'pending' || j.status === 'syncing'
      );

      jobsToSync.forEach(job => {
        handleSync(job.id, false); // Quiet sync
      });
    }, 5000); // Check every 5 seconds for immediate completion

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [handleSync]);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword && !startUrls) {
      showError('Missing Information', 'Please provide either a keyword or Start URL.');
      return;
    }
    setLoading(true);
    try {
      const urls = startUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0);
      const res = await fetch(`/api/scrape/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, startUrls: urls, category, location, status, goal, pledged, raised, sort, maxResults: Number(maxResults) }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to start extraction');
      fetchJobs();
      setScraperShowSuccess(true);
      setKeyword('');
      setStartUrls('');
    } catch (err: any) {
      showError('Extraction Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Keyword / Query</label>
                <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. 'board games'" className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Results</label>
                <input type="number" value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))} min={1} max={1000} className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start URLs (Optional)</label>
              <textarea value={startUrls} onChange={(e) => setStartUrls(e.target.value)} placeholder="https://www.kickstarter.com/..." rows={3} className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 font-mono text-sm" />
            </div>
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-500">
              {showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ml-1 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700">
                    <option value="">Select a category...</option>
                    {KICKSTARTER_CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. San Francisco" className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700">
                    <option value="All">Any Status</option><option value="Live">Live</option><option value="Successful">Successful</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sort By</label>
                  <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700">
                    <option value="magic">Magic (Relevance)</option>
                    <option value="popularity">Popularity</option>
                    <option value="newest">Newest</option>
                    <option value="end_date">End Date</option>
                    <option value="most_funded">Most Funded</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Goal Amount</label>
                  <select value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700">
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
                  <select value={pledged} onChange={(e) => setPledged(e.target.value)} className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700">
                    <option value="All">Any Amount</option>
                    <option value="< $1,000 pledged">&lt; $1,000 pledged</option>
                    <option value="$1,000 to $10,000 pledged">$1,000 to $10,000 pledged</option>
                    <option value="$10,000 to $100,000 pledged">$10,000 to $100,000 pledged</option>
                    <option value="$100,000 to $1,000,000 pledged">$100,000 to $1,000,000 pledged</option>
                    <option value="> $1,000,000 pledged">&gt; $1,000,000 pledged</option>
                  </select>
                </div>
              </div>
            )}
            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={loading} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2">
                {loading ? 'Starting...' : 'Start Extraction'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">Recent Jobs</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Target</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Results</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Download</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {(() => {
                  const totalPages = Math.ceil(jobs.length / JOBS_PER_PAGE);
                  const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
                  const paginatedJobs = jobs.slice(startIndex, startIndex + JOBS_PER_PAGE);
                  if (jobs.length === 0) return (<tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No jobs found.</td></tr>);
                  return (
                    <>
                      {paginatedJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(job.created_at).toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate">{job.keyword || 'Search'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full ${job.status === 'completed' ? 'bg-green-100 text-green-800' : job.status === 'running' || job.status === 'syncing' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                              {(job.status === 'running' || job.status === 'syncing') && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                              )}
                              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{job.results_count || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {job.status === 'completed' && (
                              <button onClick={() => handleDownload(job.id)} className="text-indigo-600 hover:text-indigo-900 font-semibold inline-flex items-center gap-1 text-sm justify-center w-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Download
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right space-x-4">
                            <button onClick={() => handleSync(job.id)} className="text-orange-600 hover:text-orange-900 font-semibold inline-flex items-center gap-1 text-sm" title="Refresh">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                              Refresh
                            </button>
                            {(job.status === 'completed' || job.status === 'failed') && (
                              <button onClick={() => handleDelete(job.id)} className="text-red-600 hover:text-red-900 transition-colors" title="Delete">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {totalPages > 1 && (
                        <tr><td colSpan={6} className="px-6 py-4 bg-gray-50/50">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">Page {currentPage} of {totalPages}</p>
                            <div className="flex gap-2">
                              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50">Previous</button>
                              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50">Next</button>
                            </div>
                          </div>
                        </td></tr>
                      )}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      {scraperShowSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-2">Scraping Started!</h3>
            <p className="text-gray-500 mb-6 font-medium">Your task is running. It will auto-complete shortly.</p>
            <button onClick={() => setScraperShowSuccess(false)} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">Got it</button>
          </div>
        </div>
      )}
      {errorModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-2">{errorModal.title}</h3>
            <div className="max-h-[300px] overflow-y-auto mb-6 px-2 text-sm text-gray-500">{errorModal.message}</div>
            <button onClick={() => setErrorModal({ ...errorModal, show: false })} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
