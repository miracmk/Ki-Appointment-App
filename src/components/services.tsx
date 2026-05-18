export function Services() {
  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Comprehensive Solutions
        </h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Financial Services */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Financial Health
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li>Management Health Audit</li>
              <li>Profitability Analysis</li>
              <li>Expense & Cost Analysis</li>
              <li>Current Assets & Cash Flow</li>
              <li>Tax Optimization</li>
            </ul>
          </div>
          
          {/* Operational Services */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Operational Excellence
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li>Management Hierarchy Analysis</li>
              <li>Market & Sector Analysis</li>
              <li>Production Optimization</li>
              <li>Logistics Optimization</li>
              <li>Operations Management</li>
            </ul>
          </div>
          
          {/* Strategic Services */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Strategic Growth
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li>Growth Strategy</li>
              <li>Digital Transformation</li>
              <li>M&A Advisory</li>
              <li>Market Entry Planning</li>
              <li>Scaling Roadmaps</li>
            </ul>
          </div>
          
          {/* Technology Services */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Technology & Innovation
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li>Technology Stack Assessment</li>
              <li>ERP/CRM Integration</li>
              <li>Process Automation</li>
              <li>Change Management</li>
              <li>IT Strategy</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}