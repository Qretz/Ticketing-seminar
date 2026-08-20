// ============================================
// sheets.js — kirim data registrant ke Google Sheets
// ============================================
// Kita pake Google Apps Script sebagai "jembatan" ke Google Sheets, soalnya
// jauh lebih simpel daripada setup Google Sheets API resmi (yang butuh
// service account + OAuth, agak ribet buat pemula). Cara setup Apps
// Script-nya step-by-step ada di README.md

require('dotenv').config();

async function pushToSheet(action, data) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!webhookUrl || webhookUrl.includes('XXXX')) {
    console.warn('[sheets.js] GOOGLE_SHEETS_WEBHOOK_URL belum di-setup di .env, skip push ke Sheets.');
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    });
  } catch (err) {
    // Sengaja ERROR-NYA GA DI-THROW, biar kalo Sheets lagi bermasalah,
    // proses utama (registrasi/bayar) tetep jalan normal buat user.
    console.error('[sheets.js] Gagal push ke Google Sheets:', err.message);
  }
}

module.exports = { pushToSheet };
