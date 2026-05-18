export function About() {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              15+ Years of Excellence
            </h2>
            <p className="text-gray-600 mb-6">
              Ki Business Solutions is a globally operating management consulting firm with
              offices in the United States, United Kingdom, and Türkiye. Since 2010, we have
              partnered with SMEs, growth-stage companies, and large enterprises to deliver
              measurable results across all dimensions of business performance.
            </p>
            <p className="text-gray-600 mb-6">
              Our team of 50+ senior consultants brings deep industry expertise across
              manufacturing, finance, retail, logistics, technology, and professional services —
              delivering tailored strategies that drive real, lasting transformation.
            </p>
          </div>
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-primary-100 rounded-md flex items-center justify-center">
                  <svg className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.5 10V3a2.25 2.25 0 012.25-2.25h10.5A2.25 2.25 0 0122 3v7.5m-7.5 0H3a2.25 2.25 0 00-2.25 2.25v1.5A11.25 11.25 0 0012 21.75h1.5m-7.5 0c-6.21 0-11.25-5.04-11.25-11.25S1.29 3 7.5 3h9a2.25 2.25 0 012.25 2.25v1.5m-7.5 0c6.21 0 11.25 5.04 11.25 11.25S23.79 18 16.5 18h-9a2.25 2.25 0 01-2.25-2.25v-1.5z"></path>
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Our Mission
                </h3>
                <p className="text-gray-600">
                  To empower businesses to achieve sustainable growth, operational excellence, and
                  competitive advantage through data-driven consulting.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-primary-100 rounded-md flex items-center justify-center">
                  <svg className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Our Vision
                </h3>
                <p className="text-gray-600">
                  To be the world's most trusted business management consulting partner for
                  ambitious companies.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-primary-100 rounded-md flex items-center justify-center">
                  <svg className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M5 13l2 2 2-2M9 5l2 2 2-2"></path>
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Our Values
                </h3>
                <p className="text-gray-600">
                  Integrity, transparency, innovation, and unwavering commitment to client success
                  are the foundations of everything we do.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}