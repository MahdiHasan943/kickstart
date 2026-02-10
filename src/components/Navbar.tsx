'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LogOut, User, Menu, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import LoginModal from './LoginModal';

export default function Navbar() {
    const router = useRouter();
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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
                                <div className="relative group flex items-center h-full">
                                    <button className="flex items-center space-x-1 p-2 text-gray-700 dark:text-gray-300 hover:text-indigo-600 focus:outline-none transition-colors">
                                        <User className="h-5 w-5" />
                                    </button>

                                    {/* Transparent bridge + Dropdown */}
                                    <div className="absolute right-0 top-full pt-1 w-48 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl py-1 ring-1 ring-black/5 border border-gray-100 dark:border-gray-700">
                                            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                            </div>
                                            <button
                                                onClick={handleSignOut}
                                                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left transition-colors"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                <span>Sign out</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => setIsLoginModalOpen(true)}
                                    className="text-gray-700 hover:text-indigo-600 dark:text-gray-300 transition-colors"
                                >
                                    Log in
                                </button>
                                <button
                                    onClick={() => setIsLoginModalOpen(true)}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition shadow-sm hover:shadow-md"
                                >
                                    Sign up
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />
        </nav>
    );
}
