// ============================================
// routes/admin.js — halaman internal panitia
// ============================================
// PENTING: karena kita pake QRIS statis-yang-dijadiin-dinamis (bukan payment
// gateway resmi kayak Midtrans/Xendit), GA ADA notifikasi otomatis pas orang
// bayar. Jadi konfirmasi pembayaran di sini masih MANUAL — panitia cek
// mutasi rekening/riwayat QRIS, baru klik "Tandai Lunas" di admin.html.
//
// Kalo suatu saat mau full-otomatis, tinggal ganti bagian generate QRIS di
// qris.js pake QRIS dari Midtrans/Xendit yang punya webhook pembayaran.

const express = require('express');
const db = require('../database');
const { pushToSheet } = require('../sheets');

const router = express.Router();

// Middleware simpel buat cek password admin.
// CATATAN: ini proteksi paling basic, cukup buat internal panitia aja.
// Kalo butuh lebih aman, bisa upgrade ke sistem login/session beneran.
function checkAdminPassword(req, res, next) {
  const password = req.method === 'GET' ? req.query.password : req.body.password;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Password admin salah.' });
  }
  next();
}

// GET /api/admin/orders?password=... — liat semua order
router.get('/admin/orders', checkAdminPassword, (req, res) => {
  const orders = db.prepare(`
    SELECT name, email, phone, campus, package_name, package_price, order_id, payment_status, created_at
    FROM registrants
    WHERE order_id IS NOT NULL
    ORDER BY created_at DESC
  `).all();
  res.json(orders);
});

// POST /api/admin/confirm — tandain 1 order sebagai "paid"
router.post('/admin/confirm', checkAdminPassword, (req, res) => {
  const { orderId } = req.body;
  const registrant = db.prepare('SELECT * FROM registrants WHERE order_id = ?').get(orderId);
  if (!registrant) return res.status(404).json({ error: 'Order tidak ditemukan.' });

  db.prepare("UPDATE registrants SET payment_status = 'paid' WHERE order_id = ?").run(orderId);

  pushToSheet('update', { token: registrant.token, status: 'paid' });

  res.json({ success: true });
});

module.exports = router;
