import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="https://media.base44.com/images/public/6a06e6fe65cabb7bc81457a9/e0090f321_KiBusinessLogoYatayBeyazYenipng.png"
            alt="Ki Business Solutions"
            className="h-10 w-auto"
          />
          <span className="text-lg font-semibold text-gray-900">Ki Business Solutions</span>
        </Link>

        <div className="hidden md:flex md:items-center md:space-x-10">
          <Link href="/" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Home
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Consultations
          </Link>
          <Link href="#about" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            About
          </Link>
          <Link href="#contact" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Contact
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="#pricing"
            className="hidden rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 md:inline-flex"
          >
            Book for Consultation
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-primary-600 px-5 py-2.5 text-sm font-semibold text-primary-600 transition hover:bg-primary-50"
          >
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
}
