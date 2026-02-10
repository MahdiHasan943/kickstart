'use client';
import { LogOut, User, Menu, LogIn, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import LoginModal from './LoginModal';

export default function Navbar() {
    const router = useRouter();
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        setIsMobileMenuOpen(false);
        router.push('/');
        router.refresh();
    };

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

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

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-6">
                        <Link href="/pricing" className="text-gray-700 hover:text-indigo-600 dark:text-gray-300 transition-colors">
                            Pricing
                        </Link>
                        {user ? (
                            <>
                                <Link href="/dashboard" className="text-gray-700 hover:text-indigo-600 dark:text-gray-300 transition-colors">
                                    Dashboard
                                </Link>
                                <div className="relative group flex items-center h-full">
                                    <button className="flex items-center space-x-1 p-2 text-gray-700 dark:text-gray-300 hover:text-indigo-600 focus:outline-none transition-colors">
                                        <User className="h-5 w-5" />
                                    </button>

                                    {/* Dropdown */}
                                    <div className="absolute right-0 top-full pt-1 w-48 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl py-1 ring-1 ring-black/5 border border-gray-100 dark:border-gray-700">
                                            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 overflow-hidden">
                                                <p className="truncate" title={user?.email}>{user?.email}</p>
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

                    {/* Mobile Controls */}
                    <div className="flex md:hidden items-center space-x-3">
                        {!user && (
                            <button
                                onClick={() => setIsLoginModalOpen(true)}
                                className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
                            >
                                Sign in
                            </button>
                        )}
                        <button
                            onClick={toggleMobileMenu}
                            className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-top duration-200">
                    <div className="bg-white dark:bg-gray-900 px-4 pt-2 pb-6 space-y-2 shadow-xl">
                        <Link
                            href="/pricing"
                            className="block px-3 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Pricing
                        </Link>
                        {user ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="block px-3 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Dashboard
                                </Link>
                                <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 mt-2">
                                    <p className="text-sm text-gray-500 mb-3 truncate">{user.email}</p>
                                    <button
                                        onClick={handleSignOut}
                                        className="flex w-full items-center space-x-3 px-3 py-2 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                    >
                                        <LogOut className="h-5 w-5" />
                                        <span>Sign out</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button
                                onClick={() => {
                                    setIsLoginModalOpen(true);
                                    setIsMobileMenuOpen(false);
                                }}
                                className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors"
                            >
                                <LogIn className="h-5 w-5" />
                                <span>Get Started</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />
        </nav>
    );
}
