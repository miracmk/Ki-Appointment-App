export function Process() {
  return (
    <section id="process" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
          How We Work
        </h2>
        <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
          A structured, proven methodology that delivers results at every stage of your
          engagement.
        </p>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 items-start">
          {/* Discovery & Assessment */}
          <div className="flex items-start">
            <div className="flex-shrink-0 h-12 w-12 bg-primary-100 rounded-md flex items-center justify-center">
              <div className="h-8 w-8 bg-primary-200 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-bold text-xl">01</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Discovery & Assessment
              </h3>
              <p className="text-gray-600">
                We conduct an in-depth analysis of your business — financials, operations,
                market position, and management structure.
              </p>
            </div>
          </div>
          
          {/* Strategy Development */}
          <div className="flex items-start">
            <div className="flex-shrink-0 h-12 w-12 bg-primary-100 rounded-md flex items-center justify-center">
              <div className="h-8 w-8 bg-primary-200 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-bold text-xl">02</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Strategy Development
              </h3>
              <p className="text-gray-600">
                Our experts craft tailored recommendations and a clear roadmap aligned to your
                business goals and constraints.
              </p>
            </div>
          </div>
          
          {/* Implementation Support */}
          <div className="flex items-start">
            <div className="flex-shrink-0 h-12 w-12 bg-primary-100 rounded-md flex items-center justify-center">
              <div className="h-8 w-8 bg-primary-200 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-bold text-xl">03</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Implementation Support
              </h3>
              <p className="text-gray-600">
                We work alongside your team to execute the plan, manage change, and drive
                measurable outcomes.
              </p>
            </div>
          </div>
          
          {/* Monitoring & Reporting */}
          <div className="flex items-start">
            <div className="flex-shrink-0 h-12 w-12 bg-primary-100 rounded-md flex items-center justify-center">
              <div className="h-8 w-8 bg-primary-200 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-bold text-xl">04</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Monitoring & Reporting
              </h3>
              <p className="text-gray-600">
                Continuous performance tracking, KPI reporting, and iterative improvements to
                ensure lasting results.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}