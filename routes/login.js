// ============================================
// routes/login.js — buat user yang UDAH PERNAH daftar,
// masuk lagi buat lanjutin proses / cek status tiket
// (misalnya abis clear localStorage, ganti browser, atau ganti HP)
// ============================================
// File ini SENGAJA berdiri sendiri (ga gabung sama routes/auth.js),
// biar nambahin fitur ini ga perlu ubah/ganggu kode registrasi yang udah jalan.

const express = require('express');
const db = require('../database');
const { sendOtpEmail } = require('../mailer');
const { verifyPassword } = require('../password');

const router = express.Router();

// ==== ATURAN RATE LIMIT OTP (sama kayak logic di halaman registrasi) ====
const OTP_COOLDOWN_MS = 60 * 1000; // jarak minimal antar pengiriman: 60 detik
const OTP_MAX_SEND = 5; // maksimal 5x kirim OTP login

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function checkOtpQuota(registrant) {
  const now = Date.now();

  if (registrant.otp_send_count >= OTP_MAX_SEND) {
    return {
      allowed: false,
      error: 'Kamu udah coba kirim kode login terlalu banyak kali. Hubungi panitia buat bantuan.',
    };
  }

  if (registrant.otp_last_sent_at) {
    const elapsed = now - registrant.otp_last_sent_at;
    if (elapsed < OTP_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000);
      return { allowed: false, error: `Tunggu ${waitSeconds} detik lagi sebelum minta kode baru.` };
    }
  }

  return { allowed: true };
}

// Ambil registrasi TERBARU buat email ini (kalo dia sempet daftar >1x pake email yang sama)
function findLatestRegistrant(email) {
  return db
    .prepare('SELECT * FROM registrants WHERE email = ? ORDER BY created_at DESC LIMIT 1')
    .get(email);
}

// Abis berhasil login (baik lewat OTP maupun password), tentuin mau diarahin
// kemana — tergantung udah nyampe step mana:
// - belum pilih paket -> balik ke halaman pilih paket
// - udah pilih paket (ada order_id) -> balik ke halaman pembayaran
//   (halaman itu juga otomatis nunjukkin status "paid" kalo emang udah lunas)
function decideRedirect(registrant) {
  if (registrant.order_id) {
    return { redirect: 'payment', orderId: registrant.order_id };
  }
  return { redirect: 'package', orderId: null };
}

// POST /api/login — step 1: user masukin email, sistem kirim kode ke email itu
router.post('/login', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email wajib diisi.' });

  const registrant = findLatestRegistrant(email);
  if (!registrant) {
    return res.status(404).json({ error: 'Email ini belum pernah daftar. Silakan daftar dulu di halaman utama.' });
  }

  const quota = checkOtpQuota(registrant);
  if (!quota.allowed) {
    return res.status(429).json({ error: quota.error });
  }

  const otp = generateOtp();
  const otpExpiresAt = Date.now() + 10 * 60 * 1000;

  db.prepare(`
    UPDATE registrants
    SET otp_code = ?, otp_expires_at = ?, otp_send_count = otp_send_count + 1, otp_last_sent_at = ?
    WHERE token = ?
  `).run(otp, otpExpiresAt, Date.now(), registrant.token);

  try {
    await sendOtpEmail(registrant.email, registrant.name, otp);
  } catch (err) {
    console.error('Gagal kirim email login:', err.message);
    return res.status(500).json({ error: 'Gagal kirim kode login. Cek konfigurasi EMAIL_* di file .env' });
  }

  res.json({ success: true });
});

// POST /api/login-password — alternatif login TANPA nunggu email OTP,
// langsung pake email + password yang dibikin pas registrasi.
router.post('/login-password', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  const registrant = findLatestRegistrant(email);
  if (!registrant) {
    return res.status(404).json({ error: 'Email ini belum pernah daftar. Silakan daftar dulu di halaman utama.' });
  }

  if (!registrant.password_hash) {
    return res.status(400).json({
      error: 'Akun ini belum punya password. Silakan login pake Kode OTP dulu.',
    });
  }

  if (!verifyPassword(password, registrant.password_hash)) {
    return res.status(401).json({ error: 'Email atau password salah.' });
  }

  const { redirect, orderId } = decideRedirect(registrant);
  res.json({ token: registrant.token, redirect, orderId });
});

// POST /api/login-verify — step 2: cek kode OTP, balikin token + arah redirect
router.post('/login-verify', (req, res) => {
  const { email, otp } = req.body;
  const registrant = findLatestRegistrant(email);
  if (!registrant) return res.status(404).json({ error: 'Email tidak ditemukan.' });

  if (!registrant.otp_expires_at || Date.now() > registrant.otp_expires_at) {
    return res.status(400).json({ error: 'Kode udah kadaluarsa. Klik "Kirim Ulang Kode".' });
  }
  if (registrant.otp_code !== otp) {
    return res.status(400).json({ error: 'Kode salah. Coba cek lagi.' });
  }

  // Berhasil login = kepemilikan email udah kebukti, jadi otomatis ke-verifikasi juga
  if (!registrant.email_verified) {
    db.prepare('UPDATE registrants SET email_verified = 1 WHERE token = ?').run(registrant.token);
  }

  const { redirect, orderId } = decideRedirect(registrant);
  res.json({ token: registrant.token, redirect, orderId });
});

module.exports = router;
