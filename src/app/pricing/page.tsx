import Link from 'next/link';
import { Check } from 'lucide-react';

export default function PricingPage() {
    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                        Simple, Transparent Pricing
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400">
                        Start small and upgrade as you grow. No hidden fees.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Free Plan */}
                    <PricingCard
                        title="Starter"
                        price="$0"
                        period="/month"
                        features={[
                            "10 Scrapes / month",
                            "Basic Project Data",
                            "CSV Export",
                            "Email Support"
                        ]}
                        buttonText="Start for Free"
                        href="/login?plan=free"
                    />

                    {/* Pro Plan */}
                    <PricingCard
                        title="Pro"
                        price="$29"
                        period="/month"
                        featured={true}
                        features={[
                            "500 Scrapes / month",
                            "Advanced Contact Info",
                            "Instant CSV/JSON Export",
                            "Priority Support",
                            "API Access"
                        ]}
                        buttonText="Get Started"
                        href="/dashboard/settings/billing?plan=pro"
                    />

                    {/* Agency Plan */}
                    <PricingCard
                        title="Agency"
                        price="$99"
                        period="/month"
                        features={[
                            "Unlimited Scrapes",
                            "White-label Reports",
                            "Dedicated Account Manager",
                            "Custom Integrations",
                            "SLA Agreement"
                        ]}
                        buttonText="Contact Sales"
                        href="mailto:sales@kickstartleads.com"
                    />
                </div>
            </div>
        </div>
    );
}

function PricingCard({ title, price, period, features, buttonText, href, featured = false }: any) {
    return (
        <div className={`rounded-2xl shadow-lg overflow-hidden bg-white dark:bg-gray-800 border ${featured ? 'border-indigo-600 ring-2 ring-indigo-600 transform scale-105' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h3>
                <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{price}</span>
                    <span className="ml-1 text-xl text-gray-500 dark:text-gray-400">{period}</span>
                </div>
                <ul className="mt-6 space-y-4">
                    {features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center">
                            <Check className="h-5 w-5 text-green-500 shrink-0" />
                            <span className="ml-3 text-gray-600 dark:text-gray-300">{feature}</span>
                        </li>
                    ))}
                </ul>
                <div className="mt-8">
                    <Link
                        href={href}
                        className={`block w-full py-3 px-6 text-center rounded-md font-bold transition ${featured ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'}`}
                    >
                        {buttonText}
                    </Link>
                </div>
            </div>
        </div>
    );
}
