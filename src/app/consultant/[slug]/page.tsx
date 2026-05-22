import { notFound } from 'next/navigation';

async function fetchConsultantBySlug(slug: string) {
  const res = await fetch(`/api/consultant-by-slug?slug=${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.consultant ?? null;
}

export default async function ConsultantPage({ params }: { params: { slug: string } }) {
  const user = await fetchConsultantBySlug(params.slug);
  if (!user) return notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 text-white">
      <div className="space-y-4 rounded-3xl border border-white/10 bg-[#0F172A]/80 p-8">
        <div className="flex items-center gap-4">
          <img
            src={user.photo_url || '/avatar-placeholder.svg'}
            alt={user.displayName || user.name}
            className="h-24 w-24 rounded-3xl object-cover"
          />
          <div>
            <h1 className="text-4xl font-semibold">{user.displayName || user.name}</h1>
            <p className="mt-2 text-sm text-white/60">{user.title || 'Consultant'}</p>
          </div>
        </div>

        {user.bio && (
          <div className="rounded-3xl border border-white/10 bg-[#111827] p-6">
            <h2 className="text-xl font-semibold">About</h2>
            <p className="mt-3 text-sm leading-7 text-white/70">{user.bio}</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#111827] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">Areas of expertise</h3>
            <p className="mt-3 text-sm text-white/70">{user.skills || 'Not specified'}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#111827] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">Availability</h3>
            <p className="mt-3 text-sm text-white/70">{user.availableHours || 'Available by request'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
