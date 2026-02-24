'use client';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';

export default function Navbar() {
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    useEffect(() => {
        const getUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);

                if (session?.user) {
                    const res = await fetch('/api/auth/role');
                    if (res.ok) {
                        const { role } = await res.json();
                        setRole(role || 'agent');
                    }
                }
            } catch (err: any) {
                console.error('Navbar user fetch failed:', err.message);
            }
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setUser(session?.user ?? null);

            if (session?.user) {
                try {
                    const res = await fetch('/api/auth/role');
                    if (res.ok) {
                        const { role } = await res.json();
                        setRole(role || 'agent');
                    }
                } catch (err) {
                    setRole('agent');
                }
            } else {
                setRole(null);
            }

            if (event === 'SIGNED_OUT') {
                setRole(null);
                setUser(null);
                window.location.href = '/login';
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    // Close menus when route changes
    useEffect(() => {
        setIsMenuOpen(false);
        setSettingsOpen(false);
    }, [pathname]);

    const handleSignOut = async () => {
        try {
            setRole(null);
            setUser(null);
            const { error } = await supabase.auth.signOut();
            if (error) console.error('SignOut error:', error.message);
            window.location.href = '/login';
        } catch (err) {
            console.error('SignOut crash:', err);
            window.location.href = '/login';
        }
    };

    const isSettingsActive = pathname === '/settings' || pathname === '/users';

    if (pathname === '/login') return null;

    return (
        <nav className="border-b bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">

                    {/* Logo */}
                    <div className="flex items-center">
                        <Link href="/" className="text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                            KickstartLeads
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-4">
                        {user && (
                            <>
                                {/* Settings dropdown — hover triggered */}
                                {role === 'admin' && (
                                    <div className="relative group">
                                        {/* Trigger */}
                                        <button
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isSettingsActive
                                                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Settings
                                            <svg className="w-3.5 h-3.5 opacity-60 group-hover:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {/* Dropdown panel — shown on group hover */}
                                        <div className="absolute right-0 top-full pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden w-52">
                                                {/* API Configuration */}
                                                <Link
                                                    href="/settings"
                                                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${pathname === '/settings'
                                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                        }`}
                                                >
                                                    <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 shrink-0">
                                                        <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                        </svg>
                                                    </span>
                                                    <span className="font-medium">API Configuration</span>
                                                </Link>

                                                {/* Divider */}
                                                <div className="h-px bg-gray-100 dark:bg-gray-700 mx-3" />

                                                {/* Users */}
                                                <Link
                                                    href="/users"
                                                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${pathname === '/users'
                                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                        }`}
                                                >
                                                    <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 shrink-0">
                                                        <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    </span>
                                                    <span className="font-medium">Users</span>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* User card */}
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold uppercase border border-indigo-200 dark:border-indigo-800 shadow-sm text-xs shrink-0">
                                        {user.email?.charAt(0)}
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-xs font-medium text-gray-800 dark:text-gray-100 max-w-[140px] truncate">{user.email}</span>
                                        {role && (
                                            <span className={`text-[10px] font-semibold uppercase tracking-wide ${role === 'admin' ? 'text-indigo-500' : 'text-gray-400'}`}>{role}</span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSignOut}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-sm hover:shadow-md"
                                >
                                    Sign Out
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mobile hamburger */}
                    <div className="flex md:hidden items-center">
                        {user && (
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                            >
                                <span className="sr-only">Open main menu</span>
                                {isMenuOpen ? (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && user && (
                <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 animate-in slide-in-from-top-2 duration-200">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link
                            href="/"
                            className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/'
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            Dashboard
                        </Link>

                        {role === 'admin' && (
                            <>
                                {/* Settings accordion for mobile */}
                                <button
                                    onClick={() => setSettingsOpen(!settingsOpen)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium transition-colors ${isSettingsActive
                                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    Settings
                                    <svg className={`w-4 h-4 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {settingsOpen && (
                                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-indigo-100 dark:border-indigo-800 pl-3">
                                        <Link
                                            href="/settings"
                                            className={`block px-3 py-2 rounded-md text-sm font-medium ${pathname === '/settings'
                                                    ? 'text-indigo-700 dark:text-indigo-300'
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            API Configuration
                                        </Link>
                                        <Link
                                            href="/users"
                                            className={`block px-3 py-2 rounded-md text-sm font-medium ${pathname === '/users'
                                                    ? 'text-indigo-700 dark:text-indigo-300'
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            Users
                                        </Link>
                                    </div>
                                )}
                            </>
                        )}

                        <button
                            onClick={handleSignOut}
                            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                        >
                            Sign Out
                        </button>
                    </div>

                    {/* Mobile user info */}
                    <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-800 px-5">
                        <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold uppercase shrink-0">
                                {user.email?.charAt(0)}
                            </div>
                            <div className="ml-3">
                                <div className="text-sm font-medium text-gray-800 dark:text-white truncate max-w-[200px]">{user.email}</div>
                                {role && <div className={`text-xs font-semibold uppercase ${role === 'admin' ? 'text-indigo-500' : 'text-gray-400'}`}>{role}</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
