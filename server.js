const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const PRIVATE_DIR = path.join(ROOT, 'private');

function sessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  try {
    fs.mkdirSync(PRIVATE_DIR, { recursive: true });
    const file = path.join(PRIVATE_DIR, 'session.secret');
    if (fs.existsSync(file)) {
      const saved = fs.readFileSync(file, 'utf8').trim();
      if (saved) return saved;
    }
    const created = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(file, created, { mode: 0o600 });
    return created;
  } catch (_) {
    return crypto.randomBytes(32).toString('hex');
  }
}

const PRODUCTION = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

function sslForHost(hostname) {
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || !hostname.includes('.')) return false;
  return { rejectUnauthorized: false };
}

function createPool() {
  const databaseUrl = process.env.DATABASE_URL || '';
  if (databaseUrl.startsWith('postgres')) {
    const host = new URL(databaseUrl).hostname;
    const pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: sslForHost(host),
    });
    return {
      driver: 'pg',
      query(sql, params = []) {
        let n = 0;
        const text = sql.replace(/\?/g, () => `$${++n}`);
        return pgPool.query(text, params).then((result) => [result.rows]);
      },
      execute(sql, params) {
        return this.query(sql, params);
      },
    };
  }

  let config;
  if (databaseUrl.startsWith('mysql')) {
    const parsed = new URL(databaseUrl);
    config = {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
    };
    const ssl = sslForHost(parsed.hostname);
    if (ssl) config.ssl = ssl;
  } else {
    config = {
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'portfolio_db',
    };
    const ssl = sslForHost(config.host);
    if (ssl) config.ssl = ssl;
  }
  const mysqlPool = mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
  });
  return { driver: 'mysql', query: mysqlPool.query.bind(mysqlPool), execute: mysqlPool.execute.bind(mysqlPool) };
}

const pool = createPool();

const MYSQL_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    image VARCHAR(255),
    github VARCHAR(255),
    live_demo VARCHAR(255),
    technologies VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    subject VARCHAR(255),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
];

const PG_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    image VARCHAR(255),
    github VARCHAR(255),
    live_demo VARCHAR(255),
    technologies VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    subject VARCHAR(255),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
];

async function ensureSchema() {
  const statements = pool.driver === 'pg' ? PG_SCHEMA : MYSQL_SCHEMA;
  for (const sql of statements) await pool.query(sql);
}

const HOME_FALLBACK = [
  {
    title: 'AI Solutions — Corporate Website',
    description: 'A multi-page PHP/MySQL business site with an admin panel for managing inquiries and content.',
    technologies: 'PHP, MySQL, JS',
    github: '#',
    live_demo: '#',
  },
  {
    title: 'Student Performance Predictor',
    description: 'A Python machine learning project comparing algorithms to predict academic outcomes.',
    technologies: 'Python, Scikit-learn',
    github: '#',
    live_demo: '#',
  },
  {
    title: 'POS System',
    description: 'A point-of-sale desktop application for retail transactions and inventory tracking.',
    technologies: 'C#, SQL Server',
    github: '#',
    live_demo: '#',
  },
];

