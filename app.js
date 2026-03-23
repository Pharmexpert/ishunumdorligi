/* ==========================================
   HAYOT BOSHQARUVCHISI 2026 — App Core v2
   Department-scoped delegation + Kanban + Pomodoro
   ========================================== */

const STORAGE_KEYS = { tasks: 'hb_tasks', productivity: 'hb_prod', finance: 'hb_finance', habits: 'hb_habits', prodItems: 'hb_prod_items', debts: 'hb_debts', settings: 'hb_settings', comments: 'hb_comments', pomodoro: 'hb_pomodoro', reminders: 'hb_reminders' };

// Offline-first: localStorage for instant access, server for persistence
function loadData(key, def = []) { try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; } }
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    // Async sync to server (fire-and-forget)
    syncKeyToServer(key, data);
}

// Server sync helpers
let _syncTimeout = null;
function syncKeyToServer(key, value) {
    const token = localStorage.getItem('hb_token');
    if (!token) return;
    // Debounce: wait 500ms before sending to avoid rapid fires
    clearTimeout(_syncTimeout);
    _syncTimeout = setTimeout(() => {
        fetch('/api/user/data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ key, value })
        }).catch(e => console.warn('Sync error:', e.message));
    }, 500);
}

async function syncFromServer() {
    const token = localStorage.getItem('hb_token');
    if (!token) return;
    try {
        const res = await fetch('/api/user/data', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return;
        const { data } = await res.json();
        if (!data || typeof data !== 'object') return;
        // Merge: server data overrides local for each key
        Object.keys(STORAGE_KEYS).forEach(k => {
            const storageKey = STORAGE_KEYS[k];
            if (data[storageKey] !== undefined) {
                localStorage.setItem(storageKey, JSON.stringify(data[storageKey]));
            }
        });
        console.log('✅ Server sync completed');
    } catch (e) {
        console.warn('Server sync failed:', e.message);
    }
}

async function syncAllToServer() {
    const token = localStorage.getItem('hb_token');
    if (!token) return;
    const payload = {};
    Object.keys(STORAGE_KEYS).forEach(k => {
        const storageKey = STORAGE_KEYS[k];
        try { payload[storageKey] = JSON.parse(localStorage.getItem(storageKey)) || []; } catch { payload[storageKey] = []; }
    });
    try {
        await fetch('/api/user/data/bulk', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ data: payload })
        });
    } catch (e) { console.warn('Bulk sync error:', e.message); }
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

let currentView = 'dashboard';
let currentProdMonth = new Date().getMonth();
let currentProdYear = new Date().getFullYear();
let currentFinMonth = new Date().getMonth();
let currentHabitMonth = new Date().getMonth();
let currentHabitYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();
let currentCalYear = new Date().getFullYear();
if (typeof ChartDataLabels !== 'undefined') { Chart.register(ChartDataLabels); Chart.defaults.set('plugins.datalabels', { display: false }); }
let charts = {};
let _authUser = null;
let _pomoInterval = null;
let _pomoState = { mode: 'work', seconds: 25 * 60, running: false, sessions: 0 };

const DEFAULT_PROD_ITEMS = ['Erta turish', 'Sport', 'Kitob o\'qish', 'Meditatsiya', 'Suv ichish', 'Sog\'lom ovqat', 'Ish rejasi', 'Yangi narsa o\'rganish', 'Oilaga vaqt', 'Yurish/Sayr', 'Kun rejasi', 'Uxlash vaqti'];
const DEFAULT_CATEGORIES = [
    { id: 'work', name: 'Ish maqsadlari', icon: '💼', colorClass: 'work' },
    { id: 'finance', name: 'Moliyaviy maqsadlar', icon: '💰', colorClass: 'finance' },
    { id: 'creative', name: 'Ijodiy maqsadlar', icon: '🎨', colorClass: 'creative' },
    { id: 'personal', name: 'Shaxsiy rivojlanish', icon: '🌟', colorClass: 'personal' },
    { id: 'relations', name: 'Munosabatlar maqsadlari', icon: '❤️', colorClass: 'relations' },
    { id: 'spiritual', name: 'Ruhiy maqsadlar', icon: '🙏', colorClass: 'spiritual' }
];
const DEFAULT_TASK_CATEGORIES = ['Ish', 'Shaxsiy', 'O\'qish', 'Sog\'liq', 'Moliya', 'Oila'];
const PRIORITIES = [
    { key: 'ota_muhim', label: '‼️ O\'ta muhim' },
    { key: 'muhim', label: '⚡️ Muhim' },
    { key: 'orta', label: '📌 O\'rtacha muhim' },
    { key: 'past', label: '💤 Unchalik muhimmas' }
];
const STATUSES = [
    { key: 'yangi', label: '⚠️ Hali boshlanmadi' },
    { key: 'jarayonda', label: '🔄 Jarayonda' },
    { key: 'tekshiruvda', label: '🔍 Tekshiruvda' },
    { key: 'bajarildi', label: '✅ Bajarildi' },
    { key: 'bekor', label: '❌ Bekor qilingan' }
];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    _authUser = requireAuth();
    if (!_authUser) return;
    initSeedData();
    setupNav();
    setupUIForUser();
    setupHeader();
    setupModal();
    setupSubTabs();
    updateDateDisplay();
    updateStaticTexts();
    updateNotifBadge();
    // Sync from server on load, then render dashboard
    syncFromServer().then(() => {
        switchView('dashboard');
    }).catch(() => {
        switchView('dashboard');
    });
});

