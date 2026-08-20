// ============================================
// database.js — setup database SQLite
// ============================================
// SQLite itu database yang isinya cuma 1 FILE (bukan server terpisah kayak
// MySQL/Postgres), jadi cocok banget buat project kecil kayak gini.
// "better-sqlite3" kita pilih karena API-nya SYNCHRONOUS (ga perlu await/callback
// ribet), jadi lebih gampang dipahami buat yang baru belajar.

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Auto-bikin folder data/ kalo belum ada, biar ga error pas pertama kali dijalanin
const localDatabasePath = path.join(__dirname, 'data', 'seminar.db');
const defaultDatabasePath = process.env.VERCEL ? path.join('/tmp', 'seminar.db') : localDatabasePath;
const databasePath = process.env.DATABASE_PATH || defaultDatabasePath;
const dataDir = path.dirname(databasePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(databasePath);

// CREATE TABLE IF NOT EXISTS = aman dijalanin berkali-kali,
// kalo tabelnya udah ada, baris ini di-skip aja (ga error).
db.exec(`
  CREATE TABLE IF NOT EXISTS registrants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- data dari Page 1 (form registrasi)
    token TEXT UNIQUE NOT NULL,     -- ID unik per user, disimpen di localStorage frontend
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    campus TEXT NOT NULL,

   -- data verifikasi email
       email_verified INTEGER DEFAULT 0,
    otp_code TEXT,
    otp_expires_at INTEGER,
    otp_send_count INTEGER DEFAULT 1,   -- BARU: hitung berapa kali OTP dikirim
    otp_last_sent_at INTEGER,           -- BARU: kapan terakhir OTP dikirim

    -- password (opsional) — biar user bisa login tanpa nunggu email OTP.
    -- Kalo NULL, berarti user itu daftar sebelum fitur ini ada / belum pernah
    -- bikin password, jadi tetep bisa login pake OTP kayak biasa.
    password_hash TEXT,

    -- data dari Page 2 (pilih paket)
    package_id TEXT,
    package_name TEXT,
    package_price INTEGER,
    order_id TEXT UNIQUE,               -- ID unik per transaksi, dipakai di URL Page 3

    -- status pembayaran: 'unpaid' -> 'pending' (udah pilih paket, nunggu bayar) -> 'paid'
    payment_status TEXT DEFAULT 'unpaid',

    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// MIGRASI: kalo database.js ini jalan di atas data/seminar.db yang udah lama
// (dibikin SEBELUM kolom password_hash ada), CREATE TABLE IF NOT EXISTS di atas
// bakal di-skip total (tabelnya kan udah ada) jadi kolom barunya ga otomatis
// nambah. Makanya kita cek manual, kalo belum ada kolomnya baru di-ALTER.
const existingColumns = db.prepare('PRAGMA table_info(registrants)').all().map((col) => col.name);
if (!existingColumns.includes('password_hash')) {
  db.exec('ALTER TABLE registrants ADD COLUMN password_hash TEXT');
}

module.exports = db;
