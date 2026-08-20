// ============================================
// routes/payment.js — Page 3: pembayaran QRIS
// ============================================
const express = require('express');
const db = require('../database');
const { generateQrisImage } = require('../qris');

const router = express.Router();
const HOLD_MINUTES = 30; // cuma buat tampilan info ke user, ga ada auto-cancel di sini

// GET /api/payment/:orderId — generate & tampilin QRIS sesuai nominal paket
router.get('/payment/:orderId', async (req, res) => {
  const registrant = db.prepare('SELECT * FROM registrants WHERE order_id = ?').get(req.params.orderId);
  if (!registrant) return res.status(404).json({ error: 'Order tidak ditemukan.' });

  try {
    const qrisImage = await generateQrisImage(process.env.QRIS_STATIC_STRING, registrant.package_price);
    res.json({
      orderId: registrant.order_id,
      packageName: registrant.package_name,
      amount: registrant.package_price,
      status: registrant.payment_status,
      qrisImage, // base64 data URL, langsung dipasang ke <img src="...">
      holdMinutes: HOLD_MINUTES,
    });
  } catch (err) {
    console.error('Gagal generate QRIS:', err.message);
    res.status(500).json({ error: 'Gagal generate QRIS. Cek QRIS_STATIC_STRING di file .env' });
  }
});

// GET /api/payment/:orderId/status — dipanggil berkala (polling) dari frontend,
// buat ngecek apakah pembayaran udah dikonfirmasi admin
router.get('/payment/:orderId/status', (req, res) => {
  const registrant = db.prepare('SELECT payment_status FROM registrants WHERE order_id = ?').get(req.params.orderId);
  if (!registrant) return res.status(404).json({ error: 'Order tidak ditemukan.' });
  res.json({ status: registrant.payment_status });
});

module.exports = router;
