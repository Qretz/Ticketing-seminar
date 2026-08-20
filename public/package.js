// ==============================
// package.js — logic Page 2 (pilih paket bundling)
// ==============================

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token') || localStorage.getItem('seminar_token');

if (!token) {
  window.location.href = 'index.html';
}

const packageList = document.getElementById('packageList');
const packageError = document.getElementById('packageError');

const CHECK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const STAR_ICON = `<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9L5.7 21l1.7-7-5.4-4.7 7.1-.6z"/></svg>`;

let isSelecting = false;

async function loadPackages() {
  const res = await fetch('/api/packages');
  const packages = await res.json();

  packageList.innerHTML = packages
    .map(
      (pkg) => `
    <button class="pricing-card ${pkg.popular ? 'popular' : ''}" data-id="${pkg.id}">
      ${pkg.popular ? `<span class="popular-badge">${STAR_ICON} Paling Laris</span>` : ''}
      <h3>${pkg.name}</h3>
      <p class="plan-description">${pkg.description || ''}</p>
      <div class="price-row">
        <span class="price">Rp${pkg.price.toLocaleString('id-ID')}</span>
      </div>
      <ul class="feature-list">
        ${(pkg.features || []).map((f) => `<li>${CHECK_ICON}<span>${f}</span></li>`).join('')}
      </ul>
      <span class="select-btn">Pilih Paket Ini</span>
    </button>
  `
    )
    .join('');

  document.querySelectorAll('.pricing-card').forEach((btn) => {
    btn.addEventListener('click', () => selectPackage(btn.dataset.id));
  });
}

async function selectPackage(packageId) {
  if (isSelecting) return;
  isSelecting = true;
  packageError.textContent = '';

  const clickedBtn = document.querySelector(`.pricing-card[data-id="${packageId}"] .select-btn`);
  const originalText = clickedBtn.textContent;
  clickedBtn.textContent = 'Memproses...';
  clickedBtn.disabled = true;

  try {
    const res = await fetch('/api/select-package', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, packageId }),
    });
    const data = await res.json();

    if (!res.ok) {
      packageError.textContent = data.error;
      return;
    }

    window.location.href = `payment.html?order=${data.orderId}`;
  } catch (err) {
    packageError.textContent = 'Gagal konek ke server. Coba lagi.';
  } finally {
    isSelecting = false;
    clickedBtn.textContent = originalText;
    clickedBtn.disabled = false;
  }
}

loadPackages();