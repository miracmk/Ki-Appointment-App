export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold text-white mb-4">
              Ki Business Solutions
            </h3>
            <p className="text-gray-400">
              Professional business management consulting services helping companies achieve
              operational excellence, financial health, and sustainable growth.
            </p>
            <div className="flex space-x-4 mt-6">
              <a href="#" className="text-gray-400 hover:text-white">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.67 0h-19.34c-1.48 0-2.68 1.2-2.68 2.68v16.68c0 1.48 1.2 2.68 2.68 2.68h19.34c1.48 0 2.68-1.2 2.68-2.68v-16.68c0-1.48-1.2-2.68-2.68-2.68zM12 15.13l-3.76-2.27-1-4.26h3.46L12 6.13l2.24 3.5h3.46l-1 4.26-3.76 2.27z"></path>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-1.376.296-2.58.619-3.594.826-.296-.88-.636-1.75-.906-2.637-.09.688-.35 1.268-.75 1.237a4.255 4.255 0 01-1.825-.547c-.244.06-.487.116-.73.171-.427-.436-1.02-.75-1.684-.75-.31 0-.615.074-.906.208-.601-.21-1.128-.502-1.493-.958C5.752 7.699 6.095 6.15 6.425 4.493c.339.531.63 1.002.856 1.403l-.082.388-.01.177c-.228.47-.364.982-.364 1.494 0 1.494.536 2.741 1.484 3.768l-.147.368c-.581-.188-1.156-.39-1.65-.543a4.254 4.254 0 001.333 2.078c-.38.052-.763.077-1.15.077-.282 0-.556-.02-.829-.065a4.256 4.256 0 003.065 2.02c-2.075 1.629-4.551 2.605-7.128 2.605-.464 0-.919-.035-1.363-.102.225.684.356 1.429.42 2.151a4.255 4.255 0 01-2.138.7v.083a4.254 4.254 0 003.852 4.175c-2.256 1.988-4.938 3.15-7.692 3.15-.5 0-.992-.03-1.473-.085 1.231.69 2.695 1.094 4.292 1.094 5.152 0 7.966-4.269 7.966-7.966 0-.12-.002-.24-.007-.361a10.035 10.035 0 002.558-2.446c-.372 1.098-.58 2.28-.58 3.482 0 2.411.864 4.55 2.23 5.824a10.016 10.016 0 01-4.612-.845c-.446 1.397-.7 2.887-.7 4.454 0 3.082 1.573 5.812 3.946 6.429a10.025 10.025 0 01-6.154-1.95l.415.612a10.025 10.025 0 006.151 1.95 10.016 10.016 0 01-4.612.845c-.446-1.397-.7-2.887-.7-4.454 0-3.082 1.573-5.812 3.946-6.429z"></path>
                </svg>
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li><a href="/" className="hover:text-white">Home</a></li>
              <li><a href="#services" className="hover:text-white">Services</a></li>
              <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
              <li><a href="#about" className="hover:text-white">About</a></li>
              <li><a href="#process" className="hover:text-white">How We Work</a></li>
              <li><a href="#testimonials" className="hover:text-white">Testimonials</a></li>
              <li><a href="#contact" className="hover:text-white">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Services
            </h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white">Management Health Audit</a></li>
              <li><a href="#" className="hover:text-white">Profitability Analysis</a></li>
              <li><a href="#" className="hover:text-white">Expense & Cost Analysis</a></li>
              <li><a href="#" className="hover:text-white">Tax Optimization</a></li>
              <li><a href="#" className="hover:text-white">Digital Transformation</a></li>
              <li><a href="#" className="hover:text-white">Growth Strategy</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Contact
            </h3>
            <p className="space-y-1">
              <span className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                info@kibusiness.co
              </span>
              <span className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.8.52l1.58 4A1 1 0 019.82 11h5.36a1 1 0 01.8.52l1.58 4A1 1 0 0117 15a2 2 0 012 2v1a2 2 0 01-2 2H3a2 2 0 01-2-2V5z"></path>
                </svg>
                +1 (814) 300-8665
              </span>
              <span className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2v-10zM11 14h2v2h-2v-2z"></path>
                </svg>
                5013S Louise Ave #1111, Sioux Falls, SD 57108
              </span>
            </p>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm">
          <p className="text-gray-400">
            © 2026 Ki Business Solutions. All rights reserved.
          </p>
          <div className="mt-4 flex justify-center space-x-4">
            <a href="#" className="text-gray-400 hover:text-white">
              Terms of Service
            </a>
            <span className="text-gray-500 mx-2">|</span>
            <a href="#" className="text-gray-400 hover:text-white">
              Privacy Policy
            </a>
            <span className="text-gray-500 mx-2">|</span>
            <a href="#" className="text-gray-400 hover:text-white">
              Refund Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}