import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth';
import { DB } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Tab-isolated authentication: require tab session token from headers.
    // We intentionally DO NOT fall back to shared domain cookies here because
    // browser cookies are shared across all tabs, which causes signed-out tabs
    // to automatically inherit another tab's login state on refresh.
    const authHeader = request.headers.get('authorization') || request.headers.get('x-tab-session');
    let token: string | null = null;
    if (authHeader) {
      token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    }

    if (!token) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    const decoded = verifyAuthToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    // Retrieve fresh user details directly from Database
    const freshUser = (await DB.getUserById(decoded.id)) || (await DB.getUserByEmail(decoded.email));
    if (!freshUser) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: freshUser.id,
        name: freshUser.name,
        email: freshUser.email,
        role: freshUser.role,
        provider: freshUser.provider,
        avatar: (freshUser as any).avatar || null,
        bio: (freshUser as any).bio || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { authenticated: false, user: null, error: error.message },
      { status: 500 }
    );
  }
}
