import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { DB, SubscriptionStatus } from '@/lib/db';

export async function GET(request: Request) {
  const rbac = await requireRole(request, 'admin');
  if (!rbac.authorized) {
    return rbac.response;
  }

  try {
    const subscriptions = await DB.getAllSiteSubscriptions();

    const now = Date.now();
    const stats = {
      total: subscriptions.length,
      activeFreeTrials: subscriptions.filter(s => s.status === 'Free Trial' && new Date(s.trialExpiryDate).getTime() > now).length,
      activePaid: subscriptions.filter(s => s.status === 'Active Paid').length,
      expired: subscriptions.filter(s => s.status === 'Expired' || (s.status === 'Free Trial' && new Date(s.trialExpiryDate).getTime() <= now)).length,
      paymentPending: subscriptions.filter(s => s.status === 'Payment Pending').length,
      cancelled: subscriptions.filter(s => s.status === 'Cancelled').length,
    };

    return NextResponse.json({
      success: true,
      subscriptions,
      stats
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admin subscriptions' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const rbac = await requireRole(request, 'admin');
  if (!rbac.authorized) {
    return rbac.response;
  }

  try {
    const body = await request.json();
    const { id, status, paymentStatus, paymentAmount, plan } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Subscription ID is required.' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (status) updates.status = status as SubscriptionStatus;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (paymentAmount) updates.paymentAmount = paymentAmount;
    if (plan) {
      updates.plan = plan;
      updates.planName = plan === 'bundle' ? 'London BigBen Digital Bundle' : 'London BigBen Digital';
      updates.price = plan === 'bundle' ? '$5 USD/month' : '$3 USD/month';
    }

    const updated = await DB.updateSiteSubscription(id, updates);
    if (!updated) {
      return NextResponse.json(
        { error: 'Subscription record not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription updated successfully.'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update subscription.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const rbac = await requireRole(request, 'admin');
  if (!rbac.authorized) {
    return rbac.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Subscription ID is required.' },
        { status: 400 }
      );
    }

    const deleted = await DB.deleteSiteSubscription(id);
    return NextResponse.json({
      success: true,
      deleted
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete subscription.' },
      { status: 500 }
    );
  }
}