// Save to server when user leaves page
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') syncAllToServer();
});

function setupUIForUser() {
    const avatarEl = document.getElementById('userAvatar');
    if (_authUser.avatarUrl) {
        avatarEl.innerHTML = `<img src="${_authUser.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
        avatarEl.style.padding = '0';
        avatarEl.style.overflow = 'hidden';
    } else {
        avatarEl.textContent = _authUser.avatar || _authUser.name.charAt(0);
    }
    document.getElementById('userName').textContent = _authUser.name;
    document.getElementById('userRole').textContent = t('role.' + _authUser.role);
    document.getElementById('logoutText').textContent = t('auth.logout');
    const adminNav = document.getElementById('navAdmin');
    if (canAccessAdmin(_authUser)) adminNav.style.display = 'flex';
    else adminNav.style.display = 'none';
    const finNav = document.querySelector('[data-view="finance"]');
    if (finNav && !canViewFinance(_authUser)) finNav.style.display = 'none';
    const addBtn = document.getElementById('headerAddBtn');
    if (!canCreateTasks(_authUser)) addBtn.style.display = 'none';
    const inviteBtn = document.getElementById('inviteBtn');
    if (canInviteWorkers(_authUser)) inviteBtn.style.display = 'inline-flex';
    const reportTab = document.getElementById('reportTab');
    if (reportTab && canViewAllTeam(_authUser)) reportTab.style.display = '';
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === getLanguage()));
    // Init chat widget
    if (typeof initChatWidget === 'function') initChatWidget();
}

function initSeedData() {
    if (!localStorage.getItem(STORAGE_KEYS.prodItems)) saveData(STORAGE_KEYS.prodItems, DEFAULT_PROD_ITEMS);
    if (!localStorage.getItem(STORAGE_KEYS.settings)) saveData(STORAGE_KEYS.settings, { taskCategories: DEFAULT_TASK_CATEGORIES, weekStart: 'monday' });
    if (!localStorage.getItem(STORAGE_KEYS.tasks)) {
        saveData(STORAGE_KEYS.tasks, [
            { id: genId(), name: "Farmatsevtika xabarnomasi jurnalini ko'rib chiqish", priority: 'ota_muhim', category: 'Ish', status: 'jarayonda', deadline: '2026-03-25', time: '10:00', created: '2026-03-20', note: '', createdBy: _authUser.id, assignedTo: _authUser.id, department: _authUser.department },
            { id: genId(), name: 'Haftalik hisobot tayyorlash', priority: 'muhim', category: 'Ish', status: 'yangi', deadline: '2026-03-28', time: '14:00', created: '2026-03-21', note: '', createdBy: _authUser.id, assignedTo: _authUser.id, department: _authUser.department },
            { id: genId(), name: 'Kitob o\'qishni tugatish', priority: 'past', category: 'Shaxsiy', status: 'yangi', deadline: '2026-03-30', time: '', created: '2026-03-18', note: '', createdBy: _authUser.id, assignedTo: _authUser.id, department: _authUser.department },
            { id: genId(), name: 'Moliyaviy rejani yangilash', priority: 'muhim', category: 'Moliya', status: 'bajarildi', deadline: '2026-03-15', time: '', created: '2026-03-10', note: '', createdBy: _authUser.id, assignedTo: _authUser.id, department: _authUser.department },
            { id: genId(), name: 'Prezentatsiya tayyorlash', priority: 'orta', category: 'Ish', status: 'yangi', deadline: '2026-04-01', time: '09:00', created: '2026-03-21', note: '', createdBy: _authUser.id, assignedTo: _authUser.id, department: _authUser.department },
        ]);
    }
    if (!localStorage.getItem(STORAGE_KEYS.habits)) {
        saveData(STORAGE_KEYS.habits, DEFAULT_CATEGORIES.map(c => ({
            ...c, goals: [{ id: genId(), name: c.id === 'work' ? 'Ilmiy maqola yozish' : c.id === 'finance' ? 'Jamg\'arma ko\'paytirish' : c.id === 'creative' ? 'Yangi loyiha boshlash' : c.id === 'personal' ? 'Sog\'lig\'imni yaxshilash' : c.id === 'relations' ? 'Oila bilan vaqt o\'tkazish' : 'Meditatsiya qilish', desc: '', progress: Math.floor(Math.random() * 60 + 10), subtasks: [{ id: genId(), text: 'Kunlik vazifa', type: 'daily', done: false }, { id: genId(), text: 'Haftalik vazifa', type: 'weekly', done: false }, { id: genId(), text: 'Oylik vazifa', type: 'monthly', done: false }] }]
        })));
    }
    if (!localStorage.getItem(STORAGE_KEYS.finance)) {
        const fin = {};
        for (let m = 0; m < 12; m++) {
            fin[m] = { income: [], expenses: [], savings: 0 };
            if (m <= 2) {
                fin[m].income = [{ id: genId(), name: 'Asosiy ish haqi', amount: 8000000 }, { id: genId(), name: 'Qo\'shimcha daromad', amount: 2000000 }];
                fin[m].expenses = [{ id: genId(), name: 'Uy-joy', amount: 2500000, category: 'Uy-joy' }, { id: genId(), name: 'Oziq-ovqat', amount: 1500000, category: 'Oziq-ovqat' }, { id: genId(), name: 'Transport', amount: 800000, category: 'Transport' }, { id: genId(), name: 'Kommunal', amount: 500000, category: 'Kommunal' }];
                fin[m].savings = 4700000;
            }
        }
        saveData(STORAGE_KEYS.finance, fin);
    }
    if (!localStorage.getItem(STORAGE_KEYS.debts)) {
        saveData(STORAGE_KEYS.debts, [{ id: genId(), date: '2025-01-01', creditor: 'Dilshod', originalAmount: 10000000, paidAmount: 2000000, remaining: 8000000, months: 6, monthlyPayment: 1333333, paymentDate: '2025-01-10', deadline: '2025-01-15', status: 'paid', note: '' }]);
    }
}

// ===== NAVIGATION =====
function setupNav() { document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view))); }

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
    document.getElementById('pageTitle').textContent = t('header.title.' + view);
    const addBtn = document.getElementById('headerAddBtn');
    const canAdd = canCreateTasks(_authUser) && ['tasks', 'finance', 'habits'].includes(view);
    addBtn.style.display = canAdd ? 'inline-flex' : 'none';
    addBtn.onclick = () => { if (view === 'tasks') showTaskModal(); else if (view === 'finance') showFinanceModal(); else if (view === 'habits') showGoalModal(); };
    const addSpan = addBtn.querySelector('span');
    if (addSpan) addSpan.textContent = t('header.add');
    const renders = { dashboard: renderDashboard, tasks: renderTasks, productivity: renderProductivity, finance: renderFinance, habits: renderHabits, admin: renderAdmin, drive: renderGoogleDrive };
    if (renders[view]) renders[view]();
    if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
}

function setupHeader() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = document.getElementById('menuToggle');

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
        document.body.classList.toggle('sidebar-open');
    });

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        });
    }

    // Close sidebar on nav button click (mobile)
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('active');
                document.body.classList.remove('sidebar-open');
            }
        });
    });
}

function setupSubTabs() {
    document.querySelectorAll('.sub-tabs').forEach(tabGroup => {
        tabGroup.querySelectorAll('.sub-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const parent = tab.closest('.view');
                parent.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                parent.querySelectorAll('.subtab-content').forEach(c => c.classList.remove('active'));
                const target = document.getElementById('subtab-' + tab.dataset.subtab);
                if (target) target.classList.add('active');
                // Auto-render when switching tabs
                const st = tab.dataset.subtab;
                if (st === 'taskkanban') renderKanban(document.getElementById('kanbanBoard') || target);
                if (st === 'taskplanner') renderDailyPlanner(document.getElementById('dailyPlanner') || target);
                if (st === 'taskcalendar') renderTaskCalendar(document.getElementById('tasksCalendar') || target);
                if (st === 'taskeisenhower') renderEisenhowerMatrix(document.getElementById('eisenhowerMatrix') || target);
                if (st === 'taskbrainstorm') renderBrainstorming(document.getElementById('brainstormBoard') || target);
                if (st === 'tasksettings') renderTaskSettings(document.getElementById('taskSettings') || target);
                if (st === 'prodpomodoro') renderPomodoro(document.getElementById('pomodoroTimer') || target);
                if (st === 'prodreport') renderTeamReport(document.getElementById('teamReport') || target);
                // Admin tabs
                if (st === 'adminusers' || st === 'adminstats' || st === 'admindepts' || st === 'admininvites') renderAdmin();
            });
        });
    });
}

function updateDateDisplay() {
    const now = new Date();
    const lang = getLanguage();
    const locale = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz-UZ';
    document.getElementById('dateDisplay').textContent = now.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function showToast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function setupModal() {
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
}
function openModal(title, bodyHTML) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalOverlay').classList.add('active');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }

function formatNum(n) {
    if (n === undefined || n === null) return '0';
    const abs = Math.abs(n);
    if (abs >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + ' млн';
    if (abs >= 10000) return new Intl.NumberFormat('uz-UZ').format(n);
    return new Intl.NumberFormat('uz-UZ').format(n);
}
function formatNumShort(n) {
    const abs = Math.abs(n);
    if (abs >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + ' млн';
    if (abs >= 1000) return (n / 1000).toFixed(0) + ' минг';
    return n.toString();
}
function formatDate(d) { if (!d) return '—'; const dt = new Date(d); return dt.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }); }
function getDaysRemaining(deadline) {
    if (!deadline) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dl = new Date(deadline); dl.setHours(0, 0, 0, 0);
    return Math.ceil((dl - today) / (1000 * 60 * 60 * 24));
}
function getMonthName(i) { return t('month.' + i); }
function getMonthNames() { return Array.from({ length: 12 }, (_, i) => t('month.' + i)); }

// ===== NOTIFICATIONS =====
function updateNotifBadge() {
    const count = getUnreadCount(_authUser.id);
    const badge = document.getElementById('notifBadge');
    if (count > 0) { badge.style.display = 'flex'; badge.textContent = count > 9 ? '9+' : count; }
    else badge.style.display = 'none';
}

function toggleNotifications() {
    const dd = document.getElementById('notifDropdown');
    if (dd.style.display === 'none') {
        dd.style.display = 'block';
        document.getElementById('notifTitle').textContent = t('notif.title');
        document.getElementById('notifMarkRead').textContent = '✓ ' + t('notif.markRead');
        const notifs = getNotifications(_authUser.id);
        const list = document.getElementById('notifList');
        if (!notifs.length) { list.innerHTML = `<div class="notif-empty">${t('notif.noNew')}</div>`; return; }
        list.innerHTML = notifs.slice(0, 20).map(n => `
            <div class="notif-item ${n.read ? '' : 'unread'}">
                <div class="notif-icon">${n.type === 'task_assigned' ? '📋' : n.type === 'task_approved' ? '✅' : n.type === 'task_returned' ? '🔄' : n.type === 'deadline_warning' ? '⏰' : '📩'}</div>
                <div class="notif-content"><div class="notif-msg">${n.message}</div><div class="notif-time">${timeAgo(n.createdAt)}</div></div>
            </div>`).join('');
    } else dd.style.display = 'none';
}

function markAllRead() {
    markNotificationsRead(_authUser.id);
    updateNotifBadge();
    toggleNotifications(); toggleNotifications();
}

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'hozirgina';
    if (diff < 3600) return Math.floor(diff / 60) + ' min oldin';
    if (diff < 86400) return Math.floor(diff / 3600) + ' soat oldin';
    return Math.floor(diff / 86400) + ' kun oldin';
}

// ===== INVITE MODAL =====
function showInviteModal() {
    const depts = getAllDepartmentNames();
    // Also load custom orgs from localStorage
    const customOrgs = JSON.parse(localStorage.getItem('iu_custom_orgs') || '[]');
    const allDepts = [...new Set([...depts, ...customOrgs])];

    openModal('Фойдаланувчини таклиф қилиш', `
        <div class="form-group"><label class="form-label">Фойдаланувчи email манзили</label><input class="form-input" id="mInviteEmail" type="email" placeholder="email@example.com"></div>
        <div class="form-group"><label class="form-label">Ташкилот (таркибий бўлим)</label>
            <select class="form-select" id="mInviteDept" onchange="if(this.value==='__new__')document.getElementById('newOrgRow').style.display='flex'">
            ${allDepts.map(d => `<option value="${d}" ${d === _authUser.department ? 'selected' : ''}>${d}</option>`).join('')}
            <option value="__new__">➕ Янги ташкилот қўшиш</option>
            </select>
            <div id="newOrgRow" style="display:none;gap:6px;margin-top:8px">
                <input class="form-input" id="mNewOrgName" placeholder="Ташкилот номини киритинг" style="flex:1">
                <button class="btn-primary" onclick="addNewOrg()" style="white-space:nowrap">Қўшиш</button>
            </div>
        </div>
        <div class="form-actions"><button class="btn-secondary" onclick="closeModal()">${t('common.cancel')}</button>
        <button class="btn-primary" onclick="sendInvite()">📧 Таклиф юбориш</button></div>
        <div style="margin-top:20px"><h4>${t('invite.list')}</h4><div id="inviteListModal"></div></div>`);
    renderInviteList();
}

function addNewOrg() {
    const name = document.getElementById('mNewOrgName').value.trim();
    if (!name) { showToast('Ташкилот номини киритинг', 'error'); return; }
    const customOrgs = JSON.parse(localStorage.getItem('iu_custom_orgs') || '[]');
    if (!customOrgs.includes(name)) {
        customOrgs.push(name);
        localStorage.setItem('iu_custom_orgs', JSON.stringify(customOrgs));
    }
    // Add to dropdown and select it
    const sel = document.getElementById('mInviteDept');
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name; opt.selected = true;
    sel.insertBefore(opt, sel.querySelector('[value="__new__"]'));
    document.getElementById('newOrgRow').style.display = 'none';
    document.getElementById('mNewOrgName').value = '';
    showToast('✅ "' + name + '" қўшилди');
}

async function sendInvite() {
    const email = document.getElementById('mInviteEmail').value.trim();
    const dept = document.getElementById('mInviteDept').value;
    if (!email) { showToast(t('common.fillAll'), 'error'); return; }
    const result = await inviteWorker(email, dept, _authUser.id);
    if (!result.success) { showToast(result.error || t('invite.error'), 'error'); return; }
    showToast(result.emailSent ? '📧 Таклифнома электрон почтага юборилди!' : t('invite.sent'));
    document.getElementById('mInviteEmail').value = '';
    renderInviteList();
}

async function renderInviteList() {
    const el = document.getElementById('inviteListModal');
    if (!el) return;
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">Юкланмоқда...</p>';
    const invs = await fetchInvitations();
    const isAdmin = _authUser.role === 'admin' || _authUser.role === 'rahbar';
    const myInvs = isAdmin ? invs : invs.filter(inv => inv.invited_by === _authUser.id || inv.invitedBy === _authUser.id);
    if (!myInvs.length) {
        el.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem">${t('notif.noNew')}</p>`;
        return;
    }
    el.innerHTML = myInvs.map(inv => {
        const statusIcon = inv.status === 'accepted' ? '✅' : inv.status === 'cancelled' ? '❌' : '⏳';
        const statusText = inv.status === 'accepted' ? t('invite.accepted') : inv.status === 'cancelled' ? 'Бекор қилинган' : t('invite.pending');
        const statusColor = inv.status === 'accepted' ? 'var(--success)' : inv.status === 'cancelled' ? 'var(--danger)' : '#C07840';
        const actions = inv.status === 'pending' && isAdmin ? `
            <div style="display:flex;gap:6px;margin-top:6px">
                <button onclick="approveInvFromModal('${inv.id}')" style="padding:4px 12px;background:#3B9B6E;color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.78rem">✅ Тасдиқлаш</button>
                <button onclick="cancelInvFromModal('${inv.id}')" style="padding:4px 12px;background:#C44D4D;color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.78rem">❌ Бекор қилиш</button>
            </div>` : '';
        return `<div class="notif-item" style="padding:10px 0;border-bottom:1px solid rgba(180,140,100,0.1)">
            <div style="display:flex;align-items:center;gap:10px">
                <div class="notif-icon">${statusIcon}</div>
                <div style="flex:1">
                    <div style="font-weight:600;font-size:0.9rem">${inv.email}</div>
                    <div style="font-size:0.78rem;color:var(--text-muted)">${inv.department} · <span style="color:${statusColor};font-weight:600">${statusText}</span></div>
                    ${actions}
                </div>
            </div>
        </div>`;
    }).join('');
}

