// ==============================
// admin.js — halaman internal panitia buat konfirmasi pembayaran manual
// ==============================

const loadBtn = document.getElementById('loadBtn');
const ordersTable = document.getElementById('ordersTable');
const ordersBody = document.getElementById('ordersBody');

let adminPassword = '';

loadBtn.addEventListener('click', async () => {
  adminPassword = document.getElementById('adminPassword').value;
  await loadOrders();
});

async function loadOrders() {
  const res = await fetch(`/api/admin/orders?password=${encodeURIComponent(adminPassword)}`);
  if (!res.ok) {
    alert('Password salah atau gagal ambil data.');
    return;
  }
  const orders = await res.json();

  ordersBody.innerHTML = orders
    .map(
      (o) => `
    <tr>
      <td>${o.name}</td>
      <td>${o.email}</td>
      <td>${o.package_name || '-'}</td>
      <td>Rp${(o.package_price || 0).toLocaleString('id-ID')}</td>
      <td>${o.payment_status}</td>
      <td>
        ${
          o.payment_status !== 'paid'
            ? `<button onclick="confirmPayment('${o.order_id}')">Tandai Lunas</button>`
            : '✅'
        }
      </td>
    </tr>
  `
    )
    .join('');

  ordersTable.classList.remove('hidden');
}

async function confirmPayment(orderId) {
  const res = await fetch('/api/admin/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, password: adminPassword }),
  });
  if (res.ok) {
    loadOrders(); // refresh list biar status ke-update
  } else {
    alert('Gagal konfirmasi.');
  }
}
