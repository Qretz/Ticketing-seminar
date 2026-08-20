// ============================================
// routes/auth.js — Page 1: registrasi + verifikasi email
// ============================================
const express = require('express');
const crypto = require('crypto');
const db = require('../database');
const { sendOtpEmail } = require('../mailer');
const { hashPassword, MIN_PASSWORD_LENGTH } = require('../password');

const router = express.Router();

// Bikin kode OTP 6 digit acak, contoh: "482913"
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/register — user isi form data diri
router.post('/register', async (req, res) => {
  const { name, phone, email, campus, password } = req.body;

  // Validasi paling basic. Nanti bisa dikembangin: regex email,
  // format nomor telp Indonesia (08xx / +62xx), dll.
  if (!name || !phone || !email || !campus || !password) {
    return res.status(400).json({ error: 'Semua field wajib diisi.' });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password minimal ${MIN_PASSWORD_LENGTH} karakter.` });
  }

  // token = "identitas sementara" si user, dipake buat nyambungin
  // request-request selanjutnya (verifikasi, pilih paket, dst) tanpa perlu sistem login.
  const token = crypto.randomUUID();
  const otp = generateOtp();
  const otpExpiresAt = Date.now() + 10 * 60 * 1000; // berlaku 10 menit
  const passwordHash = hashPassword(password);

  db.prepare(`
    INSERT INTO registrants (token, name, phone, email, campus, otp_code, otp_expires_at, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(token, name, phone, email, campus, otp, otpExpiresAt, passwordHash);

  try {
    await sendOtpEmail(email, name, otp);
  } catch (err) {
    console.error('Gagal kirim email:', err.message);
    return res.status(500).json({
      error: 'Gagal kirim email verifikasi. Cek konfigurasi EMAIL_* di file .env',
    });
  }

  res.json({ token });
});

// POST /api/verify — cek kode OTP yang diinput user
router.post('/verify', (req, res) => {
  const { token, otp } = req.body;
  const registrant = db.prepare('SELECT * FROM registrants WHERE token = ?').get(token);

  if (!registrant) return res.status(404).json({ error: 'Registrasi tidak ditemukan.' });
  if (registrant.email_verified) return res.json({ success: true, alreadyVerified: true });

  if (Date.now() > registrant.otp_expires_at) {
    return res.status(400).json({ error: 'Kode OTP sudah kadaluarsa. Klik "Kirim Ulang Kode".' });
  }
  if (registrant.otp_code !== otp) {
    return res.status(400).json({ error: 'Kode OTP salah. Coba cek lagi.' });
  }

  db.prepare('UPDATE registrants SET email_verified = 1 WHERE token = ?').run(token);
  res.json({ success: true });
});

// POST /api/resend-otp — buat kalo user ga dapet email atau kodenya kadaluarsa
router.post('/resend-otp', async (req, res) => {
  const { token } = req.body;
  const registrant = db.prepare('SELECT * FROM registrants WHERE token = ?').get(token);
  if (!registrant) return res.status(404).json({ error: 'Registrasi tidak ditemukan.' });

  const otp = generateOtp();
  const otpExpiresAt = Date.now() + 10 * 60 * 1000;
  db.prepare('UPDATE registrants SET otp_code = ?, otp_expires_at = ? WHERE token = ?')
    .run(otp, otpExpiresAt, token);

  await sendOtpEmail(registrant.email, registrant.name, otp);
  res.json({ success: true });
});

module.exports = router;