async function approveInvFromModal(invId) {
    const token = getJwtToken();
    if (!token) return;
    try {
        const res = await fetch(`/api/invitations/${invId}/approve`, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
            showToast('✅ ' + (data.message || 'Таклифнома тасдиқланди'));
            renderInviteList();
            if (typeof renderAdminInvites === 'function') renderAdminInvites();
        } else showToast('❌ ' + data.error, 'error');
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

async function cancelInvFromModal(invId) {
    const token = getJwtToken();
    if (!token) return;
    try {
        const res = await fetch(`/api/invitations/${invId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success) {
            showToast('✅ Таклифнома бекор қилинди');
            renderInviteList();
            if (typeof renderAdminInvites === 'function') renderAdminInvites();
        } else showToast('❌ ' + data.error, 'error');
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

// ==========================================
// DASHBOARD
// ==========================================
function renderDashboard() {
    const tasks = loadData(STORAGE_KEYS.tasks);
    const fin = loadData(STORAGE_KEYS.finance, {});
    const habits = loadData(STORAGE_KEYS.habits, []);
    const today = new Date().toISOString().slice(0, 10);
    const myTasks = getMyTasks(tasks);
    const total = myTasks.length;
    const done = myTasks.filter(t => t.status === 'bajarildi').length;
    const inProgress = myTasks.filter(t => t.status === 'jarayonda').length;
    const overdue = myTasks.filter(t => t.deadline && t.deadline < today && t.status !== 'bajarildi' && t.status !== 'bekor').length;
    const review = myTasks.filter(t => t.status === 'tekshiruvda').length;
    const focus = myTasks.filter(t => t.isFocus && t.status !== 'bajarildi').length;
    const m = new Date().getMonth();
    const mf = fin[m] || { income: [], expenses: [], savings: 0 };
    const inc = mf.income.reduce((s, i) => s + i.amount, 0);
    const exp = mf.expenses.reduce((s, i) => s + i.amount, 0);
    const allGoals = habits.flatMap(c => c.goals || []);
    const avgProg = allGoals.length ? Math.round(allGoals.reduce((s, g) => s + g.progress, 0) / allGoals.length) : 0;
    const completionRate = total > 0 ? Math.round(done / total * 100) : 0;

    // Eisenhower breakdown
    const eisenCounts = {
        ui: myTasks.filter(t => t.status !== 'bajarildi' && t.status !== 'bekor' && ['ota_muhim'].includes(t.priority)).length,
        nui: myTasks.filter(t => t.status !== 'bajarildi' && t.status !== 'bekor' && ['muhim'].includes(t.priority)).length,
        uni: myTasks.filter(t => t.status !== 'bajarildi' && t.status !== 'bekor' && ['orta'].includes(t.priority)).length,
        nuni: myTasks.filter(t => t.status !== 'bajarildi' && t.status !== 'bekor' && ['past'].includes(t.priority)).length,
    };

    // Pomodoro stats
    const pomoSessions = loadData(STORAGE_KEYS.pomodoro, { sessions: 0 })?.sessions || 0;

    // Weekly comparison
    const now = new Date();
    const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - now.getDay());
    const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const thisWeekDone = myTasks.filter(t => t.completedAt && new Date(t.completedAt) >= thisWeekStart).length;
    const lastWeekDone = myTasks.filter(t => t.completedAt && new Date(t.completedAt) >= lastWeekStart && new Date(t.completedAt) < thisWeekStart).length;
    const weekTrend = thisWeekDone - lastWeekDone;
    const weekArrow = weekTrend > 0 ? '📈' : weekTrend < 0 ? '📉' : '➡️';

    // Calculate 7-day activity sparkline
    const sparkDays = [];
    for (let d = 6; d >= 0; d--) {
        const dt = new Date(); dt.setDate(dt.getDate() - d);
        const ds = dt.toISOString().slice(0, 10);
        const dayCreated = myTasks.filter(t => t.created?.slice(0, 10) === ds).length;
        const dayDone = myTasks.filter(t => t.completedAt?.slice(0, 10) === ds).length;
        sparkDays.push({ label: dt.toLocaleDateString('uz', { weekday: 'short' }), created: dayCreated, done: dayDone, total: dayCreated + dayDone });
    }
    const sparkMax = Math.max(1, ...sparkDays.map(d => d.total));

    // Category breakdown
    const catCounts = {};
    myTasks.filter(t => t.status !== 'bajarildi' && t.status !== 'bekor').forEach(t => {
        catCounts[t.category || 'Бошқа'] = (catCounts[t.category || 'Бошқа'] || 0) + 1;
    });
    const catColors = { 'Ish': '#C07840', 'Shaxsiy': '#3B9B6E', 'O\'qish': '#4A7FBF', 'Sog\'liq': '#D4930E', 'Moliya': '#9B59B6', 'Oila': '#C44D4D' };

    document.getElementById('dashboardStats').innerHTML = `
        <div class="stat-card" style="cursor:pointer" onclick="dashboardCardClick('tasks')"><div class="stat-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg></div>
        <div class="stat-info"><div class="stat-label">${t('dash.totalTasks')}</div><div class="stat-value">${total}</div><div class="stat-sub">${done} ${t('dash.completed')} · ${inProgress} жараёнда${review ? ' · 🔍' + review : ''}</div></div></div>

        <div class="stat-card" style="cursor:pointer" onclick="dashboardCardClick('productivity')"><div class="stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
        <div class="stat-info"><div class="stat-label">${t('dash.productivity')}</div><div class="stat-value">${getTodayProductivity()}%</div><div class="stat-sub">${t('dash.todayResult')}${focus ? ' · 🎯' + focus + ' фокус' : ''}</div></div></div>

        <div class="stat-card" style="cursor:pointer" onclick="dashboardCardClick('finance')"><div class="stat-icon yellow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
        <div class="stat-info"><div class="stat-label">${t('dash.balance')} (${getMonthName(m)})</div><div class="stat-value">${formatNum(inc - exp)}</div><div class="stat-sub">${t('dash.income')}: ${formatNum(inc)} · Xar: ${formatNum(exp)}</div></div></div>

        <div class="stat-card" style="cursor:pointer" onclick="dashboardCardClick('habits')"><div class="stat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg></div>
        <div class="stat-info"><div class="stat-label">${t('dash.goals')}</div><div class="stat-value">${avgProg}%</div><div class="stat-sub">${allGoals.length} ${t('dash.goalsCount')}</div></div></div>

        <div class="stat-card" style="cursor:pointer" onclick="dashboardCardClick('tasks')"><div class="stat-icon" style="background:rgba(196,77,77,0.1);color:#C44D4D"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
        <div class="stat-info"><div class="stat-label">Муддати ўтган</div><div class="stat-value">${overdue}</div><div class="stat-sub">${overdue > 0 ? '⚠️ Диққат талаб этади' : '✅ Ҳаммаси вақтида'}</div></div></div>

        <div class="stat-card" style="cursor:pointer" onclick="dashboardCardClick('tasks')"><div class="stat-icon" style="background:rgba(155,89,182,0.1);color:#9B59B6"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <div class="stat-info"><div class="stat-label">🍅 Помодоро</div><div class="stat-value">${pomoSessions}</div><div class="stat-sub">≈ ${Math.round(pomoSessions * 25 / 60)} соат фокус</div></div></div>`;

    // Enhanced middle section with progress + sparkline + priority + categories
    const midSection = document.getElementById('dashboardMid');
    if (midSection) midSection.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px">
            <div class="card" style="padding:20px">
                <h4 style="margin:0 0 12px;font-size:0.9rem;color:var(--text-dark)">📊 Бажарилиш даражаси</h4>
                <div style="background:rgba(180,140,100,0.08);border-radius:10px;height:24px;overflow:hidden;position:relative;margin-bottom:16px">
                    <div style="height:100%;width:${completionRate}%;background:linear-gradient(90deg,#3B9B6E,#4ABB8A);border-radius:10px;transition:width 0.8s ease"></div>
                    <span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:0.75rem;font-weight:700;color:var(--text-dark)">${completionRate}% (${done}/${total})</span>
                </div>
                <h4 style="margin:0 0 8px;font-size:0.85rem;color:var(--text-muted)">📈 7 кунлик фаоллик</h4>
                <div style="display:flex;align-items:flex-end;gap:4px;height:60px;padding-bottom:4px">
                    ${sparkDays.map(d => `
                        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
                            <div style="width:100%;display:flex;flex-direction:column;gap:1px;align-items:center;height:50px;justify-content:flex-end">
                                <div style="width:80%;height:${Math.max(2, d.done / sparkMax * 40)}px;background:#3B9B6E;border-radius:3px 3px 0 0;transition:height 0.5s" title="${d.done} бажарилди"></div>
                                <div style="width:80%;height:${Math.max(2, d.created / sparkMax * 40)}px;background:#C07840;border-radius:0 0 3px 3px;transition:height 0.5s" title="${d.created} яратилди"></div>
                            </div>
                            <span style="font-size:0.6rem;color:var(--text-muted)">${d.label}</span>
                        </div>`).join('')}
                </div>
                <div style="display:flex;gap:12px;margin-top:8px;font-size:0.7rem;color:var(--text-muted)">
                    <span><span style="display:inline-block;width:8px;height:8px;background:#3B9B6E;border-radius:2px"></span> Бажарилди</span>
                    <span><span style="display:inline-block;width:8px;height:8px;background:#C07840;border-radius:2px"></span> Яратилди</span>
                </div>
            </div>
            <div class="card" style="padding:20px">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                    <div>
                        <h4 style="margin:0 0 10px;font-size:0.9rem;color:var(--text-dark)">⚡ Приоритетлар</h4>
                        <div style="display:flex;flex-direction:column;gap:6px">
                            <div style="display:flex;align-items:center;gap:8px"><span style="background:#C44D4D20;color:#C44D4D;padding:3px 10px;border-radius:6px;font-size:0.75rem;font-weight:600;min-width:40px;text-align:center">‼️ ${eisenCounts.ui}</span><span style="font-size:0.75rem;color:var(--text-muted)">Ўта муҳим</span></div>
                            <div style="display:flex;align-items:center;gap:8px"><span style="background:#D4930E20;color:#D4930E;padding:3px 10px;border-radius:6px;font-size:0.75rem;font-weight:600;min-width:40px;text-align:center">⚡ ${eisenCounts.nui}</span><span style="font-size:0.75rem;color:var(--text-muted)">Муҳим</span></div>
                            <div style="display:flex;align-items:center;gap:8px"><span style="background:#4A7FBF20;color:#4A7FBF;padding:3px 10px;border-radius:6px;font-size:0.75rem;font-weight:600;min-width:40px;text-align:center">📌 ${eisenCounts.uni}</span><span style="font-size:0.75rem;color:var(--text-muted)">Ўртача</span></div>
                            <div style="display:flex;align-items:center;gap:8px"><span style="background:#9C8B7A20;color:#9C8B7A;padding:3px 10px;border-radius:6px;font-size:0.75rem;font-weight:600;min-width:40px;text-align:center">💤 ${eisenCounts.nuni}</span><span style="font-size:0.75rem;color:var(--text-muted)">Паст</span></div>
                        </div>
                    </div>
                    <div>
                        <h4 style="margin:0 0 10px;font-size:0.9rem;color:var(--text-dark)">📂 Категориялар</h4>
                        <div style="display:flex;flex-direction:column;gap:4px">
                            ${Object.entries(catCounts).slice(0, 5).map(([cat, cnt]) => {
        const pct = Math.round(cnt / Math.max(1, total - done) * 100);
        const clr = catColors[cat] || '#9C8B7A';
        return `<div style="display:flex;align-items:center;gap:6px">
                                    <span style="font-size:0.72rem;color:var(--text-muted);min-width:55px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${cat}</span>
                                    <div style="flex:1;height:6px;background:rgba(180,140,100,0.08);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${clr};border-radius:3px"></div></div>
                                    <span style="font-size:0.7rem;font-weight:600;color:${clr}">${cnt}</span>
                                </div>`;
    }).join('')}
                            ${Object.keys(catCounts).length === 0 ? '<span style="font-size:0.78rem;color:var(--text-muted)">Фаол вазифалар йўқ</span>' : ''}
                        </div>
                    </div>
                </div>
                <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div style="background:rgba(59,155,110,0.06);padding:12px;border-radius:10px;text-align:center">
                        <div style="font-size:0.72rem;color:var(--text-muted)">${weekArrow} Бу ҳафта</div>
                        <div style="font-size:1.3rem;font-weight:800;color:var(--text-dark)">${thisWeekDone}</div>
                        <div style="font-size:0.68rem;color:${weekTrend >= 0 ? 'var(--success)' : 'var(--danger)'}">${weekTrend >= 0 ? '+' : ''}${weekTrend} ўтган ҳафтадан</div>
                    </div>
                    <div style="background:rgba(192,120,64,0.06);padding:12px;border-radius:10px;text-align:center">
                        <div style="font-size:0.72rem;color:var(--text-muted)">🔄 Жараёнда</div>
                        <div style="font-size:1.3rem;font-weight:800;color:var(--text-dark)">${inProgress}</div>
                        <div style="font-size:0.68rem;color:var(--text-muted)">${review} текширувда</div>
                    </div>
                </div>
            </div>
        </div>`;

    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });

    const todayTasks = myTasks.filter(t => t.deadline === today && t.status !== 'bajarildi');
    document.getElementById('todayTasks').innerHTML = todayTasks.length ? todayTasks.map(t => `<div class="recent-item"><div class="recent-dot ${t.status}"></div><span class="recent-text">${t.name}</span><span class="recent-date">${t.time || ''}</span></div>`).join('') : `<p style="color:var(--text-muted);text-align:center;padding:20px">${t('dash.noTodayTasks')}</p>`;

    const tp = getTodayProductivity();
    document.getElementById('todayProductivity').innerHTML = `<div class="prod-ring" style="background:conic-gradient(var(--accent-primary) ${tp * 3.6}deg, rgba(180,140,100,0.08) 0deg)"><div style="width:90px;height:90px;border-radius:50%;background:var(--bg-secondary);display:flex;flex-direction:column;align-items:center;justify-content:center"><div class="prod-ring-value">${tp}%</div></div></div><div class="prod-ring-label">${t('dash.todayProdLevel')}</div>`;

    const overdueTasks = myTasks.filter(t => t.deadline && t.deadline < today && t.status !== 'bajarildi' && t.status !== 'bekor');
    document.getElementById('overdueTasks').innerHTML = overdueTasks.length ? overdueTasks.map(t => `<div class="recent-item"><div class="recent-dot" style="background:var(--danger)"></div><span class="recent-text">${t.name}</span><span class="recent-date" style="color:var(--danger)">${formatDate(t.deadline)}</span></div>`).join('') : `<p style="color:var(--text-muted);text-align:center;padding:20px">${t('dash.noOverdue')}</p>`;

    renderDashboardCharts(myTasks, fin, habits);
}

function getMyTasks(tasks) {
    if (isAdmin(_authUser)) return tasks;
    if (isRahbar(_authUser)) return tasks.filter(t => t.department === _authUser.department || t.createdBy === _authUser.id || t.assignedTo === _authUser.id);
    return tasks.filter(t => t.assignedTo === _authUser.id || t.createdBy === _authUser.id);
}

function getTodayProductivity() {
    const prod = loadData(STORAGE_KEYS.productivity, {});
    const key = new Date().toISOString().slice(0, 10);
    const items = loadData(STORAGE_KEYS.prodItems);
    const day = prod[key] || {};
    const checked = Object.values(day).filter(Boolean).length;
    return items.length ? Math.round(checked / items.length * 100) : 0;
}

function renderDashboardCharts(tasks, fin, habits) {
    if (charts.taskStatus) charts.taskStatus.destroy();
    if (charts.finOverview) charts.finOverview.destroy();
    if (charts.habitsOverview) charts.habitsOverview.destroy();
    const sc = { yangi: 0, jarayonda: 0, tekshiruvda: 0, bajarildi: 0, bekor: 0 };
    tasks.forEach(t => { if (sc[t.status] !== undefined) sc[t.status]++; });
    const tc = '#6B5744';
    charts.taskStatus = new Chart(document.getElementById('chartTaskStatus'), {
        type: 'doughnut', data: { labels: [t('status.yangi'), t('status.jarayonda'), t('status.tekshiruvda'), t('status.bajarildi'), t('status.bekor')], datasets: [{ data: [sc.yangi, sc.jarayonda, sc.tekshiruvda, sc.bajarildi, sc.bekor], backgroundColor: ['#4A8BC2', '#D4930E', '#9B59B6', '#3B9B6E', '#C44D4D'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: tc, padding: 12, font: { size: 12 } } }, datalabels: { display: false } } }
    });
    const m3 = [], i3 = [], e3 = [];
    for (let i = 0; i < 3; i++) { m3.push(getMonthName(i)); const mf = fin[i] || { income: [], expenses: [] }; i3.push(mf.income.reduce((s, x) => s + x.amount, 0)); e3.push(mf.expenses.reduce((s, x) => s + x.amount, 0)); }
    charts.finOverview = new Chart(document.getElementById('chartFinanceOverview'), {
        type: 'bar', data: { labels: m3, datasets: [{ label: t('dash.income'), data: i3, backgroundColor: 'rgba(59,155,110,0.5)', borderRadius: 6 }, { label: t('fin.xarajat'), data: e3, backgroundColor: 'rgba(196,77,77,0.5)', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { color: tc } }, y: { grid: { color: 'rgba(180,140,100,0.08)' }, ticks: { color: tc, callback: function (v) { return formatNumShort(v); } } } }, plugins: { legend: { labels: { color: tc } }, datalabels: { display: true, color: tc, font: { weight: '600', size: 11 }, anchor: 'end', align: 'top', formatter: function (v) { return formatNumShort(v); } }, tooltip: { callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + formatNum(ctx.raw) + " so'm"; } } } } }
    });
    const ag = habits.flatMap(c => (c.goals || []).map(g => ({ name: g.name, progress: g.progress })));
    if (ag.length) {
        charts.habitsOverview = new Chart(document.getElementById('chartHabitsOverview'), {
            type: 'bar', data: { labels: ag.map(g => g.name.length > 12 ? g.name.slice(0, 12) + '…' : g.name), datasets: [{ label: 'Progress', data: ag.map(g => g.progress), backgroundColor: ag.map((_, i) => ['rgba(192,120,64,0.5)', 'rgba(59,155,110,0.5)', 'rgba(212,147,14,0.5)', 'rgba(196,77,77,0.5)', 'rgba(74,139,194,0.5)', 'rgba(156,104,172,0.5)'][i % 6]), borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { max: 100, grid: { color: 'rgba(180,140,100,0.08)' }, ticks: { color: tc } }, y: { grid: { display: false }, ticks: { color: tc, font: { size: 11 } } } }, plugins: { legend: { display: false }, datalabels: { display: false } } }
        });
    }
}
