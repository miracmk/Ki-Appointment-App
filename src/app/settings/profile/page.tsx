import { redirect } from 'next/navigation';

export default function SettingsProfilePage() {
  redirect('/dashboard/settings?tab=profile');
}
