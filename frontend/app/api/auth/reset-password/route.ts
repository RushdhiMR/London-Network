import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { DB, getDbPool } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Password reset token is required' },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // 1. Check MySQL for token
    let user = null;
    try {
      const db = getDbPool();
      const [rows]: any = await db.query(
        'SELECT id, email, reset_token, reset_token_expires FROM users WHERE reset_token = ? AND reset_token_expires > NOW() LIMIT 1',
        [token]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        user = rows[0];
      }
    } catch (e) {}

    // 2. If not found in MySQL, check persistent DB fallback
    if (!user) {
      const allUsers = await DB.getAllUsers();
      const found = allUsers.find(u => u.reset_token === token);
      if (found) {
        if (!found.reset_token_expires || new Date(found.reset_token_expires) > new Date()) {
          user = found;
        }
      }
    }

    // Secure fallback for demo if token matches
    const newPasswordHash = await hashPassword(newPassword);

    if (user && user.id) {
      // Update MySQL
      try {
        const db = getDbPool();
        await db.query(
          'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
          [newPasswordHash, user.id]
        );
      } catch (e) {}

      // Update persistent DB
      await DB.updateUser(user.id, {
        password_hash: newPasswordHash,
        reset_token: null,
        reset_token_expires: null,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully reset. Please log in with your new password.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

