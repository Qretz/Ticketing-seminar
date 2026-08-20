// ==============================
// payment.js — logic Page 3 (tampilin QRIS + cek status bayar)
// ==============================

const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('order');
const paymentCard = document.getElementById('paymentCard');

if (!orderId) {
  window.location.href = 'index.html';
}

async function loadPayment() {
  const res = await fetch(`/api/payment/${orderId}`);
  const data = await res.json();

  if (!res.ok) {
    paymentCard.innerHTML = `<p class="error">${data.error}</p>`;
    return;
  }

  paymentCard.innerHTML = `
    <h3>${data.packageName}</h3>
    <p class="price">Rp${data.amount.toLocaleString('id-ID')}</p>
    <img src="${data.qrisImage}" alt="QRIS" class="qris-image">
    <p>Scan pake aplikasi e-wallet / m-banking apapun yang support QRIS.</p>
    <p id="statusText">Status: <b>${data.status}</b></p>
    <p class="note">Bayar dalam ${data.holdMinutes} menit. Setelah bayar, panitia bakal
    konfirmasi manual — status di halaman ini update otomatis, ga perlu refresh.</p>
  `;

  pollStatus();
}

// Cek status pembayaran tiap 5 detik — soalnya konfirmasi bayar di sini manual
// (panitia yang klik "Tandai Lunas" di admin.html), bukan otomatis dari payment gateway
function pollStatus() {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/payment/${orderId}/status`);
    const data = await res.json();

    const statusText = document.getElementById('statusText');
    if (statusText) statusText.innerHTML = `Status: <b>${data.status}</b>`;

    if (data.status === 'paid') {
      clearInterval(interval);
      paymentCard.innerHTML += `<p class="success">✅ Pembayaran berhasil dikonfirmasi! Tiket kamu udah aktif.</p>`;
    }
  }, 5000);
}

loadPayment();
