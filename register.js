// ==============================
// register.js — logic Page 1 (registrasi + verifikasi OTP)
// ==============================

const registerForm = document.getElementById('registerForm');
const otpForm = document.getElementById('otpForm');
const registerError = document.getElementById('registerError');
const otpError = document.getElementById('otpError');
const resendBtn = document.getElementById('resendBtn');

let currentToken = null;
let isRegistering = false;
let isVerifying = false;

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isRegistering) return;
  isRegistering = true;
  registerError.textContent = '';

  const submitBtn = registerForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Mendaftar...';

  const payload = {
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    campus: document.getElementById('campus').value,
    password: document.getElementById('password').value,
  };

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      registerError.textContent = data.error;
      if (data.token) {
        currentToken = data.token;
        localStorage.setItem('seminar_token', currentToken);
        registerForm.classList.add('hidden');
        otpForm.classList.remove('hidden');
      }
      return;
    }

    currentToken = data.token;
    localStorage.setItem('seminar_token', currentToken);
    registerForm.classList.add('hidden');
    otpForm.classList.remove('hidden');
  } catch (err) {
    registerError.textContent = 'Gagal konek ke server. Coba lagi.';
  } finally {
    isRegistering = false;
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

otpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isVerifying) return;
  isVerifying = true;
  otpError.textContent = '';

  const submitBtn = otpForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Memverifikasi...';

  const otp = document.getElementById('otp').value;

  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: currentToken, otp }),
    });
    const data = await res.json();

    if (!res.ok) {
      otpError.textContent = data.error;
      return;
    }

    window.location.href = `package.html?token=${currentToken}`;
  } catch (err) {
    otpError.textContent = 'Gagal konek ke server. Coba lagi.';
  } finally {
    isVerifying = false;
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

resendBtn.addEventListener('click', async () => {
  if (resendBtn.disabled) return;
  otpError.textContent = '';

  resendBtn.disabled = true;
  const originalText = resendBtn.textContent;
  resendBtn.textContent = 'Mengirim...';

  try {
    const res = await fetch('/api/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: currentToken }),
    });
    const data = await res.json();

    if (!res.ok) {
      otpError.textContent = data.error;
      return;
    }

    alert('Kode baru udah dikirim ke email kamu!');
  } catch (err) {
    otpError.textContent = 'Gagal konek ke server. Coba lagi.';
  } finally {
    resendBtn.disabled = false;
    resendBtn.textContent = originalText;
  }
});