import Link from 'next/link';

export default function CheckoutSuccessPage() {
  return (
    <section className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">Thank you for booking!</h1>
          <p className="mt-4 text-gray-600">
            Your payment was successful. We have sent your login details and appointment confirmation to your email.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/login" className="inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-3 text-white hover:bg-primary-700">
              Go to Login
            </Link>
            <Link href="/" className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-gray-700 hover:bg-gray-50">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
