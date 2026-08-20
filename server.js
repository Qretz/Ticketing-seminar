// ============================================
// server.js — pintu masuk utama aplikasi
// ============================================
require('dotenv').config();
const express = require('express');
const path = require('path');

const authRoutes = require('./routes/auth');
const packageRoutes = require('./routes/package');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');
const loginRoutes = require('./routes/login'); 

const app = express();

app.use(express.json()); // biar Express bisa baca body JSON yang dikirim fetch()
app.use(express.static(path.join(__dirname, 'public'))); // serve semua file di folder public/ (html, css, js)

// Semua route API kita kasih prefix /api, biar jelas bedanya sama
// file statis (html/css/js) yang di-serve langsung dari public/
app.use('/api', authRoutes);
app.use('/api', packageRoutes);
app.use('/api', paymentRoutes);
app.use('/api', adminRoutes);
app.use('/api', loginRoutes); 

const PORT = process.env.PORT || 3000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server jalan di http://localhost:${PORT}`);
    console.log(`Halaman admin: http://localhost:${PORT}/admin.html`);
  });
}

module.exports = app;
