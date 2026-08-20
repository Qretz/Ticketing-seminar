// ==============================
// login.js — logic halaman Login (buat user yang udah pernah daftar)
// ==============================

const loginForm = document.getElementById('loginForm');
const loginOtpForm = document.getElementById('loginOtpForm');
const loginError = document.getElementById('loginError');
const otpError = document.getElementById('otpError');
const resendBtn = document.getElementById('resendBtn');
const passwordLoginBtn = document.getElementById('passwordLoginBtn');

let currentEmail = null;
let isSubmitting = false; // guard biar ga bisa submit dobel pas masih loading
let isVerifying = false;
let isPasswordLoggingIn = false;

// Abis dapet { token, redirect, orderId } dari server (baik lewat OTP maupun
// password), simpen token-nya terus arahin ke halaman yang sesuai posisi
// terakhir user di alur pembelian. Dipake bareng sama 2 cara login.
function finishLogin(data) {
  localStorage.setItem('seminar_token', data.token);
  if (data.redirect === 'payment' && data.orderId) {
    window.location.href = `payment.html?order=${data.orderId}`;
  } else {
    window.location.href = `package.html?token=${data.token}`;
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isSubmitting) return;
  isSubmitting = true;
  loginError.textContent = '';

  const submitBtn = loginForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Mengirim...';

  currentEmail = document.getElementById('email').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentEmail }),
    });
    const data = await res.json();

    if (!res.ok) {
      loginError.textContent = data.error;
      return;
    }

    loginForm.classList.add('hidden');
    loginOtpForm.classList.remove('hidden');
  } catch (err) {
    loginError.textContent = 'Gagal konek ke server. Coba lagi.';
  } finally {
    isSubmitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

loginOtpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isVerifying) return;
  isVerifying = true;
  otpError.textContent = '';

  const submitBtn = loginOtpForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Memverifikasi...';

  const otp = document.getElementById('otp').value;

  try {
    const res = await fetch('/api/login-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentEmail, otp }),
    });
    const data = await res.json();

    if (!res.ok) {
      otpError.textContent = data.error;
      return;
    }

    // Simpen token & arahin ke halaman yang sesuai posisi terakhir user
    finishLogin(data);
  } catch (err) {
    otpError.textContent = 'Gagal konek ke server. Coba lagi.';
  } finally {
    isVerifying = false;
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

passwordLoginBtn.addEventListener('click', async () => {
  if (isPasswordLoggingIn) return;

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (!email || !password) {
    loginError.textContent = 'Isi email dan password dulu buat login pake password.';
    return;
  }

  isPasswordLoggingIn = true;
  loginError.textContent = '';

  passwordLoginBtn.disabled = true;
  const originalText = passwordLoginBtn.textContent;
  passwordLoginBtn.textContent = 'Masuk...';

  try {
    const res = await fetch('/api/login-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      loginError.textContent = data.error;
      return;
    }

    finishLogin(data);
  } catch (err) {
    loginError.textContent = 'Gagal konek ke server. Coba lagi.';
  } finally {
    isPasswordLoggingIn = false;
    passwordLoginBtn.disabled = false;
    passwordLoginBtn.textContent = originalText;
  }
});

resendBtn.addEventListener('click', async () => {
  if (resendBtn.disabled) return;
  otpError.textContent = '';

  resendBtn.disabled = true;
  const originalText = resendBtn.textContent;
  resendBtn.textContent = 'Mengirim...';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentEmail }),
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
