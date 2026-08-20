// ============================================
// qris.js — generate QRIS DINAMIS dari QRIS STATIS
// ============================================
// KONSEP: QRIS statis = QR yang nominalnya diisi manual sama pembeli pas
// scan (kayak QRIS toko kelontong/warung). Kita mau QR yang nominalnya udah
// otomatis (dinamis) sesuai paket yang dipilih user.
//
// Caranya: ambil string QRIS statis punya kita, "suntik" nominal ke dalamnya,
// terus hitung ulang checksum (CRC)-nya. Ini legal & lumrah dipakai kalo QRIS-nya
// emang punya kita sendiri (bukan modifikasi QRIS orang lain).
//
// Format QRIS ngikutin standar EMVCo (dipake QR payment se-dunia). Isinya
// rangkaian TAG (2 digit) + LENGTH (2 digit) + VALUE. Contoh tag amount:
// "54" + "05" (panjang value = 5 karakter) + "50000" (value)

const QRCode = require('qrcode');

// Hitung CRC16-CCITT (checksum wajib di akhir setiap QRIS, biar app pembaca
// tau QR-nya ga corrupt/kemodif sembarangan)
function calculateCRC16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff; // biar tetep 16-bit (4 digit hex)
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// INI FUNGSI UTAMANYA: ubah QRIS statis jadi QRIS dinamis dengan nominal tertentu
function buildDynamicQris(staticQris, amount) {
  let qris = staticQris.trim();

  // 1. Buang 4 karakter CRC lama di paling belakang (nanti kita hitung ulang)
  qris = qris.substring(0, qris.length - 4);

  // 2. Ganti tag 01 (Point of Initiation Method): "11" (statis) -> "12" (dinamis)
  //    ini nandain ke app e-wallet/m-banking kalo QR ini punya nominal fix,
  //    jadi user ga perlu ketik nominal manual pas scan.
  qris = qris.replace('010211', '010212');

  // 3. Susun tag 54 (Transaction Amount) buat nominal pembayaran
  const amountStr = String(amount);
  const amountLength = String(amountStr.length).padStart(2, '0');
  const tag54 = `54${amountLength}${amountStr}`;

  // 4. Standar EMVCo mewajibkan tag 54 disisipin SEBELUM tag 58 (Country Code).
  //    Jadi kita cari posisi "5802ID" (tag negara = Indonesia), lalu sisipin di situ.
  const tag58Index = qris.indexOf('5802ID');
  if (tag58Index === -1) {
    throw new Error('Format QRIS_STATIC_STRING ga valid — ga ketemu tag negara (5802ID). Cek lagi string QRIS-nya di .env');
  }
  const before58 = qris.substring(0, tag58Index);
  const from58 = qris.substring(tag58Index);

  // 5. Gabungin semuanya + tempel placeholder tag 63 (CRC), panjangnya selalu "04"
  const combined = before58 + tag54 + from58 + '6304';

  // 6. Hitung CRC dari SELURUH string di atas (termasuk "6304"-nya), tempel di belakang
  const crc = calculateCRC16(combined);
  return combined + crc;
}

// Generate gambar QR code (base64 PNG data URL) langsung dari nominal
async function generateQrisImage(staticQris, amount) {
  const dynamicString = buildDynamicQris(staticQris, amount);
  // toDataURL bikin gambar QR dalam bentuk base64 string,
  // jadi bisa langsung ditempel ke <img src="..."> tanpa perlu simpen file gambar
  return QRCode.toDataURL(dynamicString, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 400,
  });
}

module.exports = { buildDynamicQris, generateQrisImage, calculateCRC16 };
