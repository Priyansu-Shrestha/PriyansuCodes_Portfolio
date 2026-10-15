// Data layer for the static pages. Markup stays in HTML; this file
// fills projects, the contact form, and the admin panel from the API.

// XAMPP serves these files on port 80, but the API runs on port 8080.
// Opening the page from Apache makes /api/... a 404, so jump to the app server.
(function redirectToAppServer() {
  const host = location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return;
  if (location.port === '8080') return;
  const file = location.pathname.split('/').filter(Boolean).pop() || 'index.html';
  const inAdmin = location.pathname.includes('/admin/');
  const path = `${inAdmin ? '/admin/' : '/'}${file}`;
  location.replace(`http://localhost:8080${path}${location.search}${location.hash}`);
})();

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function projectCard(project, index) {
  const tags = String(project.technologies || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => `<span>${escapeHtml(tag)}</span>`)
    .join('');

  const links = [];
  if (project.github && project.github !== '#') {
    links.push(`<a href="${escapeHtml(project.github)}" target="_blank" rel="noopener">Code →</a>`);
  }
  if (project.live_demo && project.live_demo !== '#') {
    links.push(`<a href="${escapeHtml(project.live_demo)}" target="_blank" rel="noopener">Live →</a>`);
  }

  return `<div class="project-card">
    <span class="project-index">0${index + 1}</span>
    <h3>${escapeHtml(project.title)}</h3>
    <p>${escapeHtml(project.description)}</p>
    <div class="tag-row">${tags}</div>
    <div class="project-links">${links.join('')}</div>
  </div>`;
}

function signatureOf(container) {
  return [...container.querySelectorAll('.project-card')].map((card) => {
    const title = card.querySelector('h3');
    const body = card.querySelector('p');
    return `${title ? title.textContent : ''}|${body ? body.textContent : ''}`;
  }).join('||');
}

async function loadProjects(container) {
  const limit = container.dataset.limit;
  const url = limit ? `/api/projects?limit=${encodeURIComponent(limit)}` : '/api/projects';
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    const projects = data.projects || [];
    if (!projects.length) return;
    const next = projects.map((p) => `${p.title}|${p.description}`).join('||');
    if (next !== signatureOf(container)) {
      container.innerHTML = projects.map(projectCard).join('');
      if (window.setupReveal) window.setupReveal();
      if (window.refreshProjectFilters) window.refreshProjectFilters();
    }
    const count = document.getElementById('projectShown');
    if (count && limit) count.textContent = `3 of ${projects.length}`;
  } catch (_) {
    /* Keep the cards already in the page. */
  }
}

function showFormMessage(el, type, text) {
  if (!el) return;
  el.className = `form-msg ${type}`;
  el.textContent = text;
  el.style.marginBottom = '16px';
}

async function bindContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const msg = document.getElementById('formMsg');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      subject: form.subject.value.trim(),
      message: form.message.value.trim(),
      hp_leave_blank: form.hp_leave_blank ? form.hp_leave_blank.value : '',
    };

    if (!body.name || !body.email || !body.message) {
      showFormMessage(msg, 'err', 'Please fill in your name, email and message.');
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    const label = button ? button.innerHTML : '';
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending';
    }
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      showFormMessage(msg, data.ok ? 'ok' : 'err', data.message || 'Something went wrong. Please try again later.');
      if (data.ok) {
        form.reset();
        const count = document.querySelector('.char-count');
        if (count) count.textContent = '0 characters';
      }
    } catch (_) {
      showFormMessage(msg, 'err', 'Something went wrong. Please try again later.');
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = label;
      }
    }
  });
}

function passwordProblem(password) {
  if (password.length < 10) return 'Password must be at least 10 characters.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return 'Password needs both uppercase and lowercase letters.';
  }
  if (!/\d/.test(password)) return 'Password needs at least one number.';
  return '';
}

function bindPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach((button) => {
    const input = button.parentElement.querySelector('input');
    if (!input) return;
    button.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', show ? 'true' : 'false');
      button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      const icon = button.querySelector('i');
      if (icon) icon.className = show ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    });
  });
}

function adminNext() {
  const next = new URLSearchParams(window.location.search).get('next');
  return next === 'inbox.html' || next === 'dashboard.html' ? next : 'dashboard.html';
}

