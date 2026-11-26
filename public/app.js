const API = '/api';

// ---------- API helpers ----------
async function apiGet(path) {
  const res = await fetch(API + path);
  return res.json();
}

async function apiSend(method, path, body) {
  const res = await fetch(API + path, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data: data };
}

// ---------- Current user (saved in the browser) ----------
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser'));
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
}

// ---------- Shared header (same on every page) ----------
function renderHeader() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const links = [
    ['index.html', 'Home'],
    ['add-food.html', 'Add Food'],
    ['view-food.html', 'View Food'],
    ['coordinator.html', 'Coordinator']
  ];
  const nav = links
    .map(([href, label]) => `<a href="${href}" class="${page === href ? 'active' : ''}">${label}</a>`)
    .join('');

  document.getElementById('siteHeader').innerHTML = `
    <a class="brand" href="index.html">
      <img src="logo.svg" alt="Rinova logo">
      <span><b>rinova</b><small>Food · Care · Community</small></span>
    </a>
    <nav>${nav}</nav>
    <div class="user-box">Logged in as: <select id="userSelect"></select></div>
  `;
}

// Fills the dropdown in the header and returns the selected user
async function setupUserSelector() {
  renderHeader();
  const select = document.getElementById('userSelect');
  const users = await apiGet('/users');

  // The user ID is shown first, so it matches user_id / posted_by / requested_by in Postman
  select.innerHTML = users
    .map(u => `<option value="${u.user_id}">${u.user_id} · ${escapeHtml(u.name)} (${u.role})</option>`)
    .join('');

  let current = getCurrentUser();
  if (!current || !users.find(u => u.user_id === current.user_id)) {
    current = users[0];
    setCurrentUser(current);
  }
  select.value = current.user_id;

  select.addEventListener('change', () => {
    const chosen = users.find(u => u.user_id == select.value);
    setCurrentUser(chosen);
    location.reload();   // re-draw the page for the new user
  });

  return current;
}

// ---------- Small helpers ----------
// Stops user-typed text from being treated as HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showMessage(type, text) {
  const box = document.getElementById('message');
  box.className = 'message ' + type;   // 'success' or 'error'
  box.textContent = text;
}

// Current date-time in the format a datetime-local input needs
function nowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}