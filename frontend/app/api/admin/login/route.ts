import { NextResponse } from 'next/server';
import { sendSignInNotificationEmail } from '@/lib/email';
import { setAuthCookie } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`admin-login:${clientIp}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      const waitMinutes = Math.ceil(rateCheck.resetInMs / 60000);
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${waitMinutes} minute(s) before trying again.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Admin email and passcode are required' },
        { status: 400 }
      );
    }

    const normalized = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Query user directly from DB
    const { DB } = await import('@/lib/db');
    const { comparePassword } = await import('@/lib/auth');
    let user = await DB.getUserByEmail(normalized);

    if (user && user.role === 'admin' && user.password_hash) {
      const isValid = await comparePassword(cleanPassword, user.password_hash);
      if (isValid) {
        const adminName = user.name || 'Administrator';
        
        try {
          await sendSignInNotificationEmail(user.email, adminName);
        } catch (e) {
          console.warn('Admin notification email skipped:', e);
        }

        const userPayload = {
          id: user.id,
          name: adminName,
          email: user.email,
          role: 'admin' as const,
          provider: user.provider || 'local',
        };

        await setAuthCookie(userPayload);

        return NextResponse.json({
          success: true,
          message: 'Admin authentication successful',
          user: userPayload,
        });
      }
    }

    return NextResponse.json(
      { error: 'Invalid admin credentials' },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

