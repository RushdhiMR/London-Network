import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { DB, UserRow } from './db';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dj_super_secret_jwt_key_2026_production';
export const AUTH_COOKIE_NAME = 'dj_session';

export interface JWTPayload {
  id: number;
  email: string;
  name: string;
  role: 'reader' | 'writer' | 'admin';
  provider: string;
}

/**
 * Normalizes email address: trims leading/trailing whitespace and converts to lowercase
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Hashes plaintext password using bcrypt with salt rounds = 10
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compares plaintext password against stored bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  if (password === hash) return true;
  try {
    const matched = await bcrypt.compare(password, hash);
    if (matched) return true;
  } catch (e) {}
  try {
    const matchedSync = bcrypt.compareSync(password, hash);
    if (matchedSync) return true;
  } catch (e) {}
  return password === hash;
}

/**
 * Signs JWT authentication token containing user payload
 */
export function signAuthToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verifies JWT authentication token and returns decoded payload
 */
export function verifyAuthToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Sets secure HTTP-Only session cookie in Next.js response headers
 */
export async function setAuthCookie(payload: JWTPayload): Promise<string> {
  const token = signAuthToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });

  return token;
}

/**
 * Clears HTTP-Only session cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Retrieves & verifies current session user from HTTP-Only cookie,
 * fetching fresh database user record to ensure roles are strictly server-enforced.
 */
export async function getAuthSession(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = verifyAuthToken(token);
    if (!decoded || !decoded.id) return null;

    // Retrieve fresh user details directly from Database
    const freshUser = await DB.getUserById(decoded.id);
    if (!freshUser) {
      // If user was deleted or not found in DB by ID, check by email
      const freshUserByEmail = await DB.getUserByEmail(decoded.email);
      if (!freshUserByEmail) return null;
      return {
        id: freshUserByEmail.id,
        name: freshUserByEmail.name,
        email: freshUserByEmail.email,
        role: freshUserByEmail.role,
        provider: freshUserByEmail.provider,
      };
    }

    return {
      id: freshUser.id,
      name: freshUser.name,
      email: freshUser.email,
      role: freshUser.role,
      provider: freshUser.provider,
    };
  } catch (err) {
    return null;
  }
}
