/* ============================================================
   ZenPose AI — auth.js
   BACKEND LAYER: User registration, login, logout, session
   ============================================================

   Depends on: db.js (openDB, dbGet, dbPut, hashPass)
   ============================================================ */

let currentUser = null;

/* ---- SESSION PERSISTENCE ---------------------------------- */

/**
 * saveSession()
 * Saves logged-in username to sessionStorage so page
 * refreshes don't log the user out.
 */
function saveSession() {
  if (currentUser) sessionStorage.setItem('zenpose_user', currentUser.username);
}

/**
 * clearSession()
 * Removes session data from sessionStorage on logout.
 */
function clearSession() {
  sessionStorage.removeItem('zenpose_user');
}

/**
 * restoreSession()
 * Called on page load — re-hydrates currentUser from
 * IndexedDB if a saved username exists in sessionStorage.
 */
async function restoreSession() {
  const saved = sessionStorage.getItem('zenpose_user');
  if (!saved) return;
  const user = await dbGet('users', saved);
  if (user) { currentUser = user; enterApp(); }
}

/* ---- REGISTER --------------------------------------------- */

/**
 * doRegister()
 * Validates form input, checks for duplicate username,
 * hashes the password, and saves the new user to IndexedDB.
 */
async function doRegister() {
  const u = document.getElementById('reg-user').value.trim();
  const e = document.getElementById('reg-email').value.trim();
  const p = document.getElementById('reg-pass').value;

  // Validation
  if (!u || !e || !p) return showMsg('Please fill all fields.', 'error');
  if (p.length < 6)   return showMsg('Password must be at least 6 characters.', 'error');

  // Duplicate check
  const exists = await dbGet('users', u);
  if (exists) return showMsg('Username already taken. Try another.', 'error');

  // Save user record — password is hashed, never plaintext
  await dbPut('users', {
    username  : u,
    email     : e,
    passHash  : hashPass(p),
    createdAt : Date.now()
  });

  showMsg('Account created! You can now sign in.', 'success');
  setTimeout(() => switchTab('login'), 1200);
}

/* ---- LOGIN ------------------------------------------------- */

/**
 * doLogin()
 * Looks up the user by username, compares hashed passwords,
 * and loads the main app on success.
 */
async function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;

  if (!u || !p) return showMsg('Please enter username and password.', 'error');

  const user = await dbGet('users', u);
  if (!user || user.passHash !== hashPass(p))
    return showMsg('Invalid username or password.', 'error');

  currentUser = user;
  saveSession();
  enterApp();
}

/* ---- LOGOUT ----------------------------------------------- */

/**
 * doLogout()
 * Stops the camera, clears session, resets UI to auth screen.
 */
function doLogout() {
  stopCamera();
  clearSession();
  currentUser = null;

  document.getElementById('app-section').style.display   = 'none';
  document.getElementById('auth-section').style.display  = 'flex';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  clearMsg();
  resetStats();
}

/* ---- ENTER APP -------------------------------------------- */

/**
 * enterApp()
 * Switches UI from auth screen to main app after successful login.
 */
function enterApp() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('app-section').style.display  = 'block';
  document.getElementById('nav-username').textContent   = '👤 ' + currentUser.username;
  buildPoseGrid();
}

/* ---- UI HELPERS ------------------------------------------- */

/**
 * switchTab(tab)
 * Toggles between 'login' and 'register' form views.
 */
function switchTab(tab) {
  document.getElementById('login-form').style.display    = tab === 'login'    ? '' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  clearMsg();
}

/**
 * showMsg(msg, type)
 * Shows an auth feedback message ('error' | 'success').
 */
function showMsg(msg, type) {
  const el = document.getElementById('auth-msg');
  el.textContent = msg;
  el.className   = 'auth-msg ' + type;
}

/**
 * clearMsg()
 * Clears any displayed auth message.
 */
function clearMsg() {
  const el = document.getElementById('auth-msg');
  el.textContent = '';
  el.className   = 'auth-msg';
}
