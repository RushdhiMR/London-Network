const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;

// RBAC middleware helper for Express
function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.dj_session || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized. Session missing.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

// GET /api/admin/users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, role, provider, created_at, updated_at FROM users ORDER BY id ASC');
    return res.json({ success: true, users: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users (Role updates)
router.put('/users', requireAdmin, async (req, res) => {
  try {
    const { id, role } = req.body;
    if (!id || !role) {
      return res.status(400).json({ error: 'User ID and role are required' });
    }

    const validRoles = ['reader', 'writer', 'admin'];
    const normRole = role.toLowerCase().trim();

    if (!validRoles.includes(normRole)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    await db.query('UPDATE users SET role = ? WHERE id = ?', [normRole, id]);
    const [rows] = await db.query('SELECT id, name, email, role, provider FROM users WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: `User role updated to ${normRole}`,
      user: rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users
router.delete('/users', requireAdmin, async (req, res) => {
  try {
    const id = req.query.id || req.body.id;
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    await db.query('DELETE FROM users WHERE id = ?', [id]);
    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
