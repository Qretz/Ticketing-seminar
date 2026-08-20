// ============================================
// routes/package.js — Page 2: pilih paket bundling
// ============================================
const express = require('express');
const crypto = require('crypto');
const db = require('../database');
const { pushToSheet } = require('../sheets');

const router = express.Router();

// Data paket di-hardcode di sini — gampang banget diubah kalo harga/bundling berubah.
// "features" tinggal diedit sesuai benefit asli tiap paket, "popular: true"
// nandain paket mana yang mau dikasih badge "Paling Laris".
const PACKAGES = [
  {
    id: 'single',
    name: '1 Tiket',
    qty: 1,
    price: 50000,
    description: 'Cocok buat yang mau dateng sendiri.',
    features: ['1 tiket masuk seminar', 'E-sertifikat', 'Akses materi seminar'],
    popular: false,
  },
  {
    id: 'triple',
    name: '3 Tiket',
    qty: 3,
    price: 120000,
    description: 'Paling pas buat dateng bareng temen.',
    features: ['3 tiket masuk seminar', 'E-sertifikat per peserta', 'Akses materi seminar', 'Hemat dibanding beli satuan'],
    popular: true,
  },
  {
    id: 'five',
    name: '5 Tiket',
    qty: 5,
    price: 200000,
    description: 'Buat rombongan / satu kelas.',
    features: ['5 tiket masuk seminar', 'E-sertifikat per peserta', 'Akses materi seminar', 'Harga paling hemat per tiket'],
    popular: false,
  },
];

// GET /api/packages — buat ditampilin di Page 2
router.get('/packages', (req, res) => {
  res.json(PACKAGES);
});

// POST /api/select-package
router.post('/select-package', async (req, res) => {
  const { token, packageId } = req.body;
  const registrant = db.prepare('SELECT * FROM registrants WHERE token = ?').get(token);

  if (!registrant) return res.status(404).json({ error: 'Registrasi tidak ditemukan.' });
  if (!registrant.email_verified) return res.status(403).json({ error: 'Email belum diverifikasi.' });

  const pkg = PACKAGES.find((p) => p.id === packageId);
  if (!pkg) return res.status(400).json({ error: 'Paket tidak valid.' });

  const orderId = crypto.randomUUID(); // ID unik buat transaksi ini, dipake di URL Page 3

  db.prepare(`
    UPDATE registrants
    SET package_id = ?, package_name = ?, package_price = ?, order_id = ?, payment_status = 'pending'
    WHERE token = ?
  `).run(pkg.id, pkg.name, pkg.price, orderId, token);

  // Push ke Google Sheets di titik ini — data registrant udah lengkap
  // (nama, kontak, paket), pas buat dicatat divisi Humas.
  pushToSheet('append', {
    token: registrant.token,
    name: registrant.name,
    phone: registrant.phone,
    email: registrant.email,
    campus: registrant.campus,
    package: pkg.name,
    price: pkg.price,
    orderId,
    status: 'pending',
  });

  res.json({ orderId });
});

module.exports = router;
