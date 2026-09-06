(function () {
  var SESSION_KEY = 'chookee_session';

  /* ---------- styles ---------- */
  var style = document.createElement('style');
  style.textContent = [
    '.auth-overlay{position:fixed;inset:0;background:rgba(15,10,5,.55);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:100;padding:20px}',
    '.auth-overlay.open{display:flex}',
    '.auth-card{background:#fff;border-radius:22px;box-shadow:0 24px 70px rgba(48,28,8,.25);width:min(420px,100%);padding:34px;position:relative;animation:authPop .22s ease}',
    '@keyframes authPop{from{transform:translateY(14px);opacity:0}}',
    '.auth-close{position:absolute;top:12px;right:16px;border:0;background:transparent;font-size:26px;cursor:pointer;color:#999;line-height:1}',
    '.auth-card h3{margin:0 0 6px;font-size:24px;letter-spacing:-.5px}',
    '.auth-sub{margin:0 0 22px;color:var(--muted);font-size:14px}',
    '.auth-field{margin-bottom:15px}',
    '.auth-field label{display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#8b8477;margin-bottom:7px}',
    '.auth-field input{width:100%;padding:13px 14px;border:1px solid #ded8ca;border-radius:12px;font:inherit;background:#fffaf0}',
    '.auth-field input:focus{outline:2px solid var(--red);outline-offset:1px;border-color:transparent}',
    '.auth-error{display:none;background:#fdeaea;color:var(--deep-red);border:1px solid #f6c9c9;border-radius:10px;padding:10px 13px;font-size:13px;font-weight:700;margin-bottom:15px}',
    '.auth-error.show{display:block}',
    '.auth-submit{width:100%;border:0}',
    '.auth-switch{text-align:center;margin-top:18px;font-size:13px;color:var(--muted)}',
    '.auth-switch a{color:var(--red);font-weight:800;cursor:pointer}',
    '.auth-note{text-align:center;font-size:11px;color:#a49c8e;margin-top:14px}',
    '.nav-user{display:flex;align-items:center;gap:14px;font-weight:800}',
    '.nav-user .avatar{width:38px;height:38px;border-radius:50%;background:var(--yellow);color:#171000;display:grid;place-items:center;font-weight:900;text-transform:uppercase}',
    '.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);background:var(--green);color:#fff;padding:13px 22px;border-radius:12px;font-weight:800;font-size:14px;box-shadow:0 12px 30px rgba(0,0,0,.2);transition:.3s ease;z-index:120;opacity:0}',
    '.toast.show{transform:translateX(-50%) translateY(0);opacity:1}'
  ].join('');
  document.head.appendChild(style);

  /* ---------- modal ---------- */
  var overlay = document.createElement('div');
  overlay.className = 'auth-overlay';
  overlay.innerHTML =
    '<div class="auth-card" role="dialog" aria-modal="true">' +
      '<button class="auth-close" aria-label="Close">&times;</button>' +
      '<h3 id="authTitle">Log In</h3>' +
      '<p class="auth-sub" id="authSub"></p>' +
      '<div class="auth-error" id="authError"></div>' +
      '<form id="authForm" novalidate>' +
        '<div class="auth-field"><label for="authUser">Username</label><input id="authUser" autocomplete="username" required></div>' +
        '<div class="auth-field"><label for="authPass">Password</label><input id="authPass" type="password" autocomplete="current-password" required></div>' +
        '<button class="btn btn-red auth-submit" type="submit" id="authSubmit">Log In</button>' +
      '</form>' +
      '<div class="auth-switch" id="authSwitch"></div>' +
      '<div class="auth-note">Credentials are stored locally in your browser.</div>' +
    '</div>';
  document.body.appendChild(overlay);

  var toast = document.createElement('div');
  toast.className = 'toast';
  document.body.appendChild(toast);

  var mode = 'login';
  var title = overlay.querySelector('#authTitle');
  var sub = overlay.querySelector('#authSub');
  var error = overlay.querySelector('#authError');
  var form = overlay.querySelector('#authForm');
  var user = overlay.querySelector('#authUser');
  var pass = overlay.querySelector('#authPass');
  var submit = overlay.querySelector('#authSubmit');
  var switchBox = overlay.querySelector('#authSwitch');

  function open(m) {
    mode = m;
    error.classList.remove('show');
    form.reset();
    if (mode === 'login') {
      title.textContent = 'Log In';
      sub.textContent = 'Welcome back! Enter your details to access your portal.';
      submit.textContent = 'Log In';
      pass.autocomplete = 'current-password';
      switchBox.innerHTML = 'New to Chookee Inasal? <a class="auth-switch-link" href="#" data-mode="signup">Create an account</a>';
    } else {
      title.textContent = 'Sign Up';
      sub.textContent = 'Create your account to manage your branch operations.';
      submit.textContent = 'Create Account';
      pass.autocomplete = 'new-password';
      switchBox.innerHTML = 'Already have an account? <a class="auth-switch-link" href="#" data-mode="login">Log in</a>';
    }
    overlay.classList.add('open');
    setTimeout(function () { user.focus(); }, 50);
  }

  function close() { overlay.classList.remove('open'); }

  function showError(msg) { error.textContent = msg; error.classList.add('show'); }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }

  /* ---------- header session state ---------- */
  var navActions = document.querySelector('.nav-actions');
  var originalNav = navActions ? navActions.innerHTML : '';

  function renderHeader() {
    if (!navActions) return;
    var current = localStorage.getItem(SESSION_KEY);
    if (current) {
      navActions.innerHTML =
        '<div class="nav-user">' +
          '<div class="avatar">' + current.charAt(0) + '</div>' +
          '<span>Hi, ' + current + '</span>' +
          '<a class="btn btn-outline" id="logoutBtn" href="#">Log Out</a>' +
        '</div>';
      navActions.dataset.logged = '1';
    } else if (navActions.dataset.logged) {
      navActions.innerHTML = originalNav;
      delete navActions.dataset.logged;
      wireButtons();
    }
    window.dispatchEvent(new CustomEvent('chookee:session'));
  }

  /* ---------- form submit ---------- */
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var username = user.value.trim();
    var password = pass.value;
    if (!username) return showError('Please enter a username.');
    if (password.length < 4) return showError('Password must be at least 4 characters.');
    submit.disabled = true;
    var orig = submit.textContent;
    submit.textContent = 'Please wait…';
    try {
      var res = await fetch('/api/auth/' + mode, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      });
      var json = await res.json();
      if (!json.ok) { showError(json.error); return; }
      localStorage.setItem(SESSION_KEY, username);
      close();
      renderHeader();
      showToast(mode === 'signup'
        ? 'Welcome, ' + username + '! Account created.'
        : 'Welcome back, ' + username + '!');
    } catch (err) {
      showError('Network error. Please try again.');
    } finally {
      submit.disabled = false;
      submit.textContent = orig;
    }
  });

  /* ---------- wiring ---------- */
  function wireButtons() {
    document.querySelectorAll('a.btn').forEach(function (a) {
      if (a.id === 'logoutBtn' || a.dataset.wired) return;
      a.dataset.wired = '1';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        open(/log in/i.test(a.textContent) ? 'login' : 'signup');
      });
    });
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#logoutBtn')) {
      e.preventDefault();
      localStorage.removeItem(SESSION_KEY);
      renderHeader();
      showToast('Logged out.');
      return;
    }
    var sw = e.target.closest ? e.target.closest('#authSwitch a') : null;
    if (sw) { e.preventDefault(); open(sw.getAttribute('data-mode')); return; }
    if (e.target.classList && e.target.classList.contains('auth-close')) close();
  });

  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  wireButtons();
  renderHeader();
})();
