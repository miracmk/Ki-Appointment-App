export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
          What Our Clients Say
        </h2>
        <div className="grid gap-8 sm:grid-cols-1 lg:grid-cols-3">
          {/* Testimonial 1 */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <p className="text-gray-600 italic mb-4">
              "Ki Business Solutions completely transformed our production efficiency. Their
              team identified $2.3M in annual savings within the first month. Unmatched
              expertise."
            </p>
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-primary-600 font-medium">JT</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  James Thornton
                </h3>
                <p className="text-sm text-gray-500">
                  CEO, Thornton Manufacturing Group
                </p>
              </div>
            </div>
          </div>
          
          {/* Testimonial 2 */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <p className="text-gray-600 italic mb-4">
              "Their market analysis gave us the confidence to enter three new markets
              simultaneously. The ROI on our engagement has been exceptional — over 8x in 18 months."
            </p>
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-primary-600 font-medium">SM</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Sarah Mitchell
                </h3>
                <p className="text-sm text-gray-500">
                  Founder, Mitchell & Partners Holdings
                </p>
              </div>
            </div>
          </div>
          
          {/* Testimonial 3 */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <p className="text-gray-600 italic mb-4">
              "The cash flow optimization and tax strategy work alone saved us more than the
              entire engagement cost. Highly professional, data-driven, and truly
              results-focused."
            </p>
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-primary-600 font-medium">DK</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  David Kwan
                </h3>
                <p className="text-sm text-gray-500">
                  CFO, Pacific Trade Logistics
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}