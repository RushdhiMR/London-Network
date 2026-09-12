const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const B2_ENDPOINT = (process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com').trim();
const B2_REGION = (process.env.B2_REGION || 'us-east-005').trim();
const B2_KEY_ID = (process.env.B2_KEY_ID || '').trim();
const B2_APPLICATION_KEY = (process.env.B2_APPLICATION_KEY || '').trim();
const B2_BUCKET_NAME = (process.env.B2_BUCKET_NAME || 'LondonNetwork').trim();
const B2_PUBLIC_URL = (process.env.B2_PUBLIC_URL || `https://f005.backblazeb2.com/file/${B2_BUCKET_NAME}`).trim().replace(/\/$/, '');

if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME) {
  console.error('Missing Backblaze B2 credentials in .env');
  process.exit(1);
}

const s3Client = new S3Client({
  endpoint: B2_ENDPOINT.startsWith('http') ? B2_ENDPOINT : `https://${B2_ENDPOINT}`,
  region: B2_REGION,
  credentials: {
    accessKeyId: B2_KEY_ID,
    secretAccessKey: B2_APPLICATION_KEY,
  },
  forcePathStyle: true,
});

/**
 * Upload buffer to Backblaze B2
 */
async function uploadBufferToB2(buffer, key, contentType = 'image/jpeg') {
  try {
    const cmd = new PutObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    await s3Client.send(cmd);
    const publicUrl = `${B2_PUBLIC_URL}/${key}`;
    return { success: true, url: publicUrl, key, size: buffer.length };
  } catch (err) {
    console.error(`Failed to upload ${key} to B2:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch remote image buffer safely
 */
async function fetchImageBuffer(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.warn(`Fetch error for ${url}: ${err.message}`);
    return null;
  }
}

async function runSync() {
  console.log('========================================================');
  console.log('🚀 Starting Full Database & Website Sync to Backblaze B2');
  console.log('Bucket:         ', B2_BUCKET_NAME);
  console.log('Public Base URL:', B2_PUBLIC_URL);
  console.log('========================================================\n');

  // 1. Connect to MySQL
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'digital_journal_db',
  });

  // Ensure users table has avatar column
  try {
    const [userCols] = await db.query("SHOW COLUMNS FROM users LIKE 'avatar'");
    if (!userCols || userCols.length === 0) {
      await db.query("ALTER TABLE users ADD COLUMN avatar VARCHAR(500) NULL AFTER role");
      console.log('✅ Added `avatar` column to `users` table');
    }
  } catch (e) {
    console.warn('Note checking users avatar column:', e.message);
  }

  // 2. Upload Database Backup / Snapshot to Backblaze
  console.log('📦 Phase 1: Uploading Database snapshots to Backblaze B2...');
  try {
    const [allArticles] = await db.query('SELECT * FROM articles');
    const [allUsers] = await db.query('SELECT id, name, email, role, avatar, created_at FROM users');
    const [allCategories] = await db.query('SELECT * FROM categories');
    const [allAuthors] = await db.query('SELECT * FROM authors');
    const [allAds] = await db.query('SELECT * FROM ad_slots');

    const dbSnapshot = {
      timestamp: new Date().toISOString(),
      articles: allArticles,
      users: allUsers,
      categories: allCategories,
      authors: allAuthors,
      ads: allAds,
    };

    const jsonBuffer = Buffer.from(JSON.stringify(dbSnapshot, null, 2), 'utf-8');
    const dbUpload = await uploadBufferToB2(jsonBuffer, 'database/digital_journal_db.json', 'application/json');
    if (dbUpload.success) {
      console.log(`✅ Uploaded database JSON snapshot: ${dbUpload.url} (${(dbUpload.size / 1024).toFixed(1)} KB)`);
    }

    const sqlPath = path.join(__dirname, 'database.sql');
    if (fs.existsSync(sqlPath)) {
      const sqlBuffer = fs.readFileSync(sqlPath);
      const sqlUpload = await uploadBufferToB2(sqlBuffer, 'database/digital_journal_schema.sql', 'application/sql');
      if (sqlUpload.success) {
        console.log(`✅ Uploaded SQL schema backup: ${sqlUpload.url} (${(sqlUpload.size / 1024).toFixed(1)} KB)`);
      }
    }
  } catch (err) {
    console.error('Phase 1 error:', err.message);
  }

  // 3. Upload Authors & User Avatars to Backblaze
  console.log('\n👤 Phase 2: Uploading Author and User Avatars to Backblaze B2...');
  const publicDir = path.join(__dirname, '..', 'frontend', 'public');
  const avatarMap = {}; // oldUrl -> newB2Url

  const avatarFiles = [
    { file: 'author_woman.jpg', name: 'author_woman' },
    { file: 'author_bluesuit.jpg', name: 'author_bluesuit' },
    { file: 'author_beard.jpg', name: 'author_beard' },
    { file: 'author_glasses.jpg', name: 'author_glasses' },
  ];

  for (const av of avatarFiles) {
    const localPath = path.join(publicDir, av.file);
    if (fs.existsSync(localPath)) {
      const buf = fs.readFileSync(localPath);
      const res = await uploadBufferToB2(buf, `avatars/${av.file}`, 'image/jpeg');
      if (res.success) {
        avatarMap[`/${av.file}`] = res.url;
        avatarMap[av.file] = res.url;
        console.log(`✅ Uploaded avatar ${av.file} -> ${res.url}`);
      }
    }
  }

  // Update authors table in MySQL
  try {
    const [authors] = await db.query('SELECT id, name, avatar FROM authors');
    for (const a of authors) {
      let currentAv = a.avatar || '';
      let cleanKey = currentAv.replace(/^\//, '');
      if (avatarMap[currentAv] || avatarMap[cleanKey]) {
        const newUrl = avatarMap[currentAv] || avatarMap[cleanKey];
        await db.query('UPDATE authors SET avatar = ? WHERE id = ?', [newUrl, a.id]);
        console.log(`  Updated Author #${a.id} (${a.name}) avatar to ${newUrl}`);
      }
    }
  } catch (e) {
    console.warn('Authors update note:', e.message);
  }

  // Also assign avatars to users in users table if empty
  try {
    const [users] = await db.query('SELECT id, name, email, avatar FROM users');
    for (const u of users) {
      if (!u.avatar) {
        const defaultAv = avatarMap['/author_woman.jpg'] || avatarMap['author_woman.jpg'];
        await db.query('UPDATE users SET avatar = ? WHERE id = ?', [defaultAv, u.id]);
      }
    }
    console.log(`✅ Verified user avatars in \`users\` table`);
  } catch (e) {
    console.warn('Users avatar check note:', e.message);
  }

  // 4. Upload Website Media & Assets
  console.log('\n🖼️ Phase 3: Uploading Public Media Assets to Backblaze B2...');
  const mediaFiles = [
    'ai_auditorium.png',
    'ai_chip.png',
    'ai_events.png',
    'ai_hero.png',
    'ai_innovation.png',
    'ai_studio_booth.png',
    'argentina_vs_switzerland.png',
    'header_logo.png',
    'logo.png',
  ];

  for (const mf of mediaFiles) {
    const mfPath = path.join(publicDir, mf);
    if (fs.existsSync(mfPath)) {
      const buf = fs.readFileSync(mfPath);
      const mime = mf.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const res = await uploadBufferToB2(buf, `media/${mf}`, mime);
      if (res.success) {
        avatarMap[`/${mf}`] = res.url;
        avatarMap[mf] = res.url;
        console.log(`✅ Uploaded media ${mf} -> ${res.url}`);
      }
    }
  }

  // 5. Upload Website Article Images in Concurrent Batches
  console.log('\n📰 Phase 4: Syncing Website Article Images to Backblaze B2...');
  try {
    const [articles] = await db.query('SELECT id, title, slug, image_url, author_avatar FROM articles');
    console.log(`Processing ${articles.length} articles with batch concurrency...`);

    let uploadedCount = 0;
    let skippedCount = 0;

    const BATCH_SIZE = 5;
    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (art) => {
        let imgUrl = (art.image_url || '').trim();
        let authorAv = (art.author_avatar || '').trim();
        let needsUpdate = false;
        let newImgUrl = imgUrl;
        let newAuthorAv = authorAv;

        if (authorAv && (avatarMap[authorAv] || avatarMap[authorAv.replace(/^\//, '')])) {
          newAuthorAv = avatarMap[authorAv] || avatarMap[authorAv.replace(/^\//, '')];
          needsUpdate = true;
        }

        if (imgUrl.includes('backblazeb2.com')) {
          skippedCount++;
        } else if (imgUrl.startsWith('/') || !imgUrl.startsWith('http')) {
          const localFile = imgUrl.replace(/^\//, '');
          if (avatarMap[imgUrl] || avatarMap[localFile]) {
            newImgUrl = avatarMap[imgUrl] || avatarMap[localFile];
            needsUpdate = true;
            uploadedCount++;
          } else {
            const fullPath = path.join(publicDir, localFile);
            if (fs.existsSync(fullPath)) {
              const buf = fs.readFileSync(fullPath);
              const ext = path.extname(localFile) || '.png';
              const key = `articles/article-${art.id}-${(art.slug || 'art').substring(0, 35)}${ext}`;
              const up = await uploadBufferToB2(buf, key, ext === '.png' ? 'image/png' : 'image/jpeg');
              if (up.success) {
                newImgUrl = up.url;
                needsUpdate = true;
                uploadedCount++;
              }
            }
          }
        } else if (imgUrl.startsWith('http')) {
          const cleanSlug = (art.slug || `art-${art.id}`).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').substring(0, 40);
          const key = `articles/article-${art.id}-${cleanSlug}.jpg`;

          const buf = await fetchImageBuffer(imgUrl);
          if (buf) {
            const up = await uploadBufferToB2(buf, key, 'image/jpeg');
            if (up.success) {
              newImgUrl = up.url;
              needsUpdate = true;
              uploadedCount++;
            }
          }
        }

        if (needsUpdate) {
          await db.query('UPDATE articles SET image_url = ?, author_avatar = ? WHERE id = ?', [
            newImgUrl,
            newAuthorAv,
            art.id,
          ]);
        }
      }));

      const progress = Math.min(i + BATCH_SIZE, articles.length);
      process.stdout.write(`  [${progress}/${articles.length}] Processed articles...\r`);
    }

    console.log(`\n🎉 Article sync finished! Uploaded: ${uploadedCount}, Already on B2: ${skippedCount}`);
  } catch (err) {
    console.error('Phase 4 error:', err.message);
  }

  // 6. Sync Ad Slots Images to Backblaze B2
  console.log('\n📢 Phase 4.5: Syncing Advertisement Images to Backblaze B2...');
  try {
    const defaultAdUrls = {
      'slot-1': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=300&fit=crop',
      'slot-2': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=300&fit=crop',
      'slot-3': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=300&fit=crop',
      'slot-4': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=300&fit=crop',
      'slot-5': 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&h=300&fit=crop',
      'slot-6': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=300&fit=crop',
    };

    const [adSlots] = await db.query('SELECT * FROM ad_slots');
    for (const ad of adSlots) {
      let imgUrl = (ad.image_url || '').trim();
      if (!imgUrl && defaultAdUrls[ad.id]) {
        imgUrl = defaultAdUrls[ad.id];
      }
      if (!imgUrl) continue;
      if (imgUrl.includes('backblazeb2.com')) {
        console.log(`  Ad #${ad.id} (${ad.title}) already on Backblaze.`);
        continue;
      }
      const cleanSlug = (ad.id || 'ad').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
      const key = `ads/ad-${cleanSlug}.jpg`;
      const buf = await fetchImageBuffer(imgUrl);
      if (buf) {
        const up = await uploadBufferToB2(buf, key, 'image/jpeg');
        if (up.success) {
          await db.query('UPDATE ad_slots SET image_url = ? WHERE id = ?', [up.url, ad.id]);
          console.log(`✅ Uploaded Ad #${ad.id} (${ad.title}) -> ${up.url}`);
        }
      }
    }
  } catch (err) {
    console.error('Phase 4.5 error:', err.message);
  }

  // 7. Update local JSON DB if present
  try {
    const jsonDbPath = path.join(__dirname, '..', 'frontend', 'data', 'digital_journal_db.json');
    if (fs.existsSync(jsonDbPath)) {
      const [latestArticles] = await db.query('SELECT * FROM articles');
      const [latestAuthors] = await db.query('SELECT * FROM authors');
      const [latestUsers] = await db.query('SELECT id, name, email, role, avatar FROM users');
      const [latestAds] = await db.query('SELECT * FROM ad_slots');
      const currentJson = JSON.parse(fs.readFileSync(jsonDbPath, 'utf8'));

      currentJson.articles = latestArticles;
      currentJson.authors = latestAuthors;
      currentJson.users = latestUsers;
      currentJson.ads = latestAds;
      fs.writeFileSync(jsonDbPath, JSON.stringify(currentJson, null, 2), 'utf8');
      console.log('✅ Synchronized frontend/data/digital_journal_db.json with latest Backblaze URLs.');
    }
  } catch (e) {
    console.warn('JSON DB update note:', e.message);
  }

  // 7. Verify and Display Bucket Storage Statistics
  console.log('\n📊 Phase 5: Verifying Backblaze B2 Storage Status...');
  try {
    let totalBytes = 0;
    let totalObjects = 0;
    let continuationToken = null;
    const folderStats = {};

    do {
      const listParams = {
        Bucket: B2_BUCKET_NAME,
        ContinuationToken: continuationToken,
      };
      const data = await s3Client.send(new ListObjectsV2Command(listParams));
      if (data.Contents) {
        for (const item of data.Contents) {
          totalBytes += item.Size || 0;
          totalObjects += 1;
          const folder = (item.Key || '').split('/')[0] || 'root';
          folderStats[folder] = (folderStats[folder] || 0) + (item.Size || 0);
        }
      }
      continuationToken = data.IsTruncated ? data.NextContinuationToken : null;
    } while (continuationToken);

    console.log('========================================================');
    console.log('🏆 BACKBLAZE B2 BUCKET STORAGE REPORT');
    console.log(`Bucket Name:     ${B2_BUCKET_NAME}`);
    console.log(`Total Objects:   ${totalObjects} files`);
    console.log(`Total Storage:   ${(totalBytes / (1024 * 1024)).toFixed(2)} MB (${totalBytes.toLocaleString()} bytes)`);
    console.log('Breakdown by folder:');
    for (const [fld, bytes] of Object.entries(folderStats)) {
      console.log(`  📁 ${fld.padEnd(15)}: ${(bytes / (1024 * 1024)).toFixed(2)} MB (${bytes.toLocaleString()} bytes)`);
    }
    console.log('========================================================');
  } catch (err) {
    console.error('Storage report error:', err.message);
  }

  await db.end();
  console.log('\nAll done! Backblaze B2 is now fully populated and connected to the database & website.');
}

runSync().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
