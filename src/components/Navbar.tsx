'use client';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

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

                    {/* Desktop Navigation - Simplified (Removed Dashboard link) */}
                    <div className="hidden md:flex items-center space-x-6">
                    </div>

                    {/* Mobile Controls */}
                    <div className="flex md:hidden items-center">
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

            {/* Mobile Menu Overlay - Simplified */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-top duration-200">
                    <div className="bg-white dark:bg-gray-900 px-4 pt-2 pb-6 space-y-2 shadow-xl">
                        {/* Mobile links removed as requested */}
                    </div>
                </div>
            )}
        </nav>
    );
}
