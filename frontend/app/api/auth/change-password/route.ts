import { NextResponse } from 'next/server';
import { getAuthSession, comparePassword, hashPassword } from '@/lib/auth';
import { DB, getDbPool } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session || !session.email) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in to change your password' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword) {
      return NextResponse.json(
        { error: 'Current password is required' },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Fetch user from DB to get their current password_hash
    const user = await DB.getUserByEmail(session.email);
    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: 'User account not found or has no password set' },
        { status: 404 }
      );
    }

    // Verify current password against stored bcrypt hash
    const isCurrentValid = await comparePassword(currentPassword.trim(), user.password_hash);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: 'Incorrect current password' },
        { status: 400 }
      );
    }

    // Hash the new password with bcrypt
    const newHash = await hashPassword(newPassword.trim());

    // Update in MySQL
    try {
      const db = getDbPool();
      await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);
    } catch (e) {}

    // Update in persistent DB
    await DB.updateUser(user.id, {
      password_hash: newHash,
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
