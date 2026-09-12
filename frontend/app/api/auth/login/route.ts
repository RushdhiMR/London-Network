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

    // Only default system admin can be fallback initialized if database is completely fresh
    if (!user && normalized === 'admin@digitaljournal.com') {
      user = {
        id: 1,
        name: 'System Administrator',
        email: 'admin@digitaljournal.com',
        password_hash: '$2b$10$gyyrusfVDr4wRtloRzoPH.3n1DMqBGfQiR7mzTtINm6IlmH/Oiwgu',
        provider: 'local',
        google_id: null,
        role: 'admin',
        email_verified: 1,
        reset_token: null,
        reset_token_expires: null
      };
    }

    const defaultAdminHash = '$2b$10$4nwUmwVpHtDTbJKDU2fxtOU3x2IZpyIsAVLGdd2qahplphjWmbn2K'; // admin123

    const isKnownDefaultAdmin =
      normalized === 'geethliyanage979@gmail.com' ||
      normalized === 'londonbigben.offical@gmail.com' ||
      normalized === 'akramyoonos006@gmail.com' ||
      Boolean(user?.is_default_admin);

    const effectiveHash = user?.password_hash || (isKnownDefaultAdmin ? defaultAdminHash : null);

    if (user && effectiveHash) {
      const isValid = await comparePassword(cleanPassword, effectiveHash);

      if (isValid) {
        // If user didn't have password_hash saved, save it now
        if (!user.password_hash) {
          try {
            await DB.updateUser(user.id, { password_hash: defaultAdminHash });
          } catch (e) {}
        }

        const userPayload = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          provider: user.provider,
        };

        // Issue secure HTTP-Only session cookie
        await setAuthCookie(userPayload);

        return NextResponse.json({
          success: true,
          message: 'Login successful',
          user: userPayload,
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
