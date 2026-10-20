import { NextResponse } from 'next/server';
import { DB, SubscriptionPlanId } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, plan = 'digital', phone } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const validPlans: SubscriptionPlanId[] = ['digital', 'bundle'];
    const selectedPlan: SubscriptionPlanId = validPlans.includes(plan) ? plan : 'digital';

    const session = await getAuthSession();
    const cleanEmail = email.trim().toLowerCase();

    // Verify trial eligibility securely on backend
    const eligibility = await DB.checkTrialEligibility(cleanEmail, session?.id);
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: eligibility.reason || 'You are not eligible for another free trial.',
          existingSubscription: eligibility.existingSubscription,
          eligible: false
        },
        { status: 403 }
      );
    }

    const displayName = (name || (session?.email?.toLowerCase() === cleanEmail ? session?.name : cleanEmail.split('@')[0]) || 'Reader').trim();

    const result = await DB.createSiteSubscription({
      userId: session && session.email?.toLowerCase() === cleanEmail ? session.id : null,
      name: displayName,
      email: cleanEmail,
      phone: typeof phone === 'string' ? phone.trim() : null,
      plan: selectedPlan
    });

    if (!result.success || !result.subscription) {
      return NextResponse.json(
        { error: result.error || 'Failed to activate 1-year free subscription.' },
        { status: 400 }
      );
    }

    // Also sync to newsletter list so reader receives email communications
    try {
      await DB.addSubscriber(cleanEmail, selectedPlan === 'bundle' ? ['ALL NEWS', 'BUSINESS', 'MARKETS', 'PREMIUM'] : ['ALL NEWS', 'DIGITAL']);
    } catch (e) {
      console.warn('Newsletter sync error during subscription:', e);
    }

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
      message: `Enjoy your first year free! Your subscription to ${result.subscription.planName} is active.`
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error while processing subscription.' },
      { status: 500 }
    );
  }
}
