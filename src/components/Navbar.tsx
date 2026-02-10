'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LogOut, User, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Navbar() {
    const router = useRouter();
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    return (
        <nav className="border-b bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            KickstartLeads
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Link href="/pricing" className="text-gray-700 hover:text-indigo-600 dark:text-gray-300">
                            Pricing
                        </Link>
                        {user ? (
                            <>
                                <Link href="/dashboard" className="text-gray-700 hover:text-indigo-600 dark:text-gray-300">
                                    Dashboard
                                </Link>
                                <div className="relative group">
                                    <button className="flex items-center space-x-1 text-gray-700 hover:text-indigo-600 focus:outline-none">
                                        <User className="h-5 w-5" />
                                    </button>
                                    {/* Dropdown */}
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 hidden group-hover:block">
                                        <button
                                            onClick={handleSignOut}
                                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                                        >
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-x-4">
                                <Link href="/login" className="text-gray-700 hover:text-indigo-600 dark:text-gray-300">
                                    Log in
                                </Link>
                                <Link
                                    href="/login?signup=true"
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
                                >
                                    Sign up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
