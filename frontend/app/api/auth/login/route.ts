import { NextResponse } from 'next/server';
import { normalizeEmail, comparePassword, setAuthCookie } from '@/lib/auth';
import { DB } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalized = normalizeEmail(email);
    const cleanPassword = password.trim();

    // 1. Check if user was deleted/revoked by administrator in database
    const isDeleted = await DB.isEmailDeleted(normalized);
    if (isDeleted) {
      return NextResponse.json(
        { error: 'Access Denied: This account has been removed by the administrator. Access is disabled until re-added.' },
        { status: 403 }
      );
    }

    // 2. Query user directly from Database (Source of Truth)
    let user = await DB.getUserByEmail(normalized);

    if (user && user.password_hash) {
      const isValid = await comparePassword(cleanPassword, user.password_hash);

      if (isValid) {
        const userPayload = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          provider: user.provider,
        };

        // Issue secure HTTP-Only session cookie and return token for tab session isolation
        const token = await setAuthCookie(userPayload);

        return NextResponse.json({
          success: true,
          message: 'Login successful',
          user: userPayload,
          token,
        });
      }
    }

    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