async function bindLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  try {
    const session = await fetch('/api/admin/session').then((r) => r.json());
    if (session.ok) {
      window.location.replace(adminNext());
      return;
    }
  } catch (_) {}

  const msg = document.getElementById('formMsg');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = {
      username: form.username.value.trim(),
      password: form.password.value,
    };
    if (!body.username || !body.password) {
      showFormMessage(msg, 'err', 'Please enter both username and password.');
      return;
    }
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        window.location.href = adminNext();
        return;
      }
      showFormMessage(msg, 'err', data.message || 'Incorrect username or password.');
    } catch (_) {
      showFormMessage(msg, 'err', 'Something went wrong. Please try again later.');
    }
  });
}

async function bindSetup() {
  const form = document.getElementById('setupForm');
  if (!form) return;
  const msg = document.getElementById('formMsg');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = {
      full_name: form.full_name.value.trim(),
      username: form.username.value.trim(),
      email: form.email.value.trim(),
      password: form.password.value,
    };
    const weak = passwordProblem(body.password);
    if (!body.full_name || !body.username || weak) {
      showFormMessage(msg, 'err', weak || 'Fill in all fields.');
      return;
    }
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      let data;
      try {
        data = await res.json();
      } catch (_) {
        showFormMessage(msg, 'err', 'The admin service is not reachable. Open this page at http://localhost:8080/admin/create-admin.html.');
        return;
      }
      if (!data.ok) {
        showFormMessage(msg, 'err', data.message || 'Something went wrong. Please try again later.');
        return;
      }
      msg.className = 'form-msg ok';
      msg.style.marginBottom = '16px';
      msg.innerHTML = 'Admin account saved. You can now <a href="login.html" style="color:inherit">log in</a>.';
      form.remove();
    } catch (_) {
      showFormMessage(msg, 'err', 'The admin service is not reachable. Open this page at http://localhost:8080/admin/create-admin.html.');
    }
  });
}

function deleteButton(kind, id) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'link-danger';
  button.style.background = 'none';
  button.style.border = 'none';
  button.style.cursor = 'pointer';
  button.textContent = 'Delete';
  button.addEventListener('click', async () => {
    const label = kind === 'contacts' ? 'Delete this message?' : 'Delete this project?';
    if (!window.confirm(label)) return;
    const res = await fetch(`/api/admin/${kind}/${id}`, { method: 'DELETE' });
    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    if (document.getElementById('inbox')) loadInbox();
    else loadDashboard();
  });
  return button;
}

async function loadDashboard() {
  const root = document.getElementById('dashboard');
  if (!root) return;

  const res = await fetch('/api/admin/dashboard');
  if (res.status === 401) {
    window.location.replace('login.html');
    return;
  }
  const data = await res.json();
  if (!data.ok) return;

  document.getElementById('adminName').textContent = data.name || '';
  document.getElementById('contactCount').textContent = data.contactCount;
  document.getElementById('projectCount').textContent = data.projectCount;
  document.getElementById('periodLabel').textContent = data.period;

  const messages = document.getElementById('messageBody');
  const empty = document.getElementById('noMessages');
  const tableWrap = document.getElementById('messageTable');
  messages.innerHTML = '';
  if (!data.messages.length) {
    empty.hidden = false;
    tableWrap.hidden = true;
  } else {
    empty.hidden = true;
    tableWrap.hidden = false;
    data.messages.forEach((m) => {
      const tr = document.createElement('tr');
      const cells = [m.name, m.email, m.subject || '—', m.message];
      cells.forEach((text, i) => {
        const td = document.createElement('td');
        if (i === 3) td.style.maxWidth = '280px';
        td.textContent = text;
        tr.appendChild(td);
      });
      const when = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = m.received;
      when.appendChild(badge);
      tr.appendChild(when);
      const action = document.createElement('td');
      action.appendChild(deleteButton('contacts', m.id));
      tr.appendChild(action);
      messages.appendChild(tr);
    });
  }

  const projects = document.getElementById('projectBody');
  projects.innerHTML = '';
  if (!data.projects.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.style.color = 'var(--slate)';
    td.textContent = 'No projects added yet.';
    tr.appendChild(td);
    projects.appendChild(tr);
  } else {
    data.projects.forEach((p) => {
      const tr = document.createElement('tr');
      [p.title, p.technologies].forEach((text) => {
        const td = document.createElement('td');
        td.textContent = text || '';
        tr.appendChild(td);
      });
      const when = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = p.added;
      when.appendChild(badge);
      tr.appendChild(when);
      const action = document.createElement('td');
      action.appendChild(deleteButton('projects', p.id));
      tr.appendChild(action);
      projects.appendChild(tr);
    });
  }
}

