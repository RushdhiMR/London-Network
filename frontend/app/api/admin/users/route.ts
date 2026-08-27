import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { DB } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/admin/users - Admin only
export async function GET(request: Request) {
  const rbac = await requireRole(request, 'admin');
  if (!rbac.authorized) {
    return rbac.response;
  }

  try {
    const users = await DB.getAllUsers();
    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Admin only (Create new user)
export async function POST(request: Request) {
  const rbac = await requireRole(request, 'admin');
  if (!rbac.authorized) {
    return rbac.response;
  }

  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'User name is required' },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await DB.getUserByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email address already exists' },
        { status: 400 }
      );
    }

    const validRoles = ['reader', 'writer', 'admin'];
    const normalizedRole = (role || 'reader').toLowerCase().trim();
    if (!validRoles.includes(normalizedRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be reader, writer, or admin.' },
        { status: 400 }
      );
    }

    const isDefaultAdmin =
      rbac.user?.id === 1 ||
      rbac.user?.email === 'admin@digitaljournal.com' ||
      rbac.user?.email === 'akramyoonos006@gmail.com' ||
      Boolean((rbac.user as any)?.isDefaultAdmin);

    if (normalizedRole === 'admin' && !isDefaultAdmin) {
      return NextResponse.json(
        { error: 'Permission Denied: Only the Default Administrator can create or assign Admin accounts. Normal admins can only add Writers and Readers.' },
        { status: 403 }
      );
    }

    const passwordHash = bcrypt.hashSync(password && password.trim() ? password.trim() : 'digitaljournal123', 10);

    const newUser = await DB.createUser({
      name: name.trim(),
      email: normalizedEmail,
      password_hash: passwordHash,
      role: normalizedRole as any,
      provider: 'local',
      email_verified: true,
    });

    return NextResponse.json({
      success: true,
      message: `User ${newUser.name} created successfully as ${normalizedRole}`,
      user: newUser,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users - Admin only (Update user name, email, role, password)
export async function PUT(request: Request) {
  const rbac = await requireRole(request, 'admin');
  if (!rbac.authorized) {
    return rbac.response;
  }

  try {
    const body = await request.json();
    const { id, name, email, role, password } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const targetUser = await DB.getUserById(Number(id));
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const updates: any = {};

    if (name && name.trim()) {
      updates.name = name.trim();
    }

    if (email && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      // Check if email already taken by another user
      const existing = await DB.getUserByEmail(normalizedEmail);
      if (existing && existing.id !== Number(id)) {
        return NextResponse.json(
          { error: 'This email is already in use by another user' },
          { status: 400 }
        );
      }
      updates.email = normalizedEmail;
    }

    if (role) {
      const validRoles = ['reader', 'writer', 'admin'];
      const normalizedRole = role.toLowerCase().trim();
      if (!validRoles.includes(normalizedRole)) {
        return NextResponse.json(
          { error: 'Invalid role specified. Must be reader, writer, or admin.' },
          { status: 400 }
        );
      }

      const isDefaultAdmin =
        rbac.user?.id === 1 ||
        rbac.user?.email === 'admin@digitaljournal.com' ||
        rbac.user?.email === 'akramyoonos006@gmail.com' ||
        Boolean((rbac.user as any)?.isDefaultAdmin);

      // Protect default admin from losing admin role
      if ((targetUser.id === 1 || targetUser.email === 'admin@digitaljournal.com') && normalizedRole !== 'admin') {
        return NextResponse.json(
          { error: 'The Default Administrator account must retain the admin role.' },
          { status: 400 }
        );
      }

      // Only default admin can assign or promote to admin role
      if (normalizedRole === 'admin' && targetUser.role !== 'admin' && !isDefaultAdmin) {
        return NextResponse.json(
          { error: 'Permission Denied: Only the Default Administrator can promote accounts to Admin.' },
          { status: 403 }
        );
      }

      updates.role = normalizedRole;
    }

    if (password && password.trim()) {
      updates.password_hash = bcrypt.hashSync(password.trim(), 10);
    }

    const updatedUser = await DB.updateUser(Number(id), updates);

    return NextResponse.json({
      success: true,
      message: `User details updated successfully`,
      user: updatedUser,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users - Admin only (Delete user)
export async function DELETE(request: Request) {
  const rbac = await requireRole(request, 'admin');
  if (!rbac.authorized) {
    return rbac.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    let email = searchParams.get('email');

    if (!id && !email) {
      try {
        const body = await request.json();
        id = body.id;
        email = body.email;
      } catch (e) {
        // ignore JSON parse error if param was query string
      }
    }

    if (!id && !email) {
      return NextResponse.json(
        { error: 'User ID or Email is required' },
        { status: 400 }
      );
    }

    const targetUser = id ? await DB.getUserById(id) : (email ? await DB.getUserByEmail(email) : null);
    if (targetUser && (targetUser.id === 1 || targetUser.email === 'admin@digitaljournal.com' || targetUser.email === 'akramyoonos006@gmail.com')) {
      return NextResponse.json(
        { error: 'System Protection: The Default Administrator account cannot be deleted.' },
        { status: 403 }
      );
    }

    const targetEmail = email || targetUser?.email || (typeof id === 'string' && id.includes('@') ? id : undefined);
    const targetId = id || targetUser?.id;

    const deleted = await DB.deleteUser(targetId || targetEmail || '', targetEmail);

    return NextResponse.json({
      success: true,
      message: 'User deleted and permanently revoked from database until re-added by administrator',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
