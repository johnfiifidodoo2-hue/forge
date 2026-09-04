// ============================================================
// Forge — Client-side Application Logic & Real-time Ecosystem
// ============================================================

const API_BASE = '/api';

const state = {
  token: localStorage.getItem('forge_token') || null,
  user: JSON.parse(localStorage.getItem('forge_user') || 'null'),
  theme: localStorage.getItem('forge_theme') || 'LIGHT',
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
  chatTimer: null,
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

// WhatsApp Direct Messaging Link Formatter
function formatWhatsAppLink(whatsappNumber, recipientName) {
  if (!whatsappNumber) return '#';
  // Strip spaces, dashes, parentheses but keep letters and '+'
  const cleanNumber = String(whatsappNumber).replace(/[^\w\+]/g, '');
  
  let text = `Hi ${recipientName || 'there'}, I found your profile on Forge Antigravity and would love to discuss a potential collaboration.`;
  if (recipientName && recipientName.includes('Rose-Mary')) {
    text = `Hello Dr. Rose-Mary Gyening, I am reaching out for mentorship regarding your computer architecture expertise.`;
  }
  
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}

// ---------- API Wrapper ----------

async function api(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'An unexpected server error occurred.');
  }
  return data;
}

function skeletonCards(count = 3, type = 'idea') {
  const cards = [];
  for (let i = 0; i < count; i++) {
    if (type === 'idea') {
      cards.push(`
        <div class="glass-card skeleton-card">
          <div class="flex gap-md items-center" style="margin-bottom:12px;">
            <div class="skeleton skeleton-avatar"></div>
            <div class="flex-1">
              <div class="skeleton skeleton-text" style="width:40%;"></div>
              <div class="skeleton skeleton-text" style="width:20%;"></div>
            </div>
          </div>
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text" style="width:90%;"></div>
          <div class="skeleton skeleton-text" style="width:60%;"></div>
        </div>
      `);
    } else {
      cards.push(`
        <div class="glass-card skeleton-card">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text" style="width:80%;"></div>
          <div class="skeleton skeleton-text" style="width:50%;"></div>
        </div>
      `);
    }
  }
  return cards.join('');
}

// ---------- Theme Engine ----------

function applyTheme(theme) {
  state.theme = theme === 'DARK' ? 'DARK' : 'LIGHT';
  localStorage.setItem('forge_theme', state.theme);

  const root = document.documentElement;
  const themeIcon = document.getElementById('themeIcon');

  if (state.theme === 'DARK') {
    root.classList.add('dark');
    if (themeIcon) themeIcon.textContent = 'light_mode';
  } else {
    root.classList.remove('dark');
    if (themeIcon) themeIcon.textContent = 'dark_mode';
  }
}

async function toggleTheme() {
  const newTheme = state.theme === 'DARK' ? 'LIGHT' : 'DARK';
  applyTheme(newTheme);

  if (state.user && state.token) {
    try {
      const { user } = await api('/profile', {
        method: 'PUT',
        body: JSON.stringify({ preferredTheme: newTheme }),
      });
      state.user = user;
      localStorage.setItem('forge_user', JSON.stringify(user));
    } catch {
      // Keep local state if sync fails
    }
  }
  showToast(`Switched to ${newTheme === 'DARK' ? 'Dark' : 'Light'} Mode`);
}

document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);

// ---------- Session & Auth ----------

function saveSession(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem('forge_token', token);
  localStorage.setItem('forge_user', JSON.stringify(user));
  if (user.preferredTheme) {
    applyTheme(user.preferredTheme);
  }
}

function clearSession() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('forge_token');
  localStorage.removeItem('forge_user');
  if (state.notifTimer) clearInterval(state.notifTimer);
  if (state.chatTimer) clearInterval(state.chatTimer);
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
  document.getElementById('authError').classList.add('hidden');
});

document.getElementById('signupTabBtn').addEventListener('click', () => {
  document.getElementById('signupTabBtn').classList.add('active');
  document.getElementById('loginTabBtn').classList.remove('active');
  document.getElementById('signupForm').classList.remove('hidden');
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('authError').classList.add('hidden');
});

function showAuthError(message) {
  const el = document.getElementById('authError');
  el.textContent = message;
  el.classList.remove('hidden');
}

