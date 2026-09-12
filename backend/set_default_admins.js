const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function setDefaultAdmins() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'digital_journal_db',
  });

  const defaultAdmins = [
    { name: 'Admin User', email: 'admin@digitaljournal.com' },
    { name: 'London BigBen Official', email: 'londonbigben.offical@gmail.com' },
    { name: 'Akram Yoonos', email: 'akramyoonos006@gmail.com' },
  ];

  const passHash = '$2b$10$gyyrusfVDr4wRtloRzoPH.3n1DMqBGfQiR7mzTtINm6IlmH/Oiwgu';

  for (const adm of defaultAdmins) {
    await db.query(
      `INSERT INTO users (name, email, password_hash, provider, role, email_verified)
       VALUES (?, ?, ?, 'google', 'admin', 1)
       ON DUPLICATE KEY UPDATE 
         role = 'admin',
         email_verified = 1,
         password_hash = COALESCE(password_hash, VALUES(password_hash))`,
      [adm.name, adm.email.toLowerCase().trim(), passHash]
    );
    console.log('✅ Admin set in MySQL database:', adm.email);
  }

  const [allAdmins] = await db.query("SELECT id, name, email, role, provider FROM users WHERE role = 'admin'");
  console.log('\nAll current admin accounts in database:');
  console.table(allAdmins);

  await db.end();
}

setDefaultAdmins().catch((err) => {
  console.error('Error setting default admins:', err);
  process.exit(1);
});
