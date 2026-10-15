# Priyansu Shrestha — Portfolio

The same drafting-table portfolio — blueprint grid, sheet numbers, dimension lines, and a revision-history table — now as a static HTML, CSS, and JavaScript site with a Node.js backend. MySQL is unchanged, and the admin panel still manages projects and contact messages.

## What's included

- `index.html`, `about.html`, `projects.html`, `contact.html` — public site
- `assets/css/style.css` — the full design system
- `assets/js/script.js` — typing effect, mobile nav, scroll reveal
- `assets/js/app.js` — loads projects and talks to the API
- `server.js` — Node.js / Express API and static file server
- `portfolio.sql` — database schema (admins, projects, contacts, skills, education, experience, social_links)
- `admin/` — password-protected admin panel

## Setup (local)

1. Start MySQL (XAMPP is fine). Import `portfolio.sql` in phpMyAdmin if `portfolio_db` does not exist yet.
2. The database connection in `server.js` uses the local XAMPP MySQL database `portfolio_db`.
3. From this folder, install and start:

```
npm install
npm start
```

4. Open `http://localhost:8080/`.
5. The first admin account is created from this computer only, and only while the `admins` table is empty. After that, the setup page and setup API answer as if they are not there.
6. Log in with Alt+Shift+A on a public page, or open `http://localhost:8080/admin/login.html` directly.

Existing admin accounts created by the old PHP site still work. PHP `password_hash` bcrypt hashes are compatible.

## Admin panel

From the dashboard you can:

- View and delete contact form submissions
- Add new projects (title, description, tech tags, GitHub/live links)
- Delete existing projects

The public Projects page and the homepage "Selected work" section read from the `projects` table. If that table is empty, the pages show the same sample projects as before.
