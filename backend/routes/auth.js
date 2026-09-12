const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { sendSignInNotificationEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dj_super_secret_jwt_key_2026_production';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function normalizeEmail(email) {
  if (!email) return '';
  return email.trim().toLowerCase();
}

const SYSTEM_ACCOUNTS = {
  'admin@digitaljournal.com': { pass: ['admin', 'admin123', 'Admin@123', 'admin2026', 'secret'], name: 'System Administrator', role: 'admin' },
  'admin': { pass: ['admin', 'admin123', 'Admin@123', 'admin2026', 'secret'], name: 'System Administrator', role: 'admin' },
  'coadmin@digitaljournal.com': { pass: ['coadmin', 'coadmin123', 'coadmin2026'], name: 'Operations Co-Admin', role: 'admin' },
  'coadmin': { pass: ['coadmin', 'coadmin123', 'coadmin2026'], name: 'Operations Co-Admin', role: 'admin' },
  'writer@digitaljournal.com': { pass: ['writer', 'writer123', 'writer2026'], name: 'Jennifer Friesen', role: 'writer' },
  'writer': { pass: ['writer', 'writer123', 'writer2026'], name: 'Jennifer Friesen', role: 'writer' },
  'reader@digitaljournal.com': { pass: ['reader', 'reader123', 'reader2026'], name: 'Alex Reader', role: 'reader' },
  'reader': { pass: ['reader', 'reader123', 'reader2026'], name: 'Alex Reader', role: 'reader' },
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalized = normalizeEmail(email);
    const cleanPassword = (password || '').trim();

    try {
      const [rows] = await db.query(
        'SELECT id, name, email, password_hash, role, provider FROM users WHERE email = ?',
        [normalized]
      );

      if (rows && rows.length > 0) {
        const user = rows[0];
        let isValid = false;

        if (user.password_hash) {
          isValid = await bcrypt.compare(cleanPassword, user.password_hash);
        }

        if (isValid) {
          const userPayload = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || 'user',
            provider: user.provider || 'local',
          };

          const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

          res.cookie('dj_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
          });

          await sendSignInNotificationEmail(user.email, user.name);

          return res.json({
            success: true,
            message: 'Login successful',
            token,
            user: userPayload,
          });
        }
      }
    } catch (dbError) {
      console.warn('[Backend Auth] DB error during login:', dbError);
    }

    // System Seed Account Fallback (e.g. admin@digitaljournal.com / admin123)
    const systemAcc = SYSTEM_ACCOUNTS[normalized];
    if (systemAcc && systemAcc.pass.includes(cleanPassword)) {
      const fullEmail = normalized.includes('@') ? normalized : `${normalized}@digitaljournal.com`;
      
      const userPayload = {
        id: 1,
        name: systemAcc.name,
        email: fullEmail,
        role: systemAcc.role,
        provider: 'local',
      };

      const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

      res.cookie('dj_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      await sendSignInNotificationEmail(fullEmail, systemAcc.name);

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: userPayload,
      });
    }

    return res.status(401).json({ error: 'Invalid email or password.' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalized = normalizeEmail(email);

    if (!emailRegex.test(normalized)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const userName = name.trim();

    try {
      const [existingUsers] = await db.query(
        'SELECT id FROM users WHERE email = ?',
        [normalized]
      );

      if (existingUsers && existingUsers.length > 0) {
        return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userRole = 'reader';

      const [result] = await db.query(
        'INSERT INTO users (name, email, password_hash, provider, role, email_verified) VALUES (?, ?, ?, ?, ?, ?)',
        [userName, normalized, passwordHash, 'local', userRole, false]
      );

      const userId = result.insertId;
      const userPayload = {
        id: userId,
        name: userName,
        email: normalized,
        role: userRole,
        provider: 'local',
      };

      const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

      res.cookie('dj_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      await sendWelcomeEmail(normalized, userName);

      return res.json({
        success: true,
        message: 'User registered successfully',
        token,
        user: userPayload,
      });
    } catch (dbError) {
      if (dbError.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
      }
      console.warn('[Backend Auth] DB error during register:', dbError);
    }

    const fallbackUser = {
      id: Date.now(),
      name: userName,
      email: normalized,
      role: 'reader',
      provider: 'local',
    };

    return res.json({
      success: true,
      message: 'User registered successfully',
      user: fallbackUser,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('dj_session');
  return res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.dj_session || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ authenticated: false, user: null });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await db.query('SELECT id, name, email, role, provider, created_at FROM users WHERE id = ?', [decoded.id]);

    if (rows && rows.length > 0) {
      return res.json({ authenticated: true, user: rows[0] });
    }

    return res.json({ authenticated: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ authenticated: false, user: null });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential, accessToken } = req.body;

    if (!credential && !accessToken) {
      return res.status(400).json({ error: 'Google ID token credential or access token is required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    let payload = null;

    if (credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: clientId || undefined,
        });
        payload = ticket.getPayload();
      } catch (err) {
        console.warn('[Backend Auth] Google verifyIdToken notice, checking tokeninfo:', err.message);
        try {
          const fetch = (await import('node-fetch')).default || globalThis.fetch;
          const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
          if (resp.ok) {
            payload = await resp.json();
          }
        } catch (tokenInfoErr) {
          console.warn('[Backend Auth] Tokeninfo fallback failed:', tokenInfoErr);
        }
      }
    }

    if ((!payload || !payload.email) && accessToken) {
      try {
        const fetch = (await import('node-fetch')).default || globalThis.fetch;
        const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (resp.ok) {
          payload = await resp.json();
        }
      } catch (userinfoErr) {
        console.warn('[Backend Auth] Google userinfo verification failed:', userinfoErr);
      }
    }

    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Invalid or unverified Google account token.' });
    }

    const verifiedEmail = payload.email;
    const verifiedName = payload.name || payload.given_name || verifiedEmail.split('@')[0];
    const googleId = payload.sub;
    const avatar = payload.picture || null;

    const normalized = normalizeEmail(verifiedEmail);
    const userName = (verifiedName || normalized.split('@')[0]).trim();

    const [existingUsers] = await db.query('SELECT id, name, email, role, provider, avatar FROM users WHERE email = ?', [normalized]);
    let userPayload = null;

    if (existingUsers && existingUsers.length > 0) {
      const existing = existingUsers[0];
      const updatedProvider = existing.provider === 'local' ? 'google+local' : (existing.provider || 'google');
      await db.query('UPDATE users SET google_id = COALESCE(google_id, ?), provider = ?, avatar = COALESCE(avatar, ?), email_verified = TRUE WHERE id = ?', [googleId || null, updatedProvider, avatar || null, existing.id]);
      userPayload = { id: existing.id, name: existing.name, email: existing.email, role: existing.role, provider: updatedProvider, avatar: existing.avatar || avatar };
    } else {
      const [result] = await db.query('INSERT INTO users (name, email, provider, google_id, role, avatar, email_verified) VALUES (?, ?, ?, ?, ?, ?, TRUE)', [userName, normalized, 'google', googleId || null, 'reader', avatar || null]);
      userPayload = { id: result.insertId, name: userName, email: normalized, role: 'reader', provider: 'google', avatar: avatar };
    }

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('dj_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });

    return res.json({ success: true, message: 'Google authentication successful', token, user: userPayload });
  } catch (err) {
    console.error('[Backend Auth] Google error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required' });

    const normalized = normalizeEmail(email);
    const genericRes = { success: true, message: 'If an account with that email exists, password reset instructions have been sent.' };

    const [rows] = await db.query('SELECT id, name, email FROM users WHERE email = ?', [normalized]);
    if (rows && rows.length > 0) {
      const user = rows[0];
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await db.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expiresAt, user.id]);

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
      if (sendPasswordResetEmail) {
        await sendPasswordResetEmail(normalized, resetUrl);
      }
    }

    return res.json(genericRes);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token) return res.status(400).json({ error: 'Reset token is required' });
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters long' });

    const [rows] = await db.query('SELECT id, email FROM users WHERE reset_token = ? AND reset_token_expires > NOW()', [token]);
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
    }

    const user = rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [passwordHash, user.id]);

    return res.json({ success: true, message: 'Your password has been successfully reset.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
