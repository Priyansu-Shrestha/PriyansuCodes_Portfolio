// ============================================================
// Priyansu Shrestha — Portfolio interactions
// ============================================================

function setupReveal() {
  const revealTargets = document.querySelectorAll('.project-card, .skill-group, .about-content, .rev-table tr');
  if (!('IntersectionObserver' in window) || !revealTargets.length) return;

  const pending = [];
  revealTargets.forEach((el) => {
    if (el.dataset.revealReady) return;
    el.dataset.revealReady = '1';
    el.classList.add('reveal-pending');
    pending.push(el);
  });
  if (!pending.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  pending.forEach((el) => {
    const siblings = el.parentElement ? [...el.parentElement.children] : [];
    const index = Math.max(0, siblings.indexOf(el));
    el.style.transitionDelay = `${Math.min(index, 6) * 70}ms`;
    io.observe(el);
  });
}

function showToast(text) {
  let toast = document.querySelector('.sheet-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'sheet-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toast._hide);
  toast._hide = setTimeout(() => toast.classList.remove('show'), 1800);
}

function mountChrome() {
  if (!document.querySelector('.sheet-progress')) {
    const bar = document.createElement('div');
    bar.className = 'sheet-progress';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<span></span>';
    document.body.appendChild(bar);
  }
  if (!document.querySelector('.to-top')) {
    const top = document.createElement('button');
    top.type = 'button';
    top.className = 'to-top';
    top.setAttribute('aria-label', 'Back to top');
    top.textContent = '↑';
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(top);
  }
}

function onScroll() {
  const scrolled = window.scrollY || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = height > 0 ? Math.min(1, scrolled / height) : 0;
  const fill = document.querySelector('.sheet-progress span');
  if (fill) fill.style.width = `${ratio * 100}%`;
  document.querySelector('nav')?.classList.toggle('scrolled', scrolled > 12);
  const toTop = document.querySelector('.to-top');
  if (toTop) {
    const visible = scrolled > 480;
    toTop.classList.toggle('show', visible);
    toTop.tabIndex = visible ? 0 : -1;
    toTop.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }
  markNav();
}

function markNav() {
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  let current = file === '' ? 'index.html#home' : file;
  if (current === 'index.html') {
    const skills = document.getElementById('skills');
    const skillsInView = skills && skills.getBoundingClientRect().top < 160;
    current = skillsInView ? 'index.html#skills' : 'index.html#home';
  }
  document.querySelectorAll('.nav-links a:not(.btn-nav)').forEach((link) => {
    const href = (link.getAttribute('href') || '').replace(/^\.\.\//, '');
    link.classList.toggle('active', href === current);
  });
  document.querySelectorAll('.nav-links a.btn-nav').forEach((link) => {
    const href = (link.getAttribute('href') || '').replace(/^\.\.\//, '');
    link.classList.toggle('active', href === 'cv.html');
  });
}

function countStats() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.hero-stats b').forEach((el) => {
    const match = el.textContent.trim().match(/^(\d+)(.*)$/);
    if (!match) return;
    const target = Number(match[1]);
    const suffix = match[2];
    if (reduced) return;
    const start = performance.now();
    const duration = 900;
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    el.textContent = '0' + suffix;
    requestAnimationFrame(frame);
  });
}

function mountProjectTools() {
  const grid = document.getElementById('allProjects');
  if (!grid || document.getElementById('projectTools')) return;
  const tools = document.createElement('div');
  tools.id = 'projectTools';
  tools.className = 'project-tools';
  tools.innerHTML = `
    <label class="project-search">
      <span>Search the sheet</span>
      <input type="search" id="projectSearch" placeholder="Title, stack, or description">
    </label>
    <div class="filter-row" id="projectFilters"></div>`;
  const empty = document.createElement('p');
  empty.id = 'filterEmpty';
  empty.className = 'filter-empty';
  empty.hidden = true;
  empty.textContent = 'No drawings match that filter.';
  grid.before(tools);
  grid.after(empty);
  document.getElementById('projectSearch').addEventListener('input', applyProjectFilter);
  document.getElementById('projectFilters').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    document.querySelectorAll('#projectFilters button').forEach((item) => {
      item.classList.toggle('on', item === button);
    });
    applyProjectFilter();
  });
}

