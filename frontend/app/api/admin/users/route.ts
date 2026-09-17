import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { DB } from '@/lib/db';
import { isB2Configured, uploadToB2 } from '@/lib/backblaze';
import bcrypt from 'bcryptjs';

// GET /api/admin/users - Admin only
export async function GET(request: Request) {
  const rbac = await requireRole(request, 'admin');
  if (!rbac.authorized) {
    return rbac.response;
  }

  try {
    const users = await DB.getAllUsers();
    const sanitizedUsers = users.map((u: any) => {
      const { password_hash, password, ...rest } = u;
      return rest;
    });
    return NextResponse.json({
      success: true,
      users: sanitizedUsers,
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
      rbac.user?.email === 'geethliyanage979@gmail.com' ||
      rbac.user?.email === 'londonbigben.offical@gmail.com' ||
      rbac.user?.email === 'akramyoonos006@gmail.com' ||
      Boolean((rbac.user as any)?.isDefaultAdmin);

    if (normalizedRole === 'admin' && !isDefaultAdmin) {
      return NextResponse.json(
        { error: 'Permission Denied: Only the Default Administrator can create or assign Admin accounts. Normal admins can only add Writers and Readers.' },
        { status: 403 }
      );
    }

    const passwordHash = bcrypt.hashSync(password && password.trim() ? password.trim() : 'digitaljournal123', 10);

    let finalAvatar = body.avatar || null;
    if (body.avatar && typeof body.avatar === 'string' && (body.avatar.startsWith('data:image/') || (!body.avatar.startsWith('http') && body.avatar.length > 100))) {
      if (isB2Configured()) {
        try {
          const matches = body.avatar.match(/^data:([^;]+);base64,(.+)$/);
          let mimeType = 'image/webp';
          let buffer: Buffer | null = null;
          if (matches) {
            mimeType = matches[1] || 'image/webp';
            buffer = Buffer.from(matches[2], 'base64');
          } else {
            buffer = Buffer.from(body.avatar, 'base64');
          }

          if (buffer) {
            const ext = mimeType.includes('png') ? '.png' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? '.jpg' : '.webp';
            const cleanUser = (name || normalizedEmail.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
            const fileName = `avatar-${cleanUser}-${Date.now()}${ext}`;
            const b2Res = await uploadToB2(buffer, fileName, mimeType, 'avatars');
            if (b2Res.success && b2Res.url) {
              finalAvatar = b2Res.url;
            }
          }
        } catch (e) {}
      }
    }

    const newUser = await DB.createUser({
      name: name.trim(),
      email: normalizedEmail,
      password_hash: passwordHash,
      role: normalizedRole as any,
      provider: 'local',
      email_verified: true,
      avatar: finalAvatar,
    });

    const { password_hash: _ph, password: _p, ...safeNewUser } = newUser as any;

    return NextResponse.json({
      success: true,
      message: `User ${newUser.name} created successfully as ${normalizedRole}`,
      user: safeNewUser,
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
    const { id, name, email, role, password, originalEmail } = body;

    if (!id && !email && !originalEmail) {
      return NextResponse.json(
        { error: 'User ID or Email is required' },
        { status: 400 }
      );
    }

    let targetUser = id ? await DB.getUserById(id) : null;
    if (!targetUser && originalEmail) {
      targetUser = await DB.getUserByEmail(originalEmail);
    }
    if (!targetUser && email) {
      targetUser = await DB.getUserByEmail(email);
    }

    if (!targetUser) {
      const normalizedEmail = (email || originalEmail || '').trim().toLowerCase();
      const validRoles = ['reader', 'writer', 'admin'];
      const normalizedRole = (role || 'reader').toLowerCase().trim();
      const passwordHash = bcrypt.hashSync(password && password.trim() ? password.trim() : 'digitaljournal123', 10);
      targetUser = await DB.createUser({
        name: (name || normalizedEmail.split('@')[0] || 'User').trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        role: validRoles.includes(normalizedRole) ? (normalizedRole as any) : 'reader',
        provider: 'local',
        email_verified: true,
      });
    }

    const isSelf = Boolean(
      rbac.user &&
      (rbac.user.id === targetUser.id ||
       (rbac.user.email && targetUser.email && rbac.user.email.toLowerCase().trim() === targetUser.email.toLowerCase().trim()))
    );

    const isDefaultAdmin =
      rbac.user?.email === 'geethliyanage979@gmail.com' ||
      rbac.user?.email === 'londonbigben.offical@gmail.com' ||
      rbac.user?.email === 'akramyoonos006@gmail.com' ||
      rbac.user?.email === 'rushdhiriyaj2005@gmail.com' ||
      Boolean((rbac.user as any)?.isDefaultAdmin) ||
      Boolean((rbac.user as any)?.is_default_admin);

    const isTargetDefaultAdmin = Boolean(
      targetUser.email === 'geethliyanage979@gmail.com' ||
      targetUser.email === 'londonbigben.offical@gmail.com' ||
      targetUser.email === 'akramyoonos006@gmail.com' ||
      targetUser.email === 'rushdhiriyaj2005@gmail.com' ||
      Boolean((targetUser as any)?.isDefaultAdmin) ||
      Boolean((targetUser as any)?.is_default_admin)
    );

    if (isTargetDefaultAdmin && !isSelf) {
      return NextResponse.json(
        { error: 'Permission Denied: Default Administrator accounts cannot be edited by other users.' },
        { status: 403 }
      );
    }

    if (targetUser.role === 'admin' && !isSelf && !isDefaultAdmin) {
      return NextResponse.json(
        { error: 'Permission Denied: Only the Default Administrator can edit other administrator accounts.' },
        { status: 403 }
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
      if (existing && String(existing.id) !== String(targetUser.id)) {
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
        rbac.user?.email === 'geethliyanage979@gmail.com' ||
        rbac.user?.email === 'londonbigben.offical@gmail.com' ||
        rbac.user?.email === 'akramyoonos006@gmail.com' ||
        Boolean((rbac.user as any)?.isDefaultAdmin);

      // Protect default admin from losing admin role
      if (Boolean((targetUser as any)?.is_default_admin || targetUser.email === 'geethliyanage979@gmail.com') && normalizedRole !== 'admin') {
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

    if (body.avatar) {
      let finalAvatar = body.avatar;
      if (typeof body.avatar === 'string' && (body.avatar.startsWith('data:image/') || (!body.avatar.startsWith('http') && body.avatar.length > 100))) {
        if (isB2Configured()) {
          try {
            const matches = body.avatar.match(/^data:([^;]+);base64,(.+)$/);
            let mimeType = 'image/webp';
            let buffer: Buffer | null = null;
            if (matches) {
              mimeType = matches[1] || 'image/webp';
              buffer = Buffer.from(matches[2], 'base64');
            } else {
              buffer = Buffer.from(body.avatar, 'base64');
            }

            if (buffer) {
              const ext = mimeType.includes('png') ? '.png' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? '.jpg' : '.webp';
              const cleanUser = (name || targetUser.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
              const fileName = `avatar-${cleanUser}-${Date.now()}${ext}`;
              const b2Res = await uploadToB2(buffer, fileName, mimeType, 'avatars');
              if (b2Res.success && b2Res.url) {
                finalAvatar = b2Res.url;
              }
            }
          } catch (e) {}
        }
      }
      updates.avatar = finalAvatar;
    }

    const updatedUser = await DB.updateUser(targetUser.id, updates, originalEmail || targetUser.email);
    const { password_hash: _uph, password: _up, ...safeUpdatedUser } = (updatedUser || targetUser || {}) as any;

    return NextResponse.json({
      success: true,
      message: `User details updated successfully`,
      user: safeUpdatedUser,
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

    const callerEmail = (rbac.user?.email || '').toLowerCase().trim();
    const isCallerDefaultAdmin =
      callerEmail === 'geethliyanage979@gmail.com' ||
      callerEmail === 'londonbigben.offical@gmail.com' ||
      callerEmail === 'akramyoonos006@gmail.com' ||
      callerEmail === 'rushdhiriyaj2005@gmail.com' ||
      Boolean((rbac.user as any)?.isDefaultAdmin) ||
      Boolean((rbac.user as any)?.is_default_admin);

    const targetUser = id ? await DB.getUserById(id) : (email ? await DB.getUserByEmail(email) : null);
    const targetEmailLower = (email || targetUser?.email || '').toLowerCase().trim();

    const isSelf = Boolean(
      rbac.user &&
      ((targetUser && rbac.user.id === targetUser.id) ||
       (callerEmail && targetEmailLower && callerEmail === targetEmailLower))
    );

    if (isSelf) {
      return NextResponse.json(
        { error: 'You cannot delete your own account while logged in.' },
        { status: 400 }
      );
    }

    const isTargetDefaultAdmin = Boolean(
      targetEmailLower === 'geethliyanage979@gmail.com' ||
      targetEmailLower === 'londonbigben.offical@gmail.com' ||
      targetEmailLower === 'akramyoonos006@gmail.com' ||
      Boolean((targetUser as any)?.isDefaultAdmin) ||
      Boolean((targetUser as any)?.is_default_admin)
    );

    if (isTargetDefaultAdmin) {
      return NextResponse.json(
        { error: 'System Protection: The Default Administrator account cannot be deleted.' },
        { status: 403 }
      );
    }

    if (!isCallerDefaultAdmin) {
      if (targetUser?.role === 'admin') {
        return NextResponse.json(
          { error: 'Permission Denied: Only Default Administrators can delete administrator accounts.' },
          { status: 403 }
        );
      }
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