function bindProjectForm() {
  const form = document.getElementById('projectForm');
  if (!form) return;
  const msg = document.getElementById('projectMsg');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = {
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      technologies: form.technologies.value.trim(),
      github: form.github.value.trim(),
      live_demo: form.live_demo.value.trim(),
    };
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        window.location.href = 'login.html';
        return;
      }
      const data = await res.json();
      if (!data.ok) {
        showFormMessage(msg, 'err', data.message || 'Something went wrong. Please try again later.');
        return;
      }
      form.reset();
      if (msg) msg.textContent = '';
      loadDashboard();
    } catch (_) {
      showFormMessage(msg, 'err', 'Something went wrong. Please try again later.');
    }
  });
}

let inboxMessages = [];
let inboxSelected = null;

function renderInboxList() {
  const list = document.getElementById('inboxItems');
  const empty = document.getElementById('inboxEmpty');
  if (!list) return;
  const query = (document.getElementById('inboxSearch')?.value || '').trim().toLowerCase();
  const visible = inboxMessages.filter((m) => {
    const hay = `${m.name} ${m.email} ${m.subject} ${m.message}`.toLowerCase();
    return !query || hay.includes(query);
  });
  list.replaceChildren();
  empty.hidden = visible.length !== 0;
  if (!visible.length && query) empty.textContent = 'No messages match that search.';
  if (!visible.length && !query) empty.textContent = 'No messages yet.';
  visible.forEach((m) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'inbox-item' + (m.id === inboxSelected ? ' on' : '');
    const name = document.createElement('strong');
    name.textContent = m.name || 'Untitled';
    const subject = document.createElement('span');
    subject.textContent = m.subject || 'No subject';
    const when = document.createElement('em');
    when.textContent = m.received || '';
    button.append(name, subject, when);
    button.addEventListener('click', () => {
      inboxSelected = m.id;
      renderInboxList();
      renderInboxMessage(m);
    });
    list.appendChild(button);
  });
}

function renderInboxMessage(message) {
  const reader = document.getElementById('inboxReader');
  if (!reader) return;
  reader.replaceChildren();
  if (!message) {
    const hint = document.createElement('p');
    hint.className = 'sub';
    hint.style.textAlign = 'left';
    hint.style.margin = '0';
    hint.textContent = 'Select a message to read it.';
    reader.appendChild(hint);
    return;
  }

  const eyebrow = document.createElement('div');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Message';
  const title = document.createElement('h2');
  title.textContent = message.subject || 'No subject';
  const meta = document.createElement('div');
  meta.className = 'inbox-meta';
  [
    ['From', message.name || '—'],
    ['Email', message.email || '—'],
    ['Received', message.received || '—'],
  ].forEach(([label, value]) => {
    const block = document.createElement('div');
    const strong = document.createElement('b');
    strong.textContent = label;
    const span = document.createElement('span');
    span.textContent = value;
    block.append(strong, span);
    meta.appendChild(block);
  });
  const body = document.createElement('div');
  body.className = 'inbox-body';
  body.textContent = message.message || '';
  const actions = document.createElement('div');
  actions.className = 'inbox-actions';
  if (message.email) {
    const reply = document.createElement('a');
    reply.href = `mailto:${message.email}?subject=${encodeURIComponent('Re: ' + (message.subject || 'your message'))}`;
    reply.textContent = 'Reply by email';
    reply.style.color = 'var(--blueprint)';
    actions.appendChild(reply);
  }
  actions.appendChild(deleteButton('contacts', message.id));
  reader.append(eyebrow, title, meta, body, actions);
}

async function loadInbox() {
  const root = document.getElementById('inbox');
  if (!root) return;
  const res = await fetch('/api/admin/messages');
  if (res.status === 401) {
    window.location.replace('login.html?next=inbox.html');
    return;
  }
  const data = await res.json();
  if (!data.ok) return;
  const name = document.getElementById('adminName');
  if (name) name.textContent = data.name || '';
  inboxMessages = data.messages || [];
  if (!inboxMessages.some((m) => m.id === inboxSelected)) inboxSelected = null;
  renderInboxList();
  renderInboxMessage(inboxMessages.find((m) => m.id === inboxSelected) || null);
  const search = document.getElementById('inboxSearch');
  if (search && !search.dataset.bound) {
    search.dataset.bound = '1';
    search.addEventListener('input', renderInboxList);
  }
}

function bindLogout() {
  const link = document.getElementById('logoutLink');
  if (!link) return;
  link.addEventListener('click', async (event) => {
    event.preventDefault();
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = 'login.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-projects]').forEach(loadProjects);
  bindPasswordToggles();
  bindContactForm();
  bindLogin();
  bindSetup();
  bindProjectForm();
  bindLogout();
  loadDashboard();
  loadInbox();
});
