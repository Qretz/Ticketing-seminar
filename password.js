// ============================================
// password.js — hash & cek password
// ============================================
// Sengaja pake modul "crypto" bawaan Node (bukan bcrypt/argon2 dari npm),
// biar ga perlu install dependency baru. "scrypt" itu algoritma hashing yang
// emang didesain lambat & berat di memori supaya susah di-brute-force,
// jadi cocok buat nyimpen password.

const crypto = require('crypto');

const SALT_BYTES = 16;
const KEY_LENGTH = 64;
const MIN_PASSWORD_LENGTH = 6; // dipake buat validasi di routes/auth.js

// hashPassword("rahasia123") -> "a1b2c3...:d4e5f6..." (format: "salt:hash", keduanya hex)
// Salt-nya beda-beda tiap kali dipanggil, jadi 2 user yang kebetulan pake
// password sama bakal tetep punya hash yang beda di database.
function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

// verifyPassword("rahasia123", storedHash) -> true/false
// Dipanggil pas login: hash ulang password yang diinput user pake salt yang
// sama kayak yang kesimpen, terus dibandingin.
function verifyPassword(password, storedHash) {
  if (!storedHash) return false; // user ini belum pernah bikin password

  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;

  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');

  // timingSafeEqual biar proses bandinginnya ga bocorin info lewat "timing attack"
  // (dua buffer harus panjangnya sama dulu sebelum bisa dibandingin)
  const hashBuffer = Buffer.from(hash, 'hex');
  const originalBuffer = Buffer.from(originalHash, 'hex');
  if (hashBuffer.length !== originalBuffer.length) return false;

  return crypto.timingSafeEqual(hashBuffer, originalBuffer);
}

module.exports = { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH };
