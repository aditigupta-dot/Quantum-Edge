/**
 * js/auth.js — Authentication (JWT-based, demo-friendly)
 */

function switchAuthTab(tab) {
  document.getElementById('signinTab').classList.toggle('active', tab === 'signin');
  document.getElementById('signupTab').classList.toggle('active', tab === 'signup');
  document.getElementById('signinForm').style.display = tab === 'signin' ? 'block' : 'none';
  document.getElementById('signupForm').style.display = tab === 'signup' ? 'block' : 'none';
}

async function handleLogin() {
  const email = document.getElementById('loginEmail')?.value || 'demo@quantumedge.io';
  const password = document.getElementById('loginPassword')?.value || 'demo';

  if (!email) { showToast('Please enter your email', 'error'); return; }

  // Show loading on button
  const btn = document.querySelector('.btn-quantum-full');
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="q-spinner"></span> Authenticating…';
  btn.disabled = true;

  // Try real API login
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('qe_token', data.access_token);
    }
  } catch (_) {
    // Demo mode: proceed without token
  }

  // Store user info
  const user = {
    email,
    name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
    initials: email.slice(0, 2).toUpperCase(),
  };
  Store.set('user', user);
  Store.set('isLoggedIn', true);

  // Update avatar
  document.querySelector('.user-avatar').textContent = user.initials;

  // Simulate small delay for UX
  await delay(600);

  btn.innerHTML = original;
  btn.disabled = false;

  // Transition to main app
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainApp').classList.remove('app-hidden');
  document.getElementById('mainApp').style.display = 'flex';
  document.getElementById('mainApp').style.flexDirection = 'column';

  showToast(`Welcome back, ${user.name}! ⚛`, 'success');
  initApp();
}

function logout() {
  localStorage.removeItem('qe_token');
  Store.set('user', null);
  Store.set('isLoggedIn', false);
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
  toggleUserMenu(true);
}

function toggleUserMenu(forceClose = false) {
  const menu = document.getElementById('userMenu');
  if (forceClose) { menu.classList.remove('open'); return; }
  menu.classList.toggle('open');
}

// Close menu on outside click
document.addEventListener('click', (e) => {
  const menu = document.getElementById('userMenu');
  if (!e.target.closest('.user-avatar') && !e.target.closest('.user-menu')) {
    menu?.classList.remove('open');
  }
});

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }