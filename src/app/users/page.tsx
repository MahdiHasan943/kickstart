'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface Profile {
    id: string;
    email: string;
    role: string;
    updated_at: string;
}

export default function UsersPage() {
    const supabase = createClient();
    const router = useRouter();

    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // Add user modal
    const [showModal, setShowModal] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<'agent' | 'admin'>('agent');
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [addSuccess, setAddSuccess] = useState<string | null>(null);

    // Inline role editing
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [roleUpdating, setRoleUpdating] = useState<string | null>(null);

    // Delete
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            setError(error.message);
        } else {
            setProfiles(data || []);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'admin') { router.push('/'); return; }

            setIsAdmin(true);
            fetchProfiles();
        };
        checkAdmin();
    }, [supabase, router, fetchProfiles]);

    // ── Add User ──────────────────────────────────────────────────────
    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        setAddError(null);
        setAddSuccess(null);

        const res = await fetch('/api/auth/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
        });

        const data = await res.json();

        if (!res.ok) {
            setAddError(data.error || 'Failed to create user.');
        } else {
            setAddSuccess(`User "${newEmail}" created successfully!`);
            setNewEmail('');
            setNewPassword('');
            setNewRole('agent');
            // Add to local state immediately
            setProfiles(prev => [data.user, ...prev]);
            setTimeout(() => { setShowModal(false); setAddSuccess(null); }, 1800);
        }
        setAdding(false);
    };

    // ── Update Role ───────────────────────────────────────────────────
    const handleRoleChange = async (userId: string, newRole: string) => {
        setRoleUpdating(userId);
        setEditingRoleId(null);

        const res = await fetch('/api/auth/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, role: newRole }),
        });

        if (res.ok) {
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
        } else {
            const data = await res.json();
            alert('Error updating role: ' + (data.error || 'Unknown error'));
        }
        setRoleUpdating(null);
    };

    // ── Delete User ───────────────────────────────────────────────────
    const handleDelete = async (userId: string, email: string) => {
        if (!confirm(`Delete user "${email}"? This cannot be undone.`)) return;
        setDeletingId(userId);

        const res = await fetch('/api/auth/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });

        if (res.ok) {
            setProfiles(prev => prev.filter(p => p.id !== userId));
        } else {
            const data = await res.json();
            alert('Error deleting user: ' + (data.error || 'Unknown error'));
        }
        setDeletingId(null);
    };

    if (!isAdmin) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Add users, assign roles, and manage access. Only admins can access this page.
                    </p>
                </div>
                <button
                    onClick={() => { setShowModal(true); setAddError(null); setAddSuccess(null); }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add User
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
                    {error}
                </div>
            )}

            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{profiles.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Admins</p>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">{profiles.filter(p => p.role === 'admin').length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Agents</p>
                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-300 mt-1">{profiles.filter(p => p.role === 'agent').length}</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800/80">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <div className="flex items-center justify-center gap-2 text-gray-400">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                                            Loading users...
                                        </div>
                                    </td>
                                </tr>
                            ) : profiles.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        No users found. Add your first user above.
                                    </td>
                                </tr>
                            ) : (
                                profiles.map((profile) => (
                                    <tr key={profile.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        {/* User */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold uppercase text-sm border border-indigo-200 dark:border-indigo-700 shrink-0">
                                                    {profile.email?.charAt(0)}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{profile.email}</span>
                                            </div>
                                        </td>

                                        {/* Role — inline dropdown */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {roleUpdating === profile.id ? (
                                                <div className="flex items-center gap-2 text-indigo-500 text-sm">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                                                    Saving...
                                                </div>
                                            ) : editingRoleId === profile.id ? (
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        defaultValue={profile.role}
                                                        autoFocus
                                                        onBlur={() => setEditingRoleId(null)}
                                                        onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                                                        className="text-sm border border-indigo-400 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    >
                                                        <option value="agent">Agent</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingRoleId(profile.id)}
                                                    title="Click to change role"
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${profile.role === 'admin'
                                                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                        }`}
                                                >
                                                    {profile.role === 'admin' ? (
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                                        </svg>
                                                    )}
                                                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                                                    <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            )}
                                        </td>

                                        {/* Last updated */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(profile.updated_at).toLocaleString()}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => handleDelete(profile.id, profile.email)}
                                                disabled={deletingId === profile.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {deletingId === profile.id ? (
                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                                ) : (
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                )}
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Add User Modal ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowModal(false)}
                    />

                    {/* Modal */}
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                        {/* Modal header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add New User</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">User will be created immediately</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal body */}
                        <form onSubmit={handleAddUser} className="p-6 space-y-4">
                            {/* Email */}
                            <div>
                                <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="newEmail"
                                    type="email"
                                    required
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="user@example.com"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    required
                                    minLength={6}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="Min 6 characters"
                                />
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Role
                                </label>
                                <div className="flex gap-3">
                                    {(['agent', 'admin'] as const).map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setNewRole(r)}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${newRole === r
                                                    ? r === 'admin'
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                                        : 'border-gray-400 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                                                }`}
                                        >
                                            {r.charAt(0).toUpperCase() + r.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Feedback */}
                            {addError && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                                    {addError}
                                </div>
                            )}
                            {addSuccess && (
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
                                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    {addSuccess}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-sm font-medium transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={adding}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {adding ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Creating...
                                        </>
                                    ) : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
