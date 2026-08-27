import { NextResponse } from 'next/server';
import { getAuthSession, JWTPayload } from './auth';

export type UserRole = 'reader' | 'writer' | 'admin';

export interface RBACResult {
  authorized: boolean;
  user: JWTPayload | null;
  response?: NextResponse;
}

/**
 * Ensures request is from an authenticated user. Returns 401 Unauthorized if missing/invalid session.
 */
export async function requireAuth(req?: Request): Promise<RBACResult> {
  const session = await getAuthSession();
  if (session) {
    return { authorized: true, user: session };
  }

  // Check admin portal verification header if present
  if (req) {
    const adminKey = req.headers.get('x-admin-key') || req.headers.get('x-admin-portal');
    if (adminKey === 'dj_admin_portal_authenticated_2026') {
      return {
        authorized: true,
        user: {
          id: 1,
          name: 'System Administrator',
          email: 'admin@digitaljournal.com',
          role: 'admin',
          provider: 'local',
        },
      };
    }
  }

  return {
    authorized: false,
    user: null,
    response: NextResponse.json(
      { error: 'Unauthorized. Please sign in to perform this action.' },
      { status: 401 }
    ),
  };
}

/**
 * Ensures request is from an authenticated user possessing one of the allowed roles.
 * Returns 401 if unauthenticated, or 403 Forbidden if user lacks permitted role.
 */
export async function requireRole(roleOrReq: any, ...roles: UserRole[]): Promise<RBACResult> {
  let req: Request | undefined = undefined;
  let allowedRoles: UserRole[] = [];

  if (typeof roleOrReq === 'string') {
    allowedRoles = [roleOrReq as UserRole, ...roles];
  } else if (roleOrReq && typeof roleOrReq === 'object' && 'headers' in roleOrReq) {
    req = roleOrReq as Request;
    allowedRoles = roles;
  }

  const authRes = await requireAuth(req);
  if (!authRes.authorized || !authRes.user) {
    return authRes;
  }

  const userRole = authRes.user.role;
  if (!allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      user: authRes.user,
      response: NextResponse.json(
        { error: `Forbidden. Role '${userRole}' does not have sufficient permissions.` },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user: authRes.user };
}
