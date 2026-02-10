'use client';
import Link from 'next/link';

export default function Navbar() {
    return (
        <nav className="border-b bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-center h-16">
                    {/* Logo centered */}
                    <div className="flex items-center">
                        <Link href="/" className="text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                            KickstartLeads
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