const ALL_FALLBACK = [
  {
    title: 'AI Solutions — Corporate Website',
    description: 'A multi-page PHP/MySQL business site with services, blog, gallery, events, and a password-protected admin panel for managing inquiries.',
    technologies: 'PHP, MySQL, PDO, JS',
    github: '#',
    live_demo: '#',
  },
  {
    title: 'TechVision Solutions',
    description: 'A Node.js and Express rebuild of a B2B business website, backed by SQLite for lightweight local data storage.',
    technologies: 'Node.js, Express, SQLite',
    github: '#',
    live_demo: '#',
  },
  {
    title: 'NextGen Software Solutions',
    description: 'A Bootstrap 5 and PHP business website emphasizing fast page loads and a clean component structure.',
    technologies: 'PHP, Bootstrap 5, MySQL',
    github: '#',
    live_demo: '#',
  },
  {
    title: 'Student Performance Predictor',
    description: 'A comparative machine learning study predicting academic outcomes, built for a university research project.',
    technologies: 'Python, Scikit-learn, Pandas',
    github: '#',
    live_demo: '#',
  },
  {
    title: 'Point of Sale System',
    description: 'A desktop POS application handling transactions, receipts and inventory tracking for retail use.',
    technologies: 'C#, SQL Server',
    github: '#',
    live_demo: '#',
  },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatPeriod(value = new Date()) {
  return `${MONTHS[value.getMonth()]} ${value.getFullYear()}`;
}

function trimWidth(value, width = 120) {
  const text = String(value || '');
  if (text.length <= width) return text;
  return text.slice(0, width - 1) + '…';
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function loadProjects(limit) {
  try {
    const sql = limit
      ? 'SELECT title, description, technologies, github, live_demo FROM projects ORDER BY created_at DESC LIMIT ?'
      : 'SELECT title, description, technologies, github, live_demo FROM projects ORDER BY created_at DESC';
    const [rows] = limit ? await pool.query(sql, [Number(limit)]) : await pool.query(sql);
    if (!rows.length) return limit ? HOME_FALLBACK.slice(0, limit) : ALL_FALLBACK;
    return rows;
  } catch (err) {
    console.error('Project query failed:', err.message);
    return limit ? HOME_FALLBACK.slice(0, limit) : ALL_FALLBACK;
  }
}

function requireAdmin(req, res, next) {
  if (!req.session.adminId) {
    return res.status(401).json({ ok: false, message: 'Sign in required.' });
  }
  next();
}

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

function loginKey(req, username) {
  const ip = req.ip || req.socket.remoteAddress || 'local';
  return `${ip}|${username.toLowerCase()}`;
}

function loginLock(key) {
  const now = Date.now();
  const row = loginAttempts.get(key);
  if (!row || now > row.resetAt) return null;
  if (row.count >= LOGIN_MAX_ATTEMPTS) return row;
  return null;
}

function recordLoginFailure(key) {
  const now = Date.now();
  const row = loginAttempts.get(key);
  if (!row || now > row.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  row.count += 1;
  if (row.count >= LOGIN_MAX_ATTEMPTS) row.resetAt = now + LOGIN_WINDOW_MS;
}

function passwordProblem(password) {
  if (password.length < 10) return 'Password must be at least 10 characters.';
  if (password.length > 128) return 'Password must be 128 characters or fewer.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return 'Password needs both uppercase and lowercase letters.';
  }
  if (!/\d/.test(password)) return 'Password needs at least one number.';
  return '';
}

function clip(value, max) {
  return String(value || '').trim().slice(0, max);
}

function isLoopback(req) {
  const ip = req.socket.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

function sameOrigin(req) {
  const origin = req.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === req.get('host');
  } catch (_) {
    return false;
  }
}

async function adminExists() {
  const [[row]] = await pool.query('SELECT COUNT(*) AS c FROM admins');
  return Number(row.c) > 0;
}

const contactAttempts = new Map();
const CONTACT_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_MAX = 8;

function contactLocked(ip) {
  const now = Date.now();
  const row = contactAttempts.get(ip);
  if (!row || now > row.resetAt) return false;
  return row.count >= CONTACT_MAX;
}

function recordContact(ip) {
  const now = Date.now();
  const row = contactAttempts.get(ip);
  if (!row || now > row.resetAt) {
    contactAttempts.set(ip, { count: 1, resetAt: now + CONTACT_WINDOW_MS });
    return;
  }
  row.count += 1;
}

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  const hidden = req.path.startsWith('/admin') || req.path.startsWith('/api');
  if (hidden) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  next();
});

if (PRODUCTION) app.set('trust proxy', 1);

app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(session({
  name: 'portfolio.sid',
  secret: sessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: PRODUCTION,
    maxAge: 1000 * 60 * 60 * 8,
  },
}));

app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, message: 'Request blocked.' });
  next();
});

app.get('/api/projects', async (req, res) => {
  const limit = req.query.limit ? Math.min(Math.max(parseInt(req.query.limit, 10) || 0, 1), 50) : null;
  const projects = await loadProjects(limit);
  res.json({ projects });
});

