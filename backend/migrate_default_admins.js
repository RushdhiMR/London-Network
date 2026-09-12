const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrateDefaultAdminColumn() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'digital_journal_db',
  });

  // 1. Add is_default_admin column if it doesn't exist
  const [cols] = await db.query("SHOW COLUMNS FROM users LIKE 'is_default_admin'");
  if (!cols || cols.length === 0) {
    await db.query("ALTER TABLE users ADD COLUMN is_default_admin TINYINT(1) DEFAULT 0 AFTER role");
    console.log('✅ Added `is_default_admin` column to `users` table.');
  } else {
    console.log('ℹ️ `is_default_admin` column already exists.');
  }

  // 2. Set is_default_admin = 1 for the 3 requested default admin accounts + root admin
  const defaultAdmins = [
    'admin@digitaljournal.com',
    'londonbigben.offical@gmail.com',
    'akramyoonos006@gmail.com'
  ];

  await db.query("UPDATE users SET is_default_admin = 0");
  for (const email of defaultAdmins) {
    await db.query("UPDATE users SET is_default_admin = 1, role = 'admin' WHERE LOWER(email) = LOWER(?)", [email]);
    console.log(`✅ Set is_default_admin = 1 for: ${email}`);
  }

  const [allAdmins] = await db.query("SELECT id, name, email, role, is_default_admin FROM users WHERE role = 'admin'");
  console.log('\nAll admins in database:');
  console.table(allAdmins);

  await db.end();
}

migrateDefaultAdminColumn().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
