import { redirect } from 'next/navigation';

export default function SettingsWorkingHoursPage() {
  redirect('/dashboard/settings?tab=working_hours');
}