app.post('/api/contact', async (req, res) => {
  const ip = req.socket.remoteAddress || 'local';
  if (!isLoopback(req) && contactLocked(ip)) {
    return res.status(429).json({ ok: false, message: 'Too many messages. Please try again later.' });
  }
  if (String(req.body.hp_leave_blank || '').trim()) {
    return res.json({ ok: true, message: "Message sent — thanks for reaching out. I'll reply soon." });
  }

  const name = clip(req.body.name, 100);
  const email = clip(req.body.email, 100);
  const subject = clip(req.body.subject, 255);
  const message = clip(req.body.message, 4000);

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, message: 'Please fill in your name, email and message.' });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ ok: false, message: 'Please enter a valid email address.' });
  }

  try {
    await pool.execute(
      'INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)',
      [name, email, subject, message]
    );
    if (!isLoopback(req)) recordContact(ip);
    res.json({ ok: true, message: "Message sent — thanks for reaching out. I'll reply soon." });
  } catch (err) {
    console.error('Contact insert failed:', err.message);
    res.status(500).json({ ok: false, message: 'Something went wrong. Please try again later.' });
  }
});

app.get('/api/admin/session', (req, res) => {
  if (!req.session.adminId) return res.json({ ok: false });
  res.json({ ok: true, name: req.session.adminName });
});

app.post('/api/admin/login', async (req, res) => {
  const username = String(req.body.username || '').trim().slice(0, 50);
  const password = String(req.body.password || '');

  if (!username || !password) {
    return res.status(400).json({ ok: false, message: 'Please enter both username and password.' });
  }

  const key = loginKey(req, username);
  if (loginLock(key)) {
    return res.status(429).json({
      ok: false,
      message: 'Too many attempts. Try again in 15 minutes.',
    });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, full_name, password FROM admins WHERE username = ? LIMIT 1',
      [username]
    );
    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin ? admin.password : DUMMY_HASH);
    if (!admin || !valid) {
      recordLoginFailure(key);
      return res.status(401).json({ ok: false, message: 'Incorrect username or password.' });
    }

    loginAttempts.delete(key);
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ ok: false, message: 'Something went wrong. Please try again later.' });
      }
      req.session.adminId = admin.id;
      req.session.adminName = admin.full_name;
      res.json({ ok: true, name: admin.full_name });
    });
  } catch (err) {
    console.error('Login failed:', err.message);
    res.status(500).json({ ok: false, message: 'Something went wrong. Please try again later.' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('portfolio.sid');
    res.json({ ok: true });
  });
});

app.post('/api/admin/setup', async (req, res) => {
  try {
    if (await adminExists()) {
      return res.status(404).json({ ok: false, message: 'Not found.' });
    }
  } catch (err) {
    console.error('Admin setup check failed:', err.message);
    return res.status(500).json({ ok: false, message: 'Something went wrong. Please try again later.' });
  }

  const fullName = clip(req.body.full_name, 100);
  const username = clip(req.body.username, 50);
  const email = clip(req.body.email, 100);
  const password = String(req.body.password || '').slice(0, 128);

  const weak = passwordProblem(password);
  if (!fullName || !username || weak) {
    return res.status(400).json({
      ok: false,
      message: weak || 'Fill in all fields.',
    });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const [existing] = await pool.execute('SELECT id FROM admins WHERE username = ? LIMIT 1', [username]);
    if (existing.length) {
      await pool.execute(
        'UPDATE admins SET full_name = ?, email = ?, password = ? WHERE username = ?',
        [fullName, email, hash, username]
      );
    } else {
      await pool.execute(
        'INSERT INTO admins (full_name, username, email, password) VALUES (?, ?, ?, ?)',
        [fullName, username, email, hash]
      );
    }
    res.json({ ok: true, message: 'Admin account saved. You can now log in.' });
  } catch (err) {
    console.error('Admin setup failed:', err.message);
    res.status(500).json({ ok: false, message: 'Something went wrong. Please try again later.' });
  }
});

app.get('/api/admin/messages', requireAdmin, async (req, res) => {
  try {
    const [messages] = await pool.query(
      'SELECT id, name, email, subject, message, created_at FROM contacts ORDER BY created_at DESC'
    );
    res.json({
      ok: true,
      name: req.session.adminName,
      messages: messages.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        subject: m.subject || '',
        message: m.message || '',
        received: formatDate(m.created_at),
      })),
    });
  } catch (err) {
    console.error('Inbox query failed:', err.message);
    res.status(500).json({ ok: false, message: 'Something went wrong. Please try again later.' });
  }
});

