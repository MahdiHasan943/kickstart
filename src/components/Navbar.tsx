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

    useEffect(() => {
        const getUser = async () => {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError) throw userError;

                setUser(user);
                if (user) {
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();

                    if (profileError) {
                        console.warn('Profile fetch error (likely RLS):', profileError.message);
                        setRole('agent');
                    } else {
                        setRole(profile?.role || 'agent');
                    }
                }
            } catch (err: any) {
                console.error('Navbar user fetch failed:', err.message);
                // Don't throw, just let it be null/agent
            }
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change:', event, session?.user?.email);
            setUser(session?.user ?? null);

            if (session?.user) {
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();
                    setRole(profile?.role || 'agent');
                } catch (err) {
                    setRole('agent');
                }
            } else {
                setRole(null);
            }

            if (event === 'SIGNED_OUT') {
                setRole(null);
                setUser(null);
                router.push('/login');
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase, router]);

    // Close menu when route changes
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    const handleSignOut = async () => {
        try {
            console.log('Signing out...');
            // First clear role/user state to update UI immediately
            setRole(null);
            setUser(null);

            // Call Supabase signout
            const { error } = await supabase.auth.signOut();
            if (error) console.error('SignOut error:', error.message);

            // Hard redirect to login page despite success/failure of server call
            window.location.href = '/login';
        } catch (err) {
            console.error('SignOut crash:', err);
            window.location.href = '/login';
        }
    };

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
                    <div className="hidden md:flex items-center space-x-6">
                        {user && (
                            <>
                                {role === 'admin' && (
                                    <>
                                        <Link
                                            href="/users"
                                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/users'
                                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            Users
                                        </Link>
                                        <Link
                                            href="/settings"
                                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/settings'
                                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            Settings
                                        </Link>
                                    </>
                                )}
                                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold uppercase border border-indigo-200 dark:border-indigo-800 shadow-sm" title={user.email}>
                                    {user.email?.charAt(0)}
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

                    {/* Mobile Menu Button */}
                    <div className="flex md:hidden items-center">
                        {user && (
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                            >
                                <span className="sr-only">Open main menu</span>
                                {isMenuOpen ? (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu Content */}
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
                                <Link
                                    href="/users"
                                    className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/users'
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    Users
                                </Link>
                                <Link
                                    href="/settings"
                                    className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/settings'
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    Settings
                                </Link>
                            </>
                        )}
                        <button
                            onClick={handleSignOut}
                            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                        >
                            Sign Out
                        </button>
                    </div>
                    <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-800 px-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                                    {user.email?.charAt(0)}
                                </div>
                            </div>
                            <div className="ml-3">
                                <div className="text-sm font-medium text-gray-800 dark:text-white truncate max-w-[200px]">{user.email}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
