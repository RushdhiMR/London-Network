const express = require('express');
const router = express.Router();
const { isB2Configured, uploadToB2 } = require('../services/backblazeService');

// GET /api/upload - check Backblaze B2 connection status
router.get('/', (req, res) => {
  const configured = isB2Configured();
  return res.json({
    status: 'ok',
    connected: configured,
    storage: configured ? 'Backblaze B2 Cloud Storage' : 'Local / Fallback',
    bucket: configured ? process.env.B2_BUCKET_NAME : null,
    endpoint: process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
    region: process.env.B2_REGION || 'us-east-005',
    instructions: configured
      ? 'Backblaze B2 is connected and ready for uploads and backups.'
      : 'To activate Backblaze B2, set B2_KEY_ID, B2_APPLICATION_KEY, and B2_BUCKET_NAME in your .env file.',
  });
});

// POST /api/upload - upload buffer, dataUrl or backup to Backblaze B2
router.post('/', async (req, res) => {
  try {
    const { dataUrl, image, file, fileName = 'upload.webp', mimeType = 'image/webp', folder = 'uploads' } = req.body;
    const payload = dataUrl || image || file;

    if (!payload) {
      return res.status(400).json({ success: false, error: 'No dataUrl or file payload provided' });
    }

    if (payload.startsWith('http://') || payload.startsWith('https://')) {
      return res.json({ success: true, url: payload, storage: 'remote' });
    }

    let buffer = null;
    let actualMime = mimeType;

    const matches = payload.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      actualMime = matches[1] || mimeType;
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(payload, 'utf-8');
    }

    if (isB2Configured() && buffer) {
      const result = await uploadToB2(buffer, fileName, actualMime, folder);
      if (result.success && result.url) {
        return res.json({
          success: true,
          url: result.url,
          storage: 'backblaze',
          key: result.key,
          bucket: result.bucket,
        });
      } else {
        console.warn('Backend Backblaze B2 upload failed, falling back:', result.error);
        return res.json({
          success: true,
          url: payload,
          storage: 'fallback',
          warning: result.error,
        });
      }
    }

    return res.json({
      success: true,
      url: payload,
      storage: 'fallback',
      message: 'Backblaze B2 not configured. Retained fallback.',
    });
  } catch (err) {
    console.error('Express /api/upload error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// POST /api/upload/backup - dedicated endpoint for database backup archives
router.post('/backup', async (req, res) => {
  try {
    const { sqlContent, fileName = `backup-${Date.now()}.sql` } = req.body;

    if (!sqlContent) {
      return res.status(400).json({ success: false, error: 'No sqlContent provided for backup' });
    }

    const buffer = Buffer.from(sqlContent, 'utf-8');

    if (isB2Configured()) {
      const result = await uploadToB2(buffer, fileName, 'application/sql', 'database-backups');
      if (result.success) {
        return res.json({
          success: true,
          message: 'Database backup successfully uploaded to Backblaze B2',
          url: result.url,
          key: result.key,
          bucket: result.bucket,
          storage: 'backblaze',
        });
      }
    }

    return res.json({
      success: true,
      message: 'Backblaze B2 not configured. Stored locally.',
      storage: 'fallback',
    });
  } catch (err) {
    console.error('Express /api/upload/backup error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Backup upload failed' });
  }
});

module.exports = router;
