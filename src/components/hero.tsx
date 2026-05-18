export function Hero() {
  return (
    <section className="relative bg-gray-50 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Elevate Your Business to New Heights
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Professional business management consulting services helping companies achieve
            operational excellence, financial health, and sustainable growth.
          </p>
          <div className="flex justify-center space-x-4">
            <a
              href="#pricing"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm bg-primary-600 text-white hover:bg-primary-700"
            >
              View Packages
            </a>
            <a
              href="#contact"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm bg-white text-primary-600 hover:bg-primary-50"
            >
              Book a Free Call
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}