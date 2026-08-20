# Seminar Ticket App

Web app buat jual tiket seminar: registrasi → verifikasi email (OTP) → pilih
paket bundling → bayar QRIS (nominal otomatis sesuai paket).

## Struktur Project

```
seminar-ticket-app/
├── server.js          <- pintu masuk utama, jalanin ini buat start server
├── database.js         <- setup SQLite (semua data disimpen di data/seminar.db)
├── mailer.js            <- kirim email OTP
├── qris.js               <- generate QRIS dinamis dari QRIS statis
├── sheets.js               <- kirim data ke Google Sheets
├── routes/
│   ├── auth.js               <- API registrasi & verifikasi OTP
│   ├── package.js              <- API daftar paket & pilih paket
│   ├── payment.js                <- API generate QRIS & cek status bayar
│   └── admin.js                    <- API buat panitia konfirmasi bayar manual
└── public/                          <- semua yang di-lihat user (HTML/CSS/JS)
    ├── index.html    (Page 1: form + OTP)
    ├── package.html  (Page 2: pilih paket)
    ├── payment.html  (Page 3: bayar QRIS)
    └── admin.html    (halaman internal panitia)
```

## Cara Jalanin

1. Install Node.js (v18 ke atas) kalo belum ada — cek dulu: `node -v`
2. Install semua dependency:
   ```
   npm install
   ```
3. Copy `.env.example` jadi `.env`, terus isi semua value-nya (panduan lengkap di bawah)
4. Jalanin server:
   ```
   npm start
   ```
5. Buka `http://localhost:3000` di browser

## Deploy ke Vercel

Repository ini sudah punya `vercel.json`, jadi bisa di-deploy langsung:

1. Buka https://vercel.com/new dan import repository `Qretz/Ticketing-seminar`
2. Framework Preset pilih **Other**
3. Biarkan Build Command dan Output Directory kosong
4. Tambahkan semua variable dari `.env.example` di bagian **Environment Variables**
5. Klik **Deploy**

Catatan penting: Vercel memakai filesystem sementara. Saat berjalan di Vercel,
SQLite otomatis memakai `/tmp/seminar.db`, tetapi data dapat hilang saat function
restart atau berpindah instance. Untuk data registrasi production, gunakan database
eksternal seperti Turso/libSQL, Neon PostgreSQL, atau Supabase dan ubah `database.js`.

## Setup `.env` — 3 Hal yang WAJIB Diisi

### 1. Email (buat kirim kode OTP)

Kalo pake Gmail:
1. Aktifin 2-Factor Authentication di akun Google kamu (kalo belum)
2. Buka https://myaccount.google.com/apppasswords
3. Bikin App Password baru (pilih "Mail" / "Other"), nanti keluar kode 16 digit
4. Copy kode itu ke `EMAIL_PASS` di `.env` (BUKAN password Gmail biasa kamu!)
5. Isi `EMAIL_USER` dengan alamat Gmail kamu

### 2. QRIS Statis

Kamu butuh QRIS statis dari akun panitia/organisasi (misal QRIS BVoice Radio
dari bank/e-wallet yang dipake buat terima donasi/pembayaran).

Cara ambil string-nya:
1. Punya gambar QR statis (biasanya dari aplikasi bank/e-wallet, menu "QRIS Statis" atau "Terima Pembayaran")
2. Scan pake app QR scanner yang bisa nampilin HASIL TEKS mentahnya (bukan
   langsung buka link/aplikasi) — bisa pake situs seperti "QR Code decoder online"
   dan upload gambar QR-nya di situ
3. Hasilnya berupa string panjang diawali `000201...` — copy semuanya ke `QRIS_STATIC_STRING` di `.env`

⚠️ **Catatan penting**: Karena ini bukan payment gateway resmi (Midtrans/Xendit),
sistem TIDAK bisa otomatis tau kapan orang udah bayar. Makanya ada halaman
`admin.html` — panitia harus cek mutasi rekening/riwayat QRIS manual, baru
klik "Tandai Lunas" di situ. Kalo ke depannya butuh full-otomatis, tinggal
ganti bagian generate QRIS di `qris.js` pake QRIS dari payment gateway yang
punya fitur webhook notifikasi pembayaran.

### 3. Google Sheets (buat data ke divisi Humas)

1. Bikin Google Sheet baru, kasih header di baris pertama:
   ```
   Timestamp | Token | Nama | Telp | Email | Kampus | Paket | Harga | Order ID | Status
   ```
2. Di Sheet itu, buka menu **Extensions > Apps Script**
3. Hapus semua kode default, ganti dengan ini:

   ```javascript
   function doPost(e) {
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
     const data = JSON.parse(e.postData.contents);

     if (data.action === 'append') {
       sheet.appendRow([
         new Date(), data.token, data.name, data.phone, data.email,
         data.campus, data.package, data.price, data.orderId, data.status
       ]);
     } else if (data.action === 'update') {
       const rows = sheet.getDataRange().getValues();
       for (let i = 1; i < rows.length; i++) {
         if (rows[i][1] === data.token) { // kolom B = token
           sheet.getRange(i + 1, 10).setValue(data.status); // kolom J = status
           break;
         }
       }
     }

     return ContentService.createTextOutput(JSON.stringify({ success: true }))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```

4. Klik **Deploy > New deployment**
5. Pilih tipe **Web app**
6. Isi: Execute as = **Me**, Who has access = **Anyone**
7. Klik Deploy, copy URL yang muncul (formatnya `https://script.google.com/macros/s/.../exec`)
8. Paste URL itu ke `GOOGLE_SHEETS_WEBHOOK_URL` di `.env`

Data bakal otomatis masuk sheet pas user selesai pilih paket (append), dan
status-nya ke-update jadi "paid" pas panitia konfirmasi di admin.html (update).

## Alur Lengkap

1. **Page 1** (`index.html`) — user isi nama/telp/email/kampus → dapet kode OTP di email → input kode → email keverifikasi
2. **Page 2** (`package.html`) — user pilih salah satu dari 3 paket (1 tiket/50rb, 3 tiket/120rb, 5 tiket/200rb) → data otomatis kekirim ke Google Sheets
3. **Page 3** (`payment.html`) — QRIS di-generate otomatis sesuai nominal paket yang dipilih, user scan & bayar, halaman ini auto-cek status tiap 5 detik
4. **admin.html** — panitia login pake password, liat semua order, klik "Tandai Lunas" abis ngecek pembayaran masuk manual

## Yang Bisa Dikembangin Lagi

- Validasi email/nomor telp yang lebih ketat (regex)
- Auto-expire order kalo lewat 30 menit belum bayar (query SQLite yang cek `created_at`)
- Generate & kirim e-ticket (PDF/QR unik) ke email setelah admin konfirmasi lunas
- Integrasi payment gateway resmi (Midtrans/Xendit) kalo butuh konfirmasi bayar full-otomatis
- Sistem login admin yang lebih aman (session, bukan cuma password di query)
- Styling frontend (ini masih rough banget, sengaja biar gampang di-custom)