app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    const [[contactRow]] = await pool.query('SELECT COUNT(*) AS c FROM contacts');
    const [[projectRow]] = await pool.query('SELECT COUNT(*) AS c FROM projects');
    const [messages] = await pool.query(
      'SELECT id, name, email, subject, message, created_at FROM contacts ORDER BY created_at DESC LIMIT 15'
    );
    const [projects] = await pool.query(
      'SELECT id, title, technologies, created_at FROM projects ORDER BY created_at DESC'
    );

    res.json({
      ok: true,
      name: req.session.adminName,
      contactCount: contactRow.c,
      projectCount: projectRow.c,
      period: formatPeriod(),
      messages: messages.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        subject: m.subject || '',
        message: trimWidth(m.message, 120),
        received: formatDate(m.created_at),
      })),
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        technologies: p.technologies,
        added: formatDate(p.created_at),
      })),
    });
  } catch (err) {
    console.error('Dashboard query failed:', err.message);
    res.status(500).json({ ok: false, message: 'Something went wrong. Please try again later.' });
  }
});

app.post('/api/admin/projects', requireAdmin, async (req, res) => {
  const title = clip(req.body.title, 255);
  const description = clip(req.body.description, 5000);
  const technologies = clip(req.body.technologies, 255);
  const github = clip(req.body.github, 255);
  const liveDemo = clip(req.body.live_demo, 255);

  if (!title || !description || !technologies) {
    return res.status(400).json({ ok: false, message: 'Title, description, and technologies are required.' });
  }

  try {
    await pool.execute(
      'INSERT INTO projects (title, description, technologies, github, live_demo) VALUES (?, ?, ?, ?, ?)',
      [title, description, technologies, github, liveDemo]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Add project failed:', err.message);
    res.status(500).json({ ok: false, message: 'Something went wrong. Please try again later.' });
  }
});

app.delete('/api/admin/projects/:id', requireAdmin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM projects WHERE id = ?', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete project failed:', err.message);
    res.status(500).json({ ok: false, message: 'Something went wrong. Please try again later.' });
  }
});

app.delete('/api/admin/contacts/:id', requireAdmin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM contacts WHERE id = ?', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete contact failed:', err.message);
    res.status(500).json({ ok: false, message: 'Something went wrong. Please try again later.' });
  }
});

const BLOCKED = new Set([
  '/server.js',
  '/package.json',
  '/package-lock.json',
  '/portfolio.sql',
  '/readme.md',
  '/.gitignore',
  '/.htaccess',
]);

function hiddenFile(reqPath) {
  let decoded = reqPath;
  try {
    decoded = decodeURIComponent(reqPath);
  } catch (_) {
    return true;
  }
  const lower = decoded.toLowerCase();
  if (lower.includes('..') || lower.includes('\\')) return true;
  if (BLOCKED.has(lower)) return true;
  if (lower.startsWith('/node_modules') || lower.startsWith('/private')) return true;
  if (lower.startsWith('/.')) return true;
  if (/\.(sql|env|log|md)$/.test(lower)) return true;
  return false;
}

app.use(async (req, res, next) => {
  if (hiddenFile(req.path)) return res.status(404).send('Not found');

  const page = req.path.toLowerCase().replace(/\/+$/, '') || '/';
  if (page === '/admin/create-admin' || page === '/admin/create-admin.html') {
    try {
      if (await adminExists()) return res.status(404).send('Not found');
    } catch (err) {
      console.error('Setup page check failed:', err.message);
      return res.status(404).send('Not found');
    }
  }

  if (page === '/admin/dashboard' || page === '/admin/dashboard.html' || page === '/admin/inbox' || page === '/admin/inbox.html') {
    if (!req.session.adminId) return res.redirect('/admin/login.html');
  }
  next();
});

app.use(express.static(ROOT, { index: 'index.html', extensions: ['html'], dotfiles: 'deny' }));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const badJson = err instanceof SyntaxError && err.status === 400;
  if (!badJson) console.error('Request failed:', err.message);
  const status = badJson ? 400 : 500;
  res.status(status).json({
    ok: false,
    message: badJson ? 'Request could not be read.' : 'Something went wrong. Please try again later.',
  });
});

ensureSchema()
  .catch((err) => console.error('Database setup failed:', err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Portfolio running at http://localhost:${PORT}`);
    });
  });