async function performLogin(email, password) {
  document.getElementById('authError').classList.add('hidden');
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveSession(data.user, data.token);
    renderAuthState();
    showToast(`Welcome back, ${data.user.name.split(' ')[0]}!`);
  } catch (err) {
    showAuthError(err.message);
  }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  await performLogin(email, password);
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  document.getElementById('authError').classList.add('hidden');
  try {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole').value;
    const whatsappNumber = document.getElementById('signupWhatsapp')?.value?.trim() || '';

    const data = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, whatsappNumber }),
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
  const whatsappNumber = state.user.whatsappNumber || '';

  document.getElementById('profileBio').value = bio;
  document.getElementById('profileSkills').value = skills;
  document.getElementById('profilePortfolioUrl').value = portfolioUrl;
  if (document.getElementById('profileWhatsapp')) {
    document.getElementById('profileWhatsapp').value = whatsappNumber;
  }
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
    const whatsappNumber = document.getElementById('profileWhatsapp')?.value || '';

    const { user } = await api('/profile', {
      method: 'PUT',
      body: JSON.stringify({ bio, skills, portfolioUrl, whatsappNumber }),
    });
    saveSession(user, state.token);
    document.getElementById('profileModal').classList.add('hidden');
    showToast('Profile updated successfully!');
    if (state.activeTab === 'bookings') loadExperts();
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
  if (activePanel) {
    activePanel.classList.remove('hidden');
    activePanel.style.animation = 'none';
    activePanel.offsetHeight;
    activePanel.style.animation = '';
  }

  if (state.chatTimer) clearInterval(state.chatTimer);

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
  } else if (state.activeTab === 'ideatank') {
    loadProjects();
  } else if (state.activeTab === 'resources') {
    loadResources();
  } else if (state.activeTab === 'bookings') {
    loadExperts();
    loadMyBookings();
  } else if (state.activeTab === 'chat') {
    loadChatMessages();
    state.chatTimer = setInterval(loadChatMessages, 3000);
  }
}

// Global search handling
document.getElementById('globalSearch').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const val = e.target.value.trim();
    if (!val) return;
    switchTab('ideatank');
    document.getElementById('ideaSearch').value = val;
    loadProjects();
  }
});

// Shortcut Ctrl+K
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    document.getElementById('globalSearch').focus();
  }
});

// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboard() {
  const statsGrid = document.getElementById('statsGrid');
  try {
    const data = await api('/dashboard/stats');
    statsGrid.innerHTML = `
      <div class="glass-card stat-card">
        <div class="stat-icon"><span class="material-symbols-outlined">lightbulb</span></div>
        <div>
          <p class="stat-val">${data.totalProjects || 0}</p>
          <p class="stat-lbl">Active Ideas</p>
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon"><span class="material-symbols-outlined">inventory_2</span></div>
        <div>
          <p class="stat-val">${data.totalResources || 0}</p>
          <p class="stat-lbl">Resources Shared</p>
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon"><span class="material-symbols-outlined">psychology</span></div>
        <div>
          <p class="stat-val">${data.totalExperts || 0}</p>
          <p class="stat-lbl">Verified Mentors</p>
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon"><span class="material-symbols-outlined">group</span></div>
        <div>
          <p class="stat-val">${data.totalUsers || 0}</p>
          <p class="stat-lbl">Community Members</p>
        </div>
      </div>`;

    const recentList = document.getElementById('recentIdeasList');
    if (data.recentProjects && data.recentProjects.length) {
      recentList.innerHTML = data.recentProjects
        .map(
          (p) => `
        <div class="recent-item" onclick="switchTab('ideatank')">
          <p class="recent-title">${escapeHtml(p.title)}</p>
          <p class="recent-meta">by ${escapeHtml(p.owner?.name || 'Creator')} · ${p.upvoteCount || 0} upvotes</p>
        </div>`
        )
        .join('');
    } else {
      recentList.innerHTML = '<p class="text-xs text-tertiary">No recent ideas.</p>';
    }
  } catch (err) {
    statsGrid.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

async function loadActivityFeed() {
  const feed = document.getElementById('activityFeed');
  try {
    const { activities } = await api('/dashboard/activity');
    if (!activities || !activities.length) {
      feed.innerHTML = '<p class="text-xs text-tertiary">No recent activity.</p>';
      return;
    }
    feed.innerHTML = activities
      .map(
        (a) => `
      <div class="activity-item">
        <div class="avatar avatar-sm" style="background:${nameGradient(a.userName)}">${initials(a.userName)}</div>
        <div>
          <p class="activity-text"><strong>${escapeHtml(a.userName)}</strong> ${escapeHtml(a.action)}</p>
          <p class="activity-time">${timeAgo(a.timestamp)}</p>
        </div>
      </div>`
      )
      .join('');
  } catch {
    feed.innerHTML = '<p class="text-xs text-tertiary">Could not load activity feed.</p>';
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

document.getElementById('ideaSortSelect').addEventListener('change', (e) => {
  state.ideaSort = e.target.value;
  loadProjects();
});

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

document.getElementById('ideaForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const title = document.getElementById('ideaTitle').value;
    const description = document.getElementById('ideaDescription').value;
    const tags = document.getElementById('ideaTags').value;
    await api('/ideatank/projects', {
      method: 'POST',
      body: JSON.stringify({ title, description, tags }),
    });
    document.getElementById('ideaForm').reset();
    document.getElementById('ideaForm').classList.add('hidden');
    showToast('Idea published to Idea Tank!');
    loadProjects();
  } catch (err) {
    showToast(err.message, true);
  }
});

async function loadProjects() {
  const feed = document.getElementById('ideaFeed');
  feed.innerHTML = skeletonCards(3, 'idea');
  try {
    const params = new URLSearchParams();
    if (state.ideaScope === 'mine') params.set('scope', 'mine');
    if (state.ideaSort) params.set('sort', state.ideaSort);
    const search = document.getElementById('ideaSearch')?.value?.trim();
    if (search) params.set('search', search);

    const query = params.toString() ? `?${params}` : '';
    const { projects } = await api(`/ideatank/projects${query}`);

    if (!projects.length) {
      feed.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><span class="material-symbols-outlined empty-icon">lightbulb</span></div>
          <p>${search ? 'No ideas match your search.' : 'No ideas published yet. Be the first to pitch!'}</p>
        </div>`;
      return;
    }

    feed.innerHTML = projects.map((p, i) => renderIdeaCard(p, i)).join('');

    projects.forEach((p) => {
      const upvoteBtn = document.getElementById(`upvote-${p.id}`);
      if (upvoteBtn) {
        upvoteBtn.addEventListener('click', () => handleUpvote(p.id));
      }
      const commentToggle = document.getElementById(`toggle-comments-${p.id}`);
      if (commentToggle) {
        commentToggle.addEventListener('click', () => {
          document.getElementById(`comments-${p.id}`).classList.toggle('hidden');
        });
      }
      const commentForm = document.getElementById(`comment-form-${p.id}`);
      if (commentForm) {
        commentForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const input = document.getElementById(`comment-input-${p.id}`);
          handlePostComment(p.id, input.value);
        });
      }
    });
  } catch (err) {
    feed.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

async function handleUpvote(projectId) {
  try {
    await api(`/ideatank/projects/${projectId}/upvote`, { method: 'POST' });
    loadProjects();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function handlePostComment(projectId, content) {
  if (!content || !content.trim()) return;
  try {
    await api(`/ideatank/projects/${projectId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    loadProjects();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderIdeaCard(p, index) {
  const tags = (p.tags || [])
    .map((t) => `<span class="tag-chip">#${escapeHtml(t)}</span>`)
    .join('');

  const comments = (p.comments || [])
    .map(
      (c) => `
    <div class="comment-item">
      <div class="avatar avatar-xs" style="background:${nameGradient(c.author?.name)}">${initials(c.author?.name)}</div>
      <div class="comment-content">
        <p class="comment-author">${escapeHtml(c.author?.name || 'Anonymous')} <span class="comment-time">${timeAgo(c.createdAt)}</span></p>
        <p class="comment-text">${escapeHtml(c.content)}</p>
      </div>
    </div>`
    )
    .join('');

  const waButton = p.owner?.whatsappNumber
    ? `<a href="${formatWhatsAppLink(p.owner.whatsappNumber, p.owner.name)}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp"><span class="material-symbols-outlined icon-inline">chat</span> Direct WhatsApp</a>`
    : '';

  return `
  <div class="glass-card idea-card card-animated" style="${staggerDelay(index)}">
    <div class="idea-header flex justify-between items-center">
      <div class="flex items-center gap-sm">
        <div class="avatar avatar-md" style="background:${nameGradient(p.owner?.name)}">${initials(p.owner?.name)}</div>
        <div>
          <h4 class="idea-author">${escapeHtml(p.owner?.name || 'Creator')}</h4>
          <p class="idea-role">${p.owner?.role === 'EXPERT' ? 'Expert Mentor' : 'Creator'}</p>
        </div>
      </div>
      ${waButton}
    </div>

    <h3 class="idea-title">${escapeHtml(p.title)}</h3>
    <p class="idea-description">${escapeHtml(p.description)}</p>

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
// REAL-TIME CHAT ROOM
// ============================================================

const CHANNEL_META = {
  'general-collaboration': { title: '# general-collaboration', sub: 'Public Cross-Disciplinary Lounge' },
  'comp-arch-hardware': { title: '# comp-arch-hardware', sub: 'Computer Architecture, RISC-V & Hardware Pipelining' },
  'fundraising-vcs': { title: '# fundraising-vcs', sub: 'Startup Pitch Decks & VC Investor Insights' },
  'devops-cloud': { title: '# devops-cloud', sub: 'Kubernetes, AWS, Vercel & Infrastructure' },
  'ai-ml-models': { title: '# ai-ml-models', sub: 'PyTorch, CUDA & Edge AI Optimization' },
};

document.getElementById('chatChannelList')?.addEventListener('click', (e) => {
  const item = e.target.closest('.chat-channel-item');
  if (!item) return;
  const channel = item.dataset.channel;
  if (!channel) return;

  document.querySelectorAll('#chatChannelList .chat-channel-item').forEach((el) => el.classList.remove('active'));
  item.classList.add('active');

  state.activeChannel = channel;
  const meta = CHANNEL_META[channel] || { title: `# ${channel}`, sub: 'Discussion Channel' };
  document.getElementById('activeChannelTitle').textContent = meta.title;
  document.getElementById('activeChannelSubtitle').textContent = meta.sub;

  loadChatMessages();
});

async function loadChatMessages() {
  const box = document.getElementById('chatMessagesBox');
  const userList = document.getElementById('chatUserList');
  const roomId = state.activeChannel || 'general-collaboration';

  try {
    const { messages } = await api(`/chat/messages?roomId=${encodeURIComponent(roomId)}`);

    if (!messages.length) {
      box.innerHTML = `<p style="text-align:center; color:var(--text-tertiary); margin:auto;">No messages in this channel yet. Be the first to start the discussion!</p>`;
    } else {
      const isScrolledToBottom = box.scrollHeight - box.clientHeight <= box.scrollTop + 50;

      box.innerHTML = messages
        .map((m) => {
          const isOwn = state.user && m.sender.id === state.user.id;
          const roleClass = m.sender.role === 'EXPERT' ? 'expert' : 'creator';
          const roleLabel = m.sender.role === 'EXPERT' ? 'Mentor' : 'Creator';
          return `
          <div class="chat-message-item ${isOwn ? 'own' : ''}">
            <div class="avatar avatar-sm" style="background:${nameGradient(m.sender.name)}">${initials(m.sender.name)}</div>
            <div>
              <div class="chat-sender-info">
                <strong>${escapeHtml(m.sender.name)}</strong>
                <span class="badge-role ${roleClass}">${roleLabel}</span>
              </div>
              <div class="chat-bubble">
                ${escapeHtml(m.content)}
                <div class="chat-timestamp">${formatDate(m.createdAt)}</div>
              </div>
            </div>
          </div>`;
        })
        .join('');

      if (isScrolledToBottom) {
        box.scrollTop = box.scrollHeight;
      }
    }

    // Extract unique active members in chat room
    const membersMap = new Map();
    messages.forEach((m) => membersMap.set(m.sender.id, m.sender));
    if (state.user) membersMap.set(state.user.id, state.user);

    userList.innerHTML = Array.from(membersMap.values())
      .map((u) => {
        const roleLabel = u.role === 'EXPERT' ? 'Mentor' : 'Creator';
        const waBtn = u.whatsappNumber ? `<a href="${formatWhatsAppLink(u.whatsappNumber, u.name)}" target="_blank" class="btn-whatsapp" style="padding:4px 8px; font-size:11px;" title="Chat on WhatsApp"><span class="material-symbols-outlined" style="font-size:14px;">chat</span></a>` : '';
        return `
        <div class="user-chip">
          <div class="avatar avatar-xs" style="background:${nameGradient(u.name)}">${initials(u.name)}</div>
          <div style="flex:1; overflow:hidden;">
            <strong style="display:block; font-size:12px; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${escapeHtml(u.name)}</strong>
            <span class="badge-role ${u.role.toLowerCase()}">${roleLabel}</span>
          </div>
          ${waBtn}
        </div>`;
      })
      .join('');
  } catch (err) {
    box.innerHTML = `<p class="error-text">${err.message}</p>`;
  }
}

document.getElementById('chatForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const content = input.value.trim();
  if (!content) return;

  const roomId = state.activeChannel || 'general-collaboration';

  try {
    await api('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ content, roomId }),
    });
    input.value = '';
    loadChatMessages();
  } catch (err) {
    showToast(err.message, true);
  }
});

// ============================================================
// AI INVESTOR PROPOSAL ENGINE
// ============================================================

document.getElementById('autoFillPitchBtn')?.addEventListener('click', async () => {
  const btn = document.getElementById('autoFillPitchBtn');
  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined icon-inline" style="font-size:14px;">sync</span> Auto-Filling...`;

  try {
    const { projects } = await api('/ideatank/projects?scope=mine');
    if (!projects || projects.length === 0) {
      showToast('No projects found. Pitch an idea in the Idea Tank first!', true);
      return;
    }
    const latest = projects[0];
    
    // Start with basic fill to show immediate responsiveness
    document.getElementById('pitchStartupName').value = latest.title;
    document.getElementById('pitchSolution').value = latest.description;
    
    // Call AI to deduce the rest and estimate funding
    const res = await api(`/pitch/autofill?projectId=${latest.id}`);
    
    document.getElementById('pitchStartupName').value = res.startupName || latest.title;
    document.getElementById('pitchTargetMarket').value = res.targetMarket || 'B2B SaaS / Developer Tools';
    document.getElementById('pitchProblem').value = res.problemStatement || 'Deducing from context...';
    document.getElementById('pitchSolution').value = res.solution || latest.description;
    document.getElementById('pitchMetrics').value = res.metrics || 'Pre-product, validating with community.';
    document.getElementById('pitchFundingAsk').value = res.fundingAsk || '$250,000 Pre-seed';

    showToast('Pitch details auto-filled & funding estimated!');
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="material-symbols-outlined icon-inline" style="font-size:14px;">magic_button</span> Auto-Fill from Latest Idea`;
  }
});

document.getElementById('pitchForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('generatePitchBtn');
  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined">sync</span> Synthesizing AI Proposal...`;

  try {
    const startupName = document.getElementById('pitchStartupName').value;
    const targetMarket = document.getElementById('pitchTargetMarket').value;
    const problemStatement = document.getElementById('pitchProblem').value;
    const solution = document.getElementById('pitchSolution').value;
    const metrics = document.getElementById('pitchMetrics').value;
    const fundingAsk = document.getElementById('pitchFundingAsk').value;

    const data = await api('/pitch/generate', {
      method: 'POST',
      body: JSON.stringify({ startupName, targetMarket, problemStatement, solution, metrics, fundingAsk }),
    });

    document.getElementById('deckOutput').textContent = data.pitchDeck || 'No deck output generated.';
    document.getElementById('emailOutput').textContent = data.coldEmail || 'No email output generated.';
    document.getElementById('superscoutOutput').textContent = data.superscoutPayload || 'No payload generated.';

    showToast('AI Pitch Deck & Email generated successfully!');
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="material-symbols-outlined">auto_awesome</span> Generate Proposal & Email`;
  }
});

// Copy to Clipboard Handlers
document.getElementById('copyDeckBtn')?.addEventListener('click', () => {
  const text = document.getElementById('deckOutput').textContent;
  navigator.clipboard.writeText(text);
  showToast('Investor Deck copied to clipboard!');
});

document.getElementById('copyEmailBtn')?.addEventListener('click', () => {
  const text = document.getElementById('emailOutput').textContent;
  navigator.clipboard.writeText(text);
  showToast('Cold Outreach Email copied to clipboard!');
});

document.getElementById('copySuperscoutBtn')?.addEventListener('click', () => {
  const text = document.getElementById('superscoutOutput').textContent;
  navigator.clipboard.writeText(text);
  showToast('Superscout Payload copied to clipboard!');
});

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

    if (!state.activeCategory && state.resFilter === 'all' && !search) {
      // Group resources by Category
      const grouped = {};
      resources.forEach((r) => {
        const cat = r.category || 'OTHER';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(r);
      });

      let html = '';
      let index = 0;
      Object.keys(grouped).forEach((catKey) => {
        const label = CATEGORY_LABELS[catKey] || catKey;
        html += `<div class="category-group-header">
          <span class="material-symbols-outlined text-accent" style="font-size:20px;">folder</span>
          ${escapeHtml(label)} Resources (${grouped[catKey].length})
        </div>`;
        html += grouped[catKey].map((r) => renderResourceCard(r, index++)).join('');
      });
      grid.innerHTML = html;
    } else {
      grid.innerHTML = resources.map((r, i) => renderResourceCard(r, i)).join('');
    }

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
  const codeUrl = r.githubUrl || r.downloadUrl;

  const codeBtn = codeUrl
    ? `<a href="${encodeURI(codeUrl)}" target="_blank" rel="noopener noreferrer" class="btn-github-code" style="margin-right:auto;">
        <svg height="13" width="13" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:middle;">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg> View GitHub Code ↗
       </a>`
    : '';

  return `
  <div class="glass-card resource-card card-animated" style="${staggerDelay(index)}">
    <button id="bookmark-${r.id}" class="bookmark-btn ${isSaved ? 'active' : ''}" title="${isSaved ? 'Remove bookmark' : 'Bookmark'}">
      <span class="material-symbols-outlined bookmark-icon${isSaved ? ' filled' : ''}" style="font-size:18px;">star</span>
    </button>
    <span class="category-badge ${cssClass}">${CATEGORY_LABELS[r.category] || r.category}</span>
    <h3 class="resource-title">${escapeHtml(r.title)}</h3>
    <p class="resource-description">${escapeHtml(r.description)}</p>
    <div class="resource-footer" style="flex-wrap:wrap; gap:8px; justify-content:space-between; align-items:center;">
      ${codeBtn}
      <a href="${encodeURI(r.downloadUrl)}" target="_blank" rel="noopener noreferrer" class="btn-download">Open Docs ↗</a>
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

  const waBtn = expert.whatsappNumber
    ? `<a href="${formatWhatsAppLink(expert.whatsappNumber, expert.name)}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp" style="margin-top:var(--space-sm); justify-content:center;"><span class="material-symbols-outlined icon-inline">chat</span> Direct WhatsApp</a>`
    : '';

  return `
  <div class="glass-card expert-card card-animated" style="${staggerDelay(index)}">
    <div class="avatar avatar-lg" style="background:${nameGradient(expert.name)}">${initials(expert.name)}</div>
    <h3 class="expert-name">${escapeHtml(expert.name)}</h3>
    <p class="expert-role">Verified Mentor</p>
    ${expert.bio ? `<p class="expert-bio">${escapeHtml(expert.bio)}</p>` : ''}
    ${skills ? `<div class="expert-skills">${skills}</div>` : ''}
    ${waBtn}
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

function updateGithubBadge() {
  const container = document.getElementById('githubHeaderBadge');
  if (!container) return;
  const username = state.githubUsername || localStorage.getItem('forge_github_user') || 'johnfiifidodoo2-hue';
  if (username) {
    container.innerHTML = `
      <a href="https://github.com/${escapeHtml(username)}" target="_blank" rel="noopener noreferrer" class="github-connected-badge">
        <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:middle;">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg> Connected: @${escapeHtml(username)}
      </a>`;
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}

document.getElementById('connectGithubBtn')?.addEventListener('click', () => {
  const input = document.getElementById('profileGithubUsername');
  const val = (input && input.value.trim()) || 'johnfiifidodoo2-hue';
  state.githubUsername = val;
  localStorage.setItem('forge_github_user', val);
  updateGithubBadge();
  const statusEl = document.getElementById('githubConnectStatus');
  if (statusEl) statusEl.textContent = `✅ Successfully connected GitHub account: @${val}`;
  showToast(`GitHub account @${val} connected!`);
});

// ---------- Boot ----------

(async function boot() {
  applyTheme(state.theme);
  updateGithubBadge();
  if (state.token) {
    await validateSession();
  }
  renderAuthState();
})();
