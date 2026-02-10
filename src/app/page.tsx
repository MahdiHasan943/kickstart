import Link from 'next/link';
import { CheckCircle, BarChart, Download, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center bg-transparent">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6">
            Scrape Kickstarter Leads in Seconds
          </h1>
          <p className="text-xl mb-10 max-w-2xl mx-auto opacity-90">
            Find creators, backers data, and project metrics instantly.
            Export to CSV/JSON and supercharge your outreach.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/dashboard"
              className="bg-white text-indigo-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition shadow-lg"
            >
              Start scraping for free
            </Link>
            <Link
              href="#features"
              className="border border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/10 transition"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Why use KickstartLeads?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <FeatureCard
              icon={<Zap className="h-10 w-10 text-yellow-500" />}
              title="Instant Extraction"
              description="Get thousands of project details with a single click. No coding required."
            />
            <FeatureCard
              icon={<BarChart className="h-10 w-10 text-blue-500" />}
              title="Rich Data"
              description="Access creator emails, social links, funding amounts, and backer counts."
            />
            <FeatureCard
              icon={<Download className="h-10 w-10 text-green-500" />}
              title="Export Anywhere"
              description="Download clean CSV or JSON files ready for your CRM or spreadsheet."
            />
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-8">Ready to grow your business?</h2>
          <Link
            href="/pricing"
            className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-md font-semibold hover:bg-indigo-700 transition"
          >
            See Pricing Plans
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} KickstartLeads. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}
