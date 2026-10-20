import { NextResponse } from 'next/server';
import { DB } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let email = searchParams.get('email');

    const session = await getAuthSession();
    if (!email && session?.email) {
      email = session.email;
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({
        success: true,
        subscription: null,
        isEligibleForTrial: true,
        serverTime: new Date().toISOString()
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const subscription = await DB.getSiteSubscriptionByEmail(cleanEmail);
    const eligibility = await DB.checkTrialEligibility(cleanEmail, session?.id);

    const now = Date.now();
    let remainingDays = 0;
    let isExpired = false;

    if (subscription) {
      const expTime = new Date(subscription.trialExpiryDate).getTime();
      const diffMs = expTime - now;
      remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      isExpired = subscription.status === 'Expired' || (subscription.status === 'Free Trial' && diffMs <= 0);
    }

    return NextResponse.json({
      success: true,
      subscription,
      isEligibleForTrial: eligibility.eligible,
      eligibilityReason: eligibility.reason || null,
      isExpired,
      remainingDays,
      serverTime: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}
