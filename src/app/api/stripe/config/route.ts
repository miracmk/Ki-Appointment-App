import { NextResponse } from 'next/server';
import { getActiveKiStripePosConfig } from '@/lib/stripe-pos';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getActiveKiStripePosConfig();
    return NextResponse.json({ publishableKey: config.publishableKey });
  } catch {
    const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
    return NextResponse.json({ publishableKey: envKey });
  }
}
