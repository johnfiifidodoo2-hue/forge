// ============================================================
// Forge — Client-side Application Logic
// ============================================================

const API_BASE = '/api';
const DEMO_PASSWORD = 'Password123!';

const state = {
  token: localStorage.getItem('forge_token') || null,
  user: JSON.parse(localStorage.getItem('forge_user') || 'null'),
  activeTab: 'dashboard',
  activeCategory: '',
  ideaScope: 'all',        // all | mine
  ideaSort: 'newest',      // newest | upvotes | comments
  resFilter: 'all',        // all | saved
  savedResources: JSON.parse(localStorage.getItem('forge_saved_resources') || '[]'),
  experts: [],
  selectedExpert: null,
  searchDebounce: null,
  notifications: [],
  unreadNotifs: 0,
  notifTimer: null,
};

// ---------- Helpers ----------

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
  toast.classList.remove('hidden');
  if (toast._timeout) clearTimeout(toast._timeout);
  if (toast._outTimeout) clearTimeout(toast._outTimeout);

  toast._outTimeout = setTimeout(() => {
    toast.classList.add('toast-out');
    toast._timeout = setTimeout(() => {
      toast.classList.add('hidden');
      toast.classList.remove('toast-out');
    }, 300);
  }, 2700);
}

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nameGradient(name) {
  if (!name) return 'linear-gradient(135deg, #f97316, #8b5cf6)';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 45 + (Math.abs(hash >> 8) % 45)) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 75%, 55%), hsl(${hue2}, 70%, 50%))`;
}

function staggerDelay(index) {
  return `animation-delay: ${index * 50}ms;`;
}

function debounceSearch(fn, delay = 300) {
  clearTimeout(state.searchDebounce);
  state.searchDebounce = setTimeout(fn, delay);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && state.token) {
      clearSession();
      renderAuthState();
    }
    throw new Error(data.error || 'Something went wrong.');
  }
  return data;
}

// ---------- Skeleton Loaders ----------

function skeletonCards(count, type = 'idea') {
  const cards = [];
  for (let i = 0; i < count; i++) {
    if (type === 'idea') {
      cards.push(`
        <div class="glass-card skeleton-card card-animated" style="${staggerDelay(i)}">
          <div class="flex justify-between gap-md">
            <div style="flex:1;">
              <div class="skeleton skeleton-line" style="width:65%;"></div>
              <div class="skeleton skeleton-line" style="width:100%;margin-top:8px;"></div>
              <div class="skeleton skeleton-line" style="width:40%;margin-top:4px;"></div>
            </div>
            <div class="skeleton" style="width:36px;height:36px;border-radius:999px;"></div>
          </div>
        </div>
      `);
    } else if (type === 'resource') {
      cards.push(`
        <div class="glass-card skeleton-card card-animated" style="${staggerDelay(i)}">
          <div class="skeleton skeleton-line" style="width:80px;height:22px;border-radius:999px;"></div>
          <div class="skeleton skeleton-line" style="width:75%;margin-top:16px;"></div>
          <div class="skeleton skeleton-line" style="width:100%;margin-top:8px;"></div>
        </div>
      `);
    } else if (type === 'expert') {
      cards.push(`
        <div class="glass-card skeleton-card card-animated flex-col items-center" style="${staggerDelay(i)}; display:flex;">
          <div class="skeleton" style="width:56px;height:56px;border-radius:999px;"></div>
          <div class="skeleton skeleton-line" style="width:100px;margin-top:16px;"></div>
        </div>
      `);
    }
  }
  return cards.join('');
}

// ---------- Session & Auth ----------

function saveSession(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem('forge_token', token);
  localStorage.setItem('forge_user', JSON.stringify(user));
}

function clearSession() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('forge_token');
  localStorage.removeItem('forge_user');
  if (state.notifTimer) clearInterval(state.notifTimer);
}

async function validateSession() {
  if (!state.token) return false;
  try {
    const { user } = await api('/auth/me');
    saveSession(user, state.token);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

function renderAuthState() {
  const authScreen = document.getElementById('authScreen');
  const appScreen = document.getElementById('appScreen');

  if (state.user && state.token) {
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');

    document.getElementById('navUserName').textContent = state.user.name;
    document.getElementById('navUserRole').textContent =
      state.user.role === 'EXPERT' ? 'Expert Mentor' : 'Creator';

    const avatar = document.getElementById('navAvatar');
    avatar.textContent = initials(state.user.name);
    avatar.style.background = nameGradient(state.user.name);

    document.getElementById('dashUserName').textContent = state.user.name.split(' ')[0];

    loadActiveTab();
    fetchNotifications();
    startNotifPolling();
  } else {
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
  }
}

document.getElementById('loginTabBtn').addEventListener('click', () => {
  document.getElementById('loginTabBtn').classList.add('active');
  document.getElementById('signupTabBtn').classList.remove('active');
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('signupForm').classList.add('hidden');
});

document.getElementById('signupTabBtn').addEventListener('click', () => {
  document.getElementById('signupTabBtn').classList.add('active');
  document.getElementById('loginTabBtn').classList.remove('active');
  document.getElementById('signupForm').classList.remove('hidden');
  document.getElementById('loginForm').classList.add('hidden');
});

function showAuthError(message) {
  const el = document.getElementById('authError');
  el.textContent = message;
  el.classList.remove('hidden');
}

async function performLogin(email, password) {
  document.getElementById('authError').classList.add('hidden');
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  saveSession(data.user, data.token);
  renderAuthState();
  showToast(`Welcome back, ${data.user.name.split(' ')[0]}!`);
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    await performLogin(email, password);
  } catch (err) {
    showAuthError(err.message);
  }
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  document.getElementById('authError').classList.add('hidden');
  try {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole').value;
    const data = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    saveSession(data.user, data.token);
    renderAuthState();
    showToast('Account created — welcome to Forge!');
  } catch (err) {
    showAuthError(err.message);
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearSession();
  renderAuthState();
});

// ---------- Notifications ----------

async function fetchNotifications() {
  if (!state.token) return;
  try {
    const { notifications, unreadCount } = await api('/notifications');
    state.notifications = notifications || [];
    state.unreadNotifs = unreadCount || 0;
    renderNotifBadge();
    renderNotifMenu();
  } catch {
    // ignore
  }
}

function startNotifPolling() {
  if (state.notifTimer) clearInterval(state.notifTimer);
  state.notifTimer = setInterval(fetchNotifications, 15000);
}

function renderNotifBadge() {
  const badge = document.getElementById('notifBadge');
  if (state.unreadNotifs > 0) {
    badge.textContent = state.unreadNotifs;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderNotifMenu() {
  const list = document.getElementById('notifList');
  if (!state.notifications.length) {
    list.innerHTML = '<p class="empty-notif">No notifications yet</p>';
    return;
  }

  list.innerHTML = state.notifications
    .map(
      (n) => `
    <div class="notif-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}">
      <p class="notif-msg">${escapeHtml(n.message)}</p>
      <p class="notif-time">${timeAgo(n.createdAt)}</p>
    </div>`
    )
    .join('');

  list.querySelectorAll('.notif-item').forEach((item) => {
    item.addEventListener('click', async () => {
      const id = item.dataset.notifId;
      try {
        await api(`/notifications/${id}/read`, { method: 'PATCH' });
        fetchNotifications();
      } catch {
        // ignore
      }
    });
  });
}

document.getElementById('notifBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('notifMenu').classList.toggle('hidden');
});

document.getElementById('markAllReadBtn').addEventListener('click', async () => {
  try {
    await api('/notifications/read-all', { method: 'PATCH' });
    fetchNotifications();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.addEventListener('click', (e) => {
  const wrapper = document.querySelector('.notif-dropdown-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    document.getElementById('notifMenu').classList.add('hidden');
  }
});

// ---------- Profile Modal ----------

function openProfileModal() {
  const bio = state.user.bio || '';
  const skills = Array.isArray(state.user.skills)
    ? state.user.skills.join(', ')
    : state.user.skills || '';
  const portfolioUrl = state.user.portfolioUrl || '';

  document.getElementById('profileBio').value = bio;
  document.getElementById('profileSkills').value = skills;
  document.getElementById('profilePortfolioUrl').value = portfolioUrl;
  document.getElementById('profileModal').classList.remove('hidden');
}

document.getElementById('profileBtn').addEventListener('click', openProfileModal);
document.getElementById('openProfileFromDash').addEventListener('click', openProfileModal);
document.getElementById('closeProfileModal').addEventListener('click', () => {
  document.getElementById('profileModal').classList.add('hidden');
});
document.getElementById('profileModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) document.getElementById('profileModal').classList.add('hidden');
});

document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const bio = document.getElementById('profileBio').value;
    const skills = document.getElementById('profileSkills').value;
    const portfolioUrl = document.getElementById('profilePortfolioUrl').value;

    const { user } = await api('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ bio, skills, portfolioUrl }),
    });
    saveSession(user, state.token);
    document.getElementById('profileModal').classList.add('hidden');
    showToast('Profile updated successfully!');
  } catch (err) {
    showToast(err.message, true);
  }
});

// ---------- Navigation ----------

function setActiveTabStyles() {
  document.querySelectorAll('.sidebar-link').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === state.activeTab);
  });
  document.querySelectorAll('.mobile-tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === state.activeTab);
  });
}

function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.add('hidden'));
  const activePanel = document.getElementById(`tab-${state.activeTab}`);
  activePanel.classList.remove('hidden');

  activePanel.style.animation = 'none';
  activePanel.offsetHeight;
  activePanel.style.animation = '';

  setActiveTabStyles();
  loadActiveTab();
}

document.querySelectorAll('.sidebar-link, .mobile-tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.querySelectorAll('.quick-action-btn[data-goto]').forEach((btn) => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.goto);
    if (btn.dataset.action === 'new-idea') {
      document.getElementById('ideaForm').classList.remove('hidden');
    }
    if (btn.dataset.action === 'new-resource') {
      document.getElementById('resourceForm').classList.remove('hidden');
    }
  });
});

function loadActiveTab() {
  setActiveTabStyles();
  if (state.activeTab === 'dashboard') {
    loadDashboard();
    loadActivityFeed();
  }
  if (state.activeTab === 'ideatank') loadProjects();
  if (state.activeTab === 'resources') loadResources();
  if (state.activeTab === 'bookings') {
    loadExperts();
    loadMyBookings();
  }
}

// Global search input in top bar
document.getElementById('globalSearch').addEventListener('input', (e) => {
  const query = e.target.value.trim();
  if (!query) return;
  debounceSearch(() => {
    if (state.activeTab === 'ideatank') {
      document.getElementById('ideaSearch').value = query;
      loadProjects();
    } else if (state.activeTab === 'resources') {
      document.getElementById('resourceSearch').value = query;
      loadResources();
    } else if (state.activeTab === 'bookings') {
      document.getElementById('expertSearch').value = query;
      loadExperts();
    }
  });
});

// Keyboard Shortcuts (Ctrl+K and Esc)
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    document.getElementById('globalSearch').focus();
  }
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.add('hidden'));
    document.getElementById('notifMenu').classList.add('hidden');
  }
});

// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboard() {
  const statsGrid = document.getElementById('statsGrid');
  const recentList = document.getElementById('recentIdeasList');
  statsGrid.innerHTML = skeletonCards(4, 'resource');
  recentList.innerHTML = '<p class="text-tertiary text-sm">Loading...</p>';

  try {
    const { stats, recentProjects } = await api('/dashboard/stats');

    const statItems = [
      { label: 'Your Projects', value: stats.myProjects, accent: true },
      { label: 'Resources Shared', value: stats.myResources },
      { label: 'Sessions Scheduled', value: stats.myBookings },
      { label: 'Pending Requests', value: stats.pendingBookings },
      { label: 'Community Ideas', value: stats.communityIdeas },
      { label: 'Shared Resources', value: stats.communityResources },
      { label: 'Available Mentors', value: stats.availableExperts },
      { label: 'Your Comments', value: stats.myComments },
    ];

    statsGrid.innerHTML = statItems
      .slice(0, 4)
      .map(
        (s) => `
      <div class="stat-card ${s.accent ? 'accent' : ''} card-animated">
        <div class="stat-value" data-target="${s.value}">0</div>
        <div class="stat-label">${s.label}</div>
      </div>`
      )
      .join('');

    // Count-up animation
    statsGrid.querySelectorAll('.stat-value').forEach((el) => {
      const target = parseInt(el.dataset.target, 10);
      let count = 0;
      const step = Math.max(1, Math.ceil(target / 15));
      const timer = setInterval(() => {
        count += step;
        if (count >= target) {
          el.textContent = target;
          clearInterval(timer);
        } else {
          el.textContent = count;
        }
      }, 30);
    });

    if (!recentProjects.length) {
      recentList.innerHTML = '<p class="text-tertiary text-sm">No ideas yet — be the first to pitch!</p>';
      return;
    }

    recentList.innerHTML = recentProjects
      .map(
        (p) => `
      <div class="recent-item" data-goto-ideas>
        <div>
          <div class="recent-item-title">${escapeHtml(p.title)}</div>
          <div class="recent-item-meta">by ${escapeHtml(p.author?.name || 'Unknown')}</div>
        </div>
        <div class="recent-item-stats">
          <span class="material-symbols-outlined icon-inline">thumb_up</span> ${p.upvoteCount} · <span class="material-symbols-outlined icon-inline">chat_bubble</span> ${p.commentCount}
        </div>
      </div>`
      )
      .join('');

    recentList.querySelectorAll('[data-goto-ideas]').forEach((el) => {
      el.addEventListener('click', () => switchTab('ideatank'));
    });
  } catch (err) {
    statsGrid.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

async function loadActivityFeed() {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;
  feed.innerHTML = '<p class="text-tertiary text-sm">Loading activity...</p>';
  try {
    const { activities } = await api('/dashboard/activity');
    if (!activities || !activities.length) {
      feed.innerHTML = '<p class="text-tertiary text-sm">No recent platform activity.</p>';
      return;
    }

    feed.innerHTML = activities
      .map(
        (act) => `
      <div class="activity-item">
        <span class="activity-icon">${act.icon}</span>
        <span class="activity-text">${escapeHtml(act.text)}</span>
        <span class="activity-time">${timeAgo(act.time)}</span>
      </div>`
      )
      .join('');
  } catch {
    feed.innerHTML = '<p class="text-tertiary text-sm">Could not load activity feed.</p>';
  }
}

// ============================================================
// IDEA TANK
// ============================================================

document.getElementById('newIdeaBtn').addEventListener('click', () => {
  document.getElementById('ideaForm').classList.toggle('hidden');
});
document.getElementById('cancelIdeaBtn').addEventListener('click', () => {
  document.getElementById('ideaForm').classList.add('hidden');
});

document.getElementById('ideaSearch').addEventListener('input', () => {
  debounceSearch(loadProjects);
});

// Idea scope buttons (All vs My Ideas)
document.getElementById('scopeAllIdeasBtn').addEventListener('click', () => {
  state.ideaScope = 'all';
  document.getElementById('scopeAllIdeasBtn').classList.add('active');
  document.getElementById('scopeMyIdeasBtn').classList.remove('active');
  loadProjects();
});

document.getElementById('scopeMyIdeasBtn').addEventListener('click', () => {
  state.ideaScope = 'mine';
  document.getElementById('scopeMyIdeasBtn').classList.add('active');
  document.getElementById('scopeAllIdeasBtn').classList.remove('active');
  loadProjects();
});

// Idea sort select
document.getElementById('ideaSortSelect').addEventListener('change', (e) => {
  state.ideaSort = e.target.value;
  loadProjects();
});

document.getElementById('ideaForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const title = document.getElementById('ideaTitle').value;
    const description = document.getElementById('ideaDescription').value;
    const tags = document.getElementById('ideaTags').value;
    await api('/ideatank/projects', { method: 'POST', body: JSON.stringify({ title, description, tags }) });
    document.getElementById('ideaForm').reset();
    document.getElementById('ideaForm').classList.add('hidden');
    showToast('Idea published!');
    loadProjects();
  } catch (err) {
    showToast(err.message, true);
  }
});

async function loadProjects() {
  const feed = document.getElementById('ideaFeed');
  feed.innerHTML = skeletonCards(3, 'idea');
  try {
    const search = document.getElementById('ideaSearch')?.value?.trim() || '';
    const params = new URLSearchParams();

    if (search) params.set('search', search);
    if (state.ideaSort) params.set('sort', state.ideaSort);
    if (state.ideaScope === 'mine') params.set('mine', 'true');

    const query = params.toString() ? `?${params}` : '';
    const { projects } = await api(`/ideatank/projects${query}`);

    if (!projects.length) {
      feed.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><span class="material-symbols-outlined empty-icon">lightbulb</span></div>
          <p>${search ? 'No ideas match your search.' : 'No ideas in this view yet. Be the first to pitch one!'}</p>
        </div>`;
      return;
    }

    feed.innerHTML = projects.map((p, i) => renderProjectCard(p, i)).join('');
    wireProjectEvents(projects);
  } catch (err) {
    feed.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

function wireProjectEvents(projects) {
  projects.forEach((p) => {
    const toggleBtn = document.getElementById(`toggle-comments-${p.id}`);
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.getElementById(`comments-${p.id}`).classList.toggle('hidden');
      });
    }

    const upvoteBtn = document.getElementById(`upvote-${p.id}`);
    if (upvoteBtn) {
      upvoteBtn.addEventListener('click', async () => {
        try {
          const { upvoteCount, hasUpvoted } = await api(`/ideatank/projects/${p.id}/upvote`, {
            method: 'POST',
          });
          upvoteBtn.classList.toggle('active', hasUpvoted);
          upvoteBtn.innerHTML = `<span class="material-symbols-outlined icon-inline">thumb_up</span> ${upvoteCount}`;
          showToast(hasUpvoted ? 'Interest recorded!' : 'Upvote removed');
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    const form = document.getElementById(`comment-form-${p.id}`);
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById(`comment-input-${p.id}`);
        const content = input.value.trim();
        if (!content) return;
        try {
          await api(`/ideatank/projects/${p.id}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content }),
          });
          input.value = '';
          loadProjects();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }
  });
}

function renderProjectCard(p, index) {
  const tags = (p.tags || [])
    .map((t) => `<span class="tag-pill">#${escapeHtml(t)}</span>`)
    .join('');

  const comments = (p.comments || [])
    .map(
      (c) => `
      <div class="comment-item">
        <div class="avatar avatar-sm shrink-0" style="background:${nameGradient(c.author?.name)}">${initials(c.author?.name)}</div>
        <div>
          <span class="comment-author">${escapeHtml(c.author?.name || 'Unknown')}</span>
          <span class="comment-text">${escapeHtml(c.content)}</span>
        </div>
      </div>`
    )
    .join('');

  return `
  <div class="glass-card idea-card card-animated" style="${staggerDelay(index)}">
    <div class="idea-card-header">
      <div class="idea-card-body">
        <h3 class="idea-title">${escapeHtml(p.title)}</h3>
        <p class="idea-description">${escapeHtml(p.description)}</p>
      </div>
      <div class="idea-author text-right">
        <div class="avatar" style="background:${nameGradient(p.author?.name)}">${initials(p.author?.name)}</div>
        <p class="text-xs text-tertiary" style="margin-top:4px;">${escapeHtml(p.author?.name || '')}</p>
      </div>
    </div>

    ${tags ? `<div class="tags-row">${tags}</div>` : ''}

    <div class="idea-footer">
      <div class="flex gap-sm items-center">
        <button id="upvote-${p.id}" class="upvote-btn ${p.hasUpvoted ? 'active' : ''}"><span class="material-symbols-outlined icon-inline">thumb_up</span> ${p.upvoteCount || 0}</button>
        <button id="toggle-comments-${p.id}" class="btn-ghost text-xs">
          <span class="material-symbols-outlined icon-inline">chat_bubble</span> ${p.commentCount} comment${p.commentCount === 1 ? '' : 's'}
        </button>
      </div>
      <span class="text-xs text-tertiary">${formatDate(p.createdAt)}</span>
    </div>

    <div id="comments-${p.id}" class="comments-section hidden">
      ${comments || '<p class="text-xs text-tertiary">No comments yet.</p>'}
      <form id="comment-form-${p.id}" class="comment-form">
        <input id="comment-input-${p.id}" placeholder="Add a comment..." class="form-input" />
        <button type="submit" class="btn btn-primary" style="padding:6px 14px;font-size:12px;">Post</button>
      </form>
    </div>
  </div>`;
}

// ============================================================
// RESOURCE EXCHANGE
// ============================================================

document.getElementById('newResourceBtn').addEventListener('click', () => {
  document.getElementById('resourceForm').classList.toggle('hidden');
});
document.getElementById('cancelResourceBtn').addEventListener('click', () => {
  document.getElementById('resourceForm').classList.add('hidden');
});

document.getElementById('resourceSearch').addEventListener('input', () => {
  debounceSearch(loadResources);
});

document.getElementById('resFilterAllBtn').addEventListener('click', () => {
  state.resFilter = 'all';
  document.getElementById('resFilterAllBtn').classList.add('active');
  document.getElementById('resFilterSavedBtn').classList.remove('active');
  loadResources();
});

document.getElementById('resFilterSavedBtn').addEventListener('click', () => {
  state.resFilter = 'saved';
  document.getElementById('resFilterSavedBtn').classList.add('active');
  document.getElementById('resFilterAllBtn').classList.remove('active');
  loadResources();
});

document.getElementById('resourceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const title = document.getElementById('resourceTitle').value;
    const description = document.getElementById('resourceDescription').value;
    const category = document.getElementById('resourceCategory').value;
    const downloadUrl = document.getElementById('resourceUrl').value;
    await api('/resources', { method: 'POST', body: JSON.stringify({ title, description, category, downloadUrl }) });
    document.getElementById('resourceForm').reset();
    document.getElementById('resourceForm').classList.add('hidden');
    showToast('Resource shared!');
    loadResources();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.querySelectorAll('.cat-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.activeCategory = btn.dataset.category;
    document.querySelectorAll('.cat-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.category === state.activeCategory);
    });
    loadResources();
  });
});

const CATEGORY_LABELS = {
  UI_KIT: 'UI Kit',
  CODE_SNIPPET: 'Code Snippet',
  TEMPLATE: 'Template',
  GUIDE: 'Guide',
  TOOL: 'Tool',
};

const CATEGORY_CSS = {
  UI_KIT: 'ui-kit',
  CODE_SNIPPET: 'code-snippet',
  TEMPLATE: 'template',
  GUIDE: 'guide',
  TOOL: 'tool',
};

async function loadResources() {
  const grid = document.getElementById('resourceGrid');
  grid.innerHTML = skeletonCards(3, 'resource');

  // Update saved count badge
  document.getElementById('savedResCount').textContent = state.savedResources.length;

  try {
    const params = new URLSearchParams();
    if (state.activeCategory) params.set('category', state.activeCategory);
    const search = document.getElementById('resourceSearch')?.value?.trim();
    if (search) params.set('search', search);

    const query = params.toString() ? `?${params}` : '';
    let { resources } = await api(`/resources${query}`);

    if (state.resFilter === 'saved') {
      resources = resources.filter((r) => state.savedResources.includes(r.id));
    }

    if (!resources.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon"><span class="material-symbols-outlined empty-icon">inventory_2</span></div>
          <p>${state.resFilter === 'saved' ? 'No bookmarked resources yet.' : search ? 'No resources match search.' : 'No resources in this category yet.'}</p>
        </div>`;
      return;
    }

    grid.innerHTML = resources.map((r, i) => renderResourceCard(r, i)).join('');

    resources.forEach((r) => {
      const bBtn = document.getElementById(`bookmark-${r.id}`);
      if (bBtn) {
        bBtn.addEventListener('click', () => toggleBookmarkResource(r.id));
      }
    });
  } catch (err) {
    grid.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

function toggleBookmarkResource(resId) {
  const idx = state.savedResources.indexOf(resId);
  if (idx > -1) {
    state.savedResources.splice(idx, 1);
    showToast('Removed from bookmarks');
  } else {
    state.savedResources.push(resId);
    showToast('Saved to bookmarks');
  }
  localStorage.setItem('forge_saved_resources', JSON.stringify(state.savedResources));
  loadResources();
}

function renderResourceCard(r, index) {
  const cssClass = CATEGORY_CSS[r.category] || '';
  const isSaved = state.savedResources.includes(r.id);

  return `
  <div class="glass-card resource-card card-animated" style="${staggerDelay(index)}">
    <button id="bookmark-${r.id}" class="bookmark-btn ${isSaved ? 'active' : ''}" title="${isSaved ? 'Remove bookmark' : 'Bookmark'}">
      <span class="material-symbols-outlined bookmark-icon${isSaved ? ' filled' : ''}" style="font-size:18px;">star</span>
    </button>
    <span class="category-badge ${cssClass}">${CATEGORY_LABELS[r.category] || r.category}</span>
    <h3 class="resource-title">${escapeHtml(r.title)}</h3>
    <p class="resource-description">${escapeHtml(r.description)}</p>
    <div class="resource-footer">
      <span class="text-xs text-tertiary">by ${escapeHtml(r.uploader?.name || 'Unknown')}</span>
      <a href="${encodeURI(r.downloadUrl)}" target="_blank" rel="noopener noreferrer" class="btn-download">Open ↗</a>
    </div>
  </div>`;
}

// ============================================================
// EXPERT BOOKING & SESSIONS
// ============================================================

document.getElementById('expertSearch').addEventListener('input', () => {
  debounceSearch(loadExperts);
});

async function loadExperts() {
  const grid = document.getElementById('expertGrid');
  grid.innerHTML = skeletonCards(3, 'expert');
  try {
    const search = document.getElementById('expertSearch')?.value?.trim() || '';
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const { experts } = await api(`/bookings/experts${query}`);
    state.experts = experts;

    if (!experts.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon"><span class="material-symbols-outlined empty-icon">psychology</span></div>
          <p>${search ? 'No mentors match your search.' : 'No experts available yet.'}</p>
        </div>`;
      return;
    }
    grid.innerHTML = experts.map((e, i) => renderExpertCard(e, i)).join('');

    experts.forEach((expert) => {
      const btn = document.getElementById(`book-btn-${expert.id}`);
      if (btn) {
        btn.addEventListener('click', () => openBookingModal(expert));
      }
    });
  } catch (err) {
    grid.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

function renderExpertCard(expert, index) {
  const skills = (expert.skills || [])
    .slice(0, 4)
    .map((s) => `<span class="skill-pill">${escapeHtml(s)}</span>`)
    .join('');

  return `
  <div class="glass-card expert-card card-animated" style="${staggerDelay(index)}">
    <div class="avatar avatar-lg" style="background:${nameGradient(expert.name)}">${initials(expert.name)}</div>
    <h3 class="expert-name">${escapeHtml(expert.name)}</h3>
    <p class="expert-role">Verified Mentor</p>
    ${expert.bio ? `<p class="expert-bio">${escapeHtml(expert.bio)}</p>` : ''}
    ${skills ? `<div class="expert-skills">${skills}</div>` : ''}
    <button id="book-btn-${expert.id}" class="btn btn-primary w-full" style="margin-top:var(--space-md);">Book 1:1 Session</button>
  </div>`;
}

function openBookingModal(expert) {
  state.selectedExpert = expert;
  document.getElementById('bookingExpertName').textContent = expert.name;
  document.getElementById('bookingExpertBio').textContent = expert.bio || 'Select date and topic for your consultation.';
  document.getElementById('bookingModal').classList.remove('hidden');
}

document.getElementById('closeBookingModal').addEventListener('click', () => {
  document.getElementById('bookingModal').classList.add('hidden');
});
document.getElementById('bookingModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) document.getElementById('bookingModal').classList.add('hidden');
});

document.getElementById('bookingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const scheduledAt = document.getElementById('bookingDatetime').value;
    const title = document.getElementById('bookingTitle').value;
    await api('/bookings', {
      method: 'POST',
      body: JSON.stringify({ expertId: state.selectedExpert.id, scheduledAt, title }),
    });
    document.getElementById('bookingModal').classList.add('hidden');
    document.getElementById('bookingForm').reset();
    showToast('Booking requested successfully!');
    loadMyBookings();
  } catch (err) {
    showToast(err.message, true);
  }
});

async function updateBookingStatus(bookingId, status) {
  try {
    await api(`/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    showToast(`Booking ${status.toLowerCase()}`);
    loadMyBookings();
  } catch (err) {
    showToast(err.message, true);
  }
}

// Session Notes Modal
function openSessionNotesModal(booking) {
  document.getElementById('sessionNotesBookingId').value = booking.id;
  document.getElementById('sessionNotesText').value = booking.notes || '';
  document.getElementById('sessionNotesModal').classList.remove('hidden');
}

document.getElementById('closeSessionNotesModal').addEventListener('click', () => {
  document.getElementById('sessionNotesModal').classList.add('hidden');
});
document.getElementById('sessionNotesModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) document.getElementById('sessionNotesModal').classList.add('hidden');
});

document.getElementById('sessionNotesForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const bookingId = document.getElementById('sessionNotesBookingId').value;
  const notes = document.getElementById('sessionNotesText').value;

  try {
    await api(`/bookings/${bookingId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });
    document.getElementById('sessionNotesModal').classList.add('hidden');
    showToast('Session notes saved!');
    loadMyBookings();
  } catch (err) {
    showToast(err.message, true);
  }
});

async function loadMyBookings() {
  const list = document.getElementById('bookingList');
  list.innerHTML = skeletonCards(2, 'idea');
  try {
    const { bookings } = await api('/bookings/mine');
    if (!bookings.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><span class="material-symbols-outlined empty-icon">calendar_month</span></div>
          <p>No sessions scheduled yet. Browse available mentors above to request one.</p>
        </div>`;
      return;
    }
    list.innerHTML = bookings.map((b, i) => renderBookingRow(b, i)).join('');

    bookings.forEach((b) => {
      ['confirm', 'cancel', 'complete'].forEach((action) => {
        const btn = document.getElementById(`booking-${action}-${b.id}`);
        if (btn) {
          btn.addEventListener('click', () => {
            const statusMap = { confirm: 'CONFIRMED', cancel: 'CANCELLED', complete: 'COMPLETED' };
            updateBookingStatus(b.id, statusMap[action]);
          });
        }
      });

      const notesBtn = document.getElementById(`booking-notes-${b.id}`);
      if (notesBtn) {
        notesBtn.addEventListener('click', () => openSessionNotesModal(b));
      }
    });
  } catch (err) {
    list.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

function renderBookingRow(b, index) {
  const isMeExpert = b.expert.id === state.user.id;
  const counterpart = isMeExpert ? b.creator.name : b.expert.name;
  const roleLabel = isMeExpert ? 'Mentee' : 'Mentor';
  const statusClass = `status-${b.status.toLowerCase()}`;

  let actions = '';
  if (b.status === 'PENDING') {
    if (isMeExpert) {
      actions = `
        <button id="booking-confirm-${b.id}" class="btn-status btn-status-confirm">Confirm</button>
        <button id="booking-cancel-${b.id}" class="btn-status btn-status-cancel">Decline</button>`;
    } else {
      actions = `<button id="booking-cancel-${b.id}" class="btn-status btn-status-cancel">Cancel</button>`;
    }
  } else if (b.status === 'CONFIRMED') {
    actions = `
      <button id="booking-complete-${b.id}" class="btn-status btn-status-complete">Mark Complete</button>
      <button id="booking-notes-${b.id}" class="btn-status btn-status-notes">Notes</button>`;
  } else if (b.status === 'COMPLETED') {
    actions = `<button id="booking-notes-${b.id}" class="btn-status btn-status-notes">${b.notes ? 'View/Edit Notes' : '+ Add Notes'}</button>`;
  }

  return `
  <div class="glass-card booking-row ${statusClass} card-animated" style="${staggerDelay(index)}">
    <div class="w-full">
      <div class="flex justify-between items-center gap-md">
        <div>
          <p class="text-sm font-semibold">${escapeHtml(b.title || '1:1 Consultation Session')}</p>
          <p class="text-xs text-tertiary">${roleLabel}: ${escapeHtml(counterpart)} · ${formatDate(b.scheduledAt)}</p>
        </div>
        <div class="flex items-center gap-sm">
          ${actions ? `<div class="booking-actions">${actions}</div>` : ''}
        </div>
      </div>
      ${b.notes
      ? `<div class="booking-notes-display"><strong>Notes:</strong> ${escapeHtml(b.notes)}</div>`
      : ''
    }
    </div>
  </div>`;
}

// ---------- Boot ----------

(async function boot() {
  if (state.token) {
    await validateSession();
  }
  renderAuthState();
})();
