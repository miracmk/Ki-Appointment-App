import { CheckoutButton } from './pricing/stripe-checkout';

const pricingOptions = [
  {
    packageId: 'starter',
    packageName: 'Starter',
    amount: 200,
    description: 'Ideal for small businesses seeking a focused diagnosis.',
    features: [
      'Management Health Assessment',
      'Basic Profitability Analysis',
      'Expense Structure Review',
      '2-Hour Strategy Session',
      'Executive Summary Report',
    ],
  },
  {
    packageId: 'growth',
    packageName: 'Growth',
    amount: 1000,
    description: 'For growing companies ready to optimize operations.',
    label: 'Most Popular',
    features: [
      'Everything in Starter',
      'Market & Sector Data Analysis',
      'Cash Flow & Current Assets Review',
      'Management Hierarchy Analysis',
      'Tax Optimization Assessment',
      '3 Follow-up Sessions',
      'Detailed Action Plan',
    ],
  },
  {
    packageId: 'scale',
    packageName: 'Scale',
    amount: 5000,
    description: 'Comprehensive transformation for scaling businesses.',
    features: [
      'Everything in Growth',
      'Production Optimization Analysis',
      'Logistics & Supply Chain Review',
      'Sector Volume & Competitor Analysis',
      'Digital Transformation Roadmap',
      'Monthly Progress Reviews (3 months)',
      'Dedicated Consultant Access',
      'Board-Ready Presentation',
    ],
  },
  {
    packageId: 'executive',
    packageName: 'Executive',
    amount: 10000,
    description: 'Full-scope advisory for complex, multi-dimensional businesses.',
    features: [
      'Everything in Scale',
      'Full Business Intelligence Suite',
      'Cross-Border Tax Strategy',
      'M&A Readiness Assessment',
      'Investor-Grade Financial Modeling',
      '6-Month Implementation Support',
      'Weekly Consulting Sessions',
      'Priority 24/7 Access',
      'Custom KPI Dashboard',
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Consultation Packages</h2>
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
            Choose the package that fits your growth goals and proceed directly to secure Stripe checkout.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2 xl:grid-cols-4">
          {pricingOptions.map((option) => (
            <div key={option.packageId} className={`rounded-3xl border p-6 shadow-sm ${option.label ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{option.packageName}</h3>
                  <p className="mt-2 text-sm text-gray-500">{option.description}</p>
                </div>
                {option.label ? (
                  <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700">
                    {option.label}
                  </span>
                ) : null}
              </div>

              <p className="mt-8 text-3xl font-bold text-primary-600">${option.amount.toLocaleString()}</p>

              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                {option.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="mt-1 text-primary-600">•</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <CheckoutButton packageId={option.packageId} packageName={option.packageName} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
