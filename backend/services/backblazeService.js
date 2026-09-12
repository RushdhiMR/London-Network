const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Checks whether Backblaze B2 environment variables are defined.
 */
function isB2Configured() {
  const keyId = (process.env.B2_KEY_ID || '').trim();
  const appKey = (process.env.B2_APPLICATION_KEY || '').trim();
  const bucket = (process.env.B2_BUCKET_NAME || '').trim();
  return Boolean(keyId && appKey && bucket);
}

let b2ClientInstance = null;

function getB2Client() {
  if (!isB2Configured()) {
    return null;
  }

  if (b2ClientInstance) {
    return b2ClientInstance;
  }

  const endpoint = (process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com').trim();
  const region = (process.env.B2_REGION || 'us-east-005').trim();
  const accessKeyId = (process.env.B2_KEY_ID || '').trim();
  const secretAccessKey = (process.env.B2_APPLICATION_KEY || '').trim();

  b2ClientInstance = new S3Client({
    endpoint: endpoint.startsWith('http') ? endpoint : `https://${endpoint}`,
    region: region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });

  return b2ClientInstance;
}

/**
 * Uploads a buffer to the configured Backblaze B2 bucket.
 *
 * @param {Buffer} buffer - File data buffer
 * @param {string} originalName - Original file name
 * @param {string} contentType - MIME type (e.g. 'image/webp', 'application/zip')
 * @param {string} folder - Subdirectory prefix
 * @returns {Promise<{ success: boolean, url?: string, key?: string, bucket?: string, error?: string }>}
 */
async function uploadToB2(buffer, originalName, contentType = 'image/webp', folder = 'uploads') {
  const client = getB2Client();
  const bucketName = (process.env.B2_BUCKET_NAME || '').trim();

  if (!client || !bucketName) {
    return {
      success: false,
      error: 'Backblaze B2 is not configured. Please supply B2_KEY_ID, B2_APPLICATION_KEY, and B2_BUCKET_NAME.',
    };
  }

  try {
    const extMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '.webp';
    const rawBaseName = originalName.replace(/\.[^/.]+$/, '');
    const cleanBaseName = rawBaseName
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) || 'file';

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const sanitizedFolder = folder.replace(/^\/+|\/+$/g, '');
    const key = sanitizedFolder
      ? `${sanitizedFolder}/${timestamp}-${cleanBaseName}-${randomSuffix}${ext}`
      : `${timestamp}-${cleanBaseName}-${randomSuffix}${ext}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);

    let publicUrl = '';
    if (process.env.B2_PUBLIC_URL && process.env.B2_PUBLIC_URL.trim()) {
      const basePublic = process.env.B2_PUBLIC_URL.trim().replace(/\/$/, '');
      publicUrl = `${basePublic}/${key}`;
    } else {
      const endpoint = (process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com')
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');
      publicUrl = `https://${bucketName}.${endpoint}/${key}`;
    }

    return {
      success: true,
      url: publicUrl,
      key,
      bucket: bucketName,
    };
  } catch (err) {
    console.error('Backblaze B2 upload error:', err);
    return {
      success: false,
      error: err.message || 'Failed to upload to Backblaze B2',
    };
  }
}

module.exports = {
  isB2Configured,
  getB2Client,
  uploadToB2,
};
