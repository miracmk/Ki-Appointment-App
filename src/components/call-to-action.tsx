'use client';

import { useEffect, useState } from 'react';
import { loadAdminSettings } from '@/lib/config';

export function CallToAction() {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState({
    calendarServiceAccountKey: '',
    calendarId: '',
  });

  useEffect(() => {
    const settings = loadAdminSettings();
    setLocalSettings({
      calendarServiceAccountKey: settings.calendarServiceAccountKey ?? '',
      calendarId: settings.calendarId ?? '',
    });
  }, []);

  const handleBookConsultation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const serviceType = formData.get('service') as string;
    const preferredDate = formData.get('date') as string;

    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          serviceType,
          preferredDate,
          calendarServiceAccountKey: localSettings.calendarServiceAccountKey,
          calendarId: localSettings.calendarId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setBooking(result.bookingDetails);
      } else {
        setError(result.error || 'Failed to book consultation');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-primary-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-6">
          Book a Free Consultation
        </h2>
        <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto">
          Fill in the form below and our expert team will reach out to schedule your
          complimentary discovery session.
        </p>

        {booking && (
          <div className="bg-green-50 text-green-800 p-4 rounded-lg mb-6">
            <h3 className="font-semibold">Consultation Scheduled!</h3>
            <p className="mt-2">
              Your consultation has been scheduled for <strong>{booking.preferredDate}</strong>.
              We'll send a confirmation to <strong>{booking.email}</strong> shortly.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleBookConsultation} className="space-y-6">
          <div className="space-y-3">
            <label htmlFor="email" className="block text-sm font-medium text-gray-100 mb-2">
              Email address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full bg-white rounded-md px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="service" className="block text-sm font-medium text-gray-100 mb-2">
              Service Type
            </label>
            <select
              id="service"
              name="service"
              required
              className="w-full bg-white rounded-md px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="">Select a service</option>
              <option value="management-health-audit">Management Health Audit</option>
              <option value="profitability-analysis">Profitability Analysis</option>
              <option value="expense-cost-analysis">Expense & Cost Analysis</option>
              <option value="tax-optimization">Tax Optimization</option>
              <option value="digital-transformation">Digital Transformation</option>
              <option value="growth-strategy">Growth Strategy</option>
            </select>
          </div>

          <div className="space-y-3">
            <label htmlFor="date" className="block text-sm font-medium text-gray-100 mb-2">
              Preferred Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              required
              className="w-full bg-white rounded-md px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white rounded-md px-6 py-3 text-sm font-medium text-primary-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
          >
            {loading ? 'Checking availability...' : 'Book Consultation'}
          </button>
        </form>

        <div className="mt-8 flex flex-col sm:flex-row sm:justify-center space-y-4 sm:space-y-0 sm:space-x-4 text-gray-100">
          <div className="flex items-center space-x-3">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            Email: info@kibusiness.co
          </div>
          <div className="flex items-center space-x-3">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.8.52l1.58 4A1 1 0 019.82 11h5.36a1 1 0 01.8.52l1.58 4A1 1 0 0117 15a2 2 0 012 2v1a2 2 0 01-2 2H3a2 2 0 01-2-2V5z"></path>
            </svg>
            Phone: +1 (814) 300-8665
          </div>
        </div>
      </div>
    </section>
  );
}