function refreshProjectFilters() {
  mountProjectTools();
  const row = document.getElementById('projectFilters');
  const grid = document.getElementById('allProjects');
  if (!row || !grid) return;
  const tags = new Set();
  grid.querySelectorAll('.tag-row span').forEach((tag) => {
    const name = tag.textContent.trim();
    if (name) tags.add(name);
  });
  const current = row.querySelector('button.on')?.dataset.tag || 'All';
  row.replaceChildren();
  ['All', ...[...tags].sort((a, b) => a.localeCompare(b))].forEach((tag) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.tag = tag;
    button.textContent = tag;
    if (tag === current) button.classList.add('on');
    row.appendChild(button);
  });
  if (!row.querySelector('button.on')) row.querySelector('button')?.classList.add('on');
  applyProjectFilter();
}

function applyProjectFilter() {
  const grid = document.getElementById('allProjects');
  if (!grid) return;
  const query = (document.getElementById('projectSearch')?.value || '').trim().toLowerCase();
  const tag = document.querySelector('#projectFilters button.on')?.dataset.tag || 'All';
  let shown = 0;
  grid.querySelectorAll('.project-card').forEach((card) => {
    const text = card.textContent.toLowerCase();
    const tags = [...card.querySelectorAll('.tag-row span')].map((item) => item.textContent.trim());
    const match = (!query || text.includes(query)) && (tag === 'All' || tags.includes(tag));
    card.hidden = !match;
    if (match) shown += 1;
  });
  const empty = document.getElementById('filterEmpty');
  if (empty) empty.hidden = shown !== 0;
  grid.hidden = shown === 0;
}

window.refreshProjectFilters = refreshProjectFilters;

function mountContactExtras() {
  document.querySelectorAll('.contact-line').forEach((line) => {
    const label = line.querySelector('b');
    const value = line.querySelector('span');
    if (!label || !value || label.textContent.trim().toLowerCase() !== 'email') return;
    if (line.querySelector('.copy-btn')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-btn';
    button.textContent = 'Copy';
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(value.textContent.trim());
        button.textContent = 'Copied';
        showToast('Email copied to clipboard');
        setTimeout(() => { button.textContent = 'Copy'; }, 1400);
      } catch (_) {
        showToast('Could not copy the email');
      }
    });
    line.appendChild(button);
  });

  const message = document.querySelector('#contactForm textarea');
  if (message && !document.querySelector('.char-count')) {
    const count = document.createElement('div');
    count.className = 'char-count';
    count.textContent = '0 characters';
    message.insertAdjacentElement('afterend', count);
    message.addEventListener('input', () => {
      const n = message.value.length;
      count.textContent = `${n} character${n === 1 ? '' : 's'}`;
    });
  }
}

function mountScanLine() {
  document.querySelectorAll('.portrait').forEach((frame) => {
    if (frame.querySelector('.scan')) return;
    const scan = document.createElement('span');
    scan.className = 'scan';
    scan.setAttribute('aria-hidden', 'true');
    frame.appendChild(scan);
  });
}

window.setupReveal = setupReveal;

document.addEventListener('DOMContentLoaded', () => {

  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---- Mobile nav toggle ---- */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  /* ---- Typing role line on the hero ---- */
  const typingEl = document.getElementById('typing');
  if (typingEl) {
    const roles = [
      'Full Stack Developer',
      'PHP & MySQL Developer',
      'BSc (Hons) IT Student',
      'Former Civil Engineering Student'
    ];
    let roleIndex = 0, charIndex = 0, deleting = false;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function tick() {
      const current = roles[roleIndex];
      if (!deleting) {
        charIndex++;
        typingEl.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          deleting = true;
          setTimeout(tick, 1400);
          return;
        }
      } else {
        charIndex--;
        typingEl.textContent = current.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          roleIndex = (roleIndex + 1) % roles.length;
        }
      }
      setTimeout(tick, deleting ? 35 : 65);
    }

    if (prefersReduced) {
      typingEl.textContent = roles[0];
    } else {
      tick();
    }
  }

  document.getElementById('printCv')?.addEventListener('click', () => window.print());

  mountChrome();
  mountScanLine();
  mountContactExtras();
  countStats();
  refreshProjectFilters();
  setupReveal();
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  document.addEventListener('keydown', (event) => {
    const gate = document.querySelector('.admin-gate');
    if (!gate) return;
    const typing = event.target instanceof HTMLElement
      && event.target.matches('input, textarea, select, [contenteditable="true"]');
    if (typing) return;
    if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      window.location.href = gate.getAttribute('href');
    }
  });

});
