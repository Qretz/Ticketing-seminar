// ============================================
// mailer.js — kirim email OTP verifikasi
// ============================================
require('dotenv').config();
const nodemailer = require('nodemailer');

// "transporter" = objek yang tugasnya ngirim email lewat SMTP server
// (SMTP = protokol standar buat kirim email, dipake Gmail/Outlook/dll)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: true, // true kalo port 465, false kalo port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password, BUKAN password akun Gmail biasa
  },
});

async function sendOtpEmail(to, name, otp) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Kode Verifikasi Tiket Seminar Kamu',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>Halo, ${name}!</h2>
        <p>Makasih udah daftar tiket seminar. Ini kode verifikasi email kamu:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px;
                    background: #f4f4f4; padding: 16px; text-align: center; border-radius: 8px;">
          ${otp}
        </div>
        <p>Kode ini berlaku <b>10 menit</b>. Jangan share kode ini ke siapa-siapa ya.</p>
        <p>Kalo kamu ga ngerasa daftar, abaikan aja email ini.</p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail };
