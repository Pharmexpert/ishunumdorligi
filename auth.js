/* ==========================================
   HAYOT BOSHQARUVCHISI 2026 — Auth System
   API-based (Node.js backend)
   v3: Real SMTP + JWT + bcrypt
   ========================================== */

const AUTH_KEYS = { token: 'hb_jwt_token', currentUser: 'hb_auth_current', notifications: 'hb_notifications' };
const API_BASE = '';

// ===== TOKEN MANAGEMENT =====
function getJwtToken() { return localStorage.getItem(AUTH_KEYS.token); }
function setJwtToken(token) { localStorage.setItem(AUTH_KEYS.token, token); }
function clearJwtToken() { localStorage.removeItem(AUTH_KEYS.token); localStorage.removeItem(AUTH_KEYS.currentUser); }

// ===== API HELPER =====
async function apiCall(endpoint, options = {}) {
    const token = getJwtToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    // Timeout after 15 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const res = await fetch(API_BASE + endpoint, { ...options, headers, signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error || 'Хатолик юз берди', status: res.status };
        }
        return { success: true, ...data };
    } catch (err) {
        clearTimeout(timeoutId);
        console.error('API error:', err);
        if (err.name === 'AbortError') {
            return { success: false, error: 'Сервер жавоб бермаяпти. Кейинроқ уриниб кўринг.' };
        }
        return { success: false, error: 'Серверга уланиб бўлмади' };
    }
}

// ===== USER MANAGEMENT =====
function getCurrentUser() {
    const u = localStorage.getItem(AUTH_KEYS.currentUser);
    return u ? JSON.parse(u) : null;
}
function setCurrentUser(user) {
    localStorage.setItem(AUTH_KEYS.currentUser, JSON.stringify(user));
}

// Fetch fresh user from server
async function fetchCurrentUser() {
    const result = await apiCall('/api/auth/me');
    if (result.success && result.user) {
        setCurrentUser(result.user);
        return result.user;
    }
    return null;
}

// For backward compatibility — getUsers returns local cache
function getUsers() {
    const cached = localStorage.getItem('hb_cached_users');
    return cached ? JSON.parse(cached) : [];
}
function saveUsers(users) {
    localStorage.setItem('hb_cached_users', JSON.stringify(users));
}

// Fetch users from API and cache
async function fetchUsers() {
    const result = await apiCall('/api/admin/users');
    if (result.success && result.users) {
        saveUsers(result.users);
        return result.users;
    }
    return getUsers();
}

function initAuthSystem() {
    // No-op in API mode — server handles seeding
}

function hashPassword(pw) {
    // No-op in API mode — server handles hashing
    return pw;
}

// ===== AUTH ACTIONS =====
async function signInWithEmail(email, password) {
    const result = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
    });
    if (result.success) {
        setJwtToken(result.token);
        setCurrentUser(result.user);
        return { success: true, user: result.user };
    }
    return { success: false, error: result.error };
}

async function signInWithGoogle() {
    // Use real Google Identity Services if available
    if (window.google && window.google.accounts) {
        return new Promise((resolve) => {
            google.accounts.id.initialize({
                client_id: '1069007349621-b47vhi16hf6rdi7phgkga9mobjvfqq3g.apps.googleusercontent.com',
                callback: async (response) => {
                    if (!response.credential) {
                        resolve({ success: false, error: 'Google тасдиқлаш бекор қилинди' });
                        return;
                    }
                    // Send ID token to server for verification
                    const result = await apiCall('/api/auth/google', {
                        method: 'POST',
                        body: JSON.stringify({ credential: response.credential })
                    });
                    if (result.success) {
                        setJwtToken(result.token);
                        setCurrentUser(result.user);
                        resolve({ success: true, user: result.user });
                    } else {
                        resolve({ success: false, error: result.error });
                    }
                },
                auto_select: false,
                context: 'signin'
            });
            // Show Google One Tap or popup
            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    // Fallback: use popup mode
                    const btn = document.createElement('div');
                    btn.id = 'g_id_signin_tmp';
                    btn.style.cssText = 'position:fixed;top:-9999px';
                    document.body.appendChild(btn);
                    google.accounts.id.renderButton(btn, {
                        type: 'standard', theme: 'outline', size: 'large'
                    });
                    // Click the rendered button automatically
                    setTimeout(() => {
                        const gBtn = btn.querySelector('[role="button"]') || btn.querySelector('div[data-type]') || btn.firstElementChild;
                        if (gBtn) gBtn.click();
                        else {
                            btn.remove();
                            // Ultimate fallback: manual email entry
                            signInWithGoogleFallback().then(resolve);
                        }
                    }, 200);
                    // Cleanup after 60 seconds
                    setTimeout(() => { if (btn.parentNode) btn.remove(); }, 60000);
                }
            });
        });
    }
    // Fallback for environments without Google Identity Services
    return signInWithGoogleFallback();
}

async function signInWithGoogleFallback() {
    return new Promise((resolve) => {
        const existing = document.getElementById('googleLoginModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'googleLoginModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s';
        modal.onclick = (e) => { if (e.target === modal) { modal.remove(); resolve({ success: false }); } };

        modal.innerHTML = `
        <div style="background:linear-gradient(135deg,#FFFBF5,#FFF3E0);border-radius:20px;padding:32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.2);border:1px solid rgba(192,120,64,0.12)">
            <div style="text-align:center;margin-bottom:24px">
                <div style="width:56px;height:56px;border-radius:50%;background:white;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.1);margin-bottom:12px">
                    <svg width="28" height="28" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                </div>
                <h3 style="margin:0;color:#3D2B1F;font-size:1.1rem">Google орқали кириш</h3>
                <p style="color:#6B5744;font-size:0.82rem;margin-top:6px">Email манзилингизни киритинг</p>
            </div>
            <div style="margin-bottom:14px">
                <label style="display:block;font-weight:600;margin-bottom:6px;font-size:0.82rem;color:#6B5744">Email</label>
                <input id="gLoginEmail" type="email" placeholder="email@example.com" style="width:100%;padding:12px 14px;border:1px solid rgba(192,120,64,0.2);border-radius:10px;font-size:0.95rem;background:white;color:#3D2B1F;box-sizing:border-box;outline:none" autofocus>
            </div>
            <div style="margin-bottom:20px">
                <label style="display:block;font-weight:600;margin-bottom:6px;font-size:0.82rem;color:#6B5744">Исм-фамилия <span style="color:#999;font-weight:400">(янги фойдаланувчилар учун)</span></label>
                <input id="gLoginName" type="text" placeholder="Исм Фамилия" style="width:100%;padding:12px 14px;border:1px solid rgba(192,120,64,0.2);border-radius:10px;font-size:0.95rem;background:white;color:#3D2B1F;box-sizing:border-box;outline:none">
            </div>
            <div style="display:flex;gap:10px">
                <button id="gLoginCancel" style="flex:1;padding:12px;border:1px solid rgba(192,120,64,0.2);background:white;border-radius:10px;cursor:pointer;font-weight:600;color:#6B5744;font-size:0.9rem">Бекор қилиш</button>
                <button id="gLoginSubmit" style="flex:1;padding:12px;border:none;background:linear-gradient(135deg,#C07840,#D4956B);color:white;border-radius:10px;cursor:pointer;font-weight:700;font-size:0.9rem">Кириш</button>
            </div>
        </div>`;

        document.body.appendChild(modal);

        const emailInput = document.getElementById('gLoginEmail');
        const nameInput = document.getElementById('gLoginName');
        emailInput.focus();

        document.getElementById('gLoginCancel').onclick = () => { modal.remove(); resolve({ success: false }); };

        const submit = async () => {
            const email = emailInput.value.trim().toLowerCase();
            const name = nameInput.value.trim();
            if (!email) { emailInput.style.borderColor = '#C44D4D'; return; }

            document.getElementById('gLoginSubmit').textContent = 'Кутинг...';
            document.getElementById('gLoginSubmit').disabled = true;

            const result = await apiCall('/api/auth/google', {
                method: 'POST',
                body: JSON.stringify({ name, email })
            });

            modal.remove();

            if (result.success) {
                setJwtToken(result.token);
                setCurrentUser(result.user);
                resolve({ success: true, user: result.user });
            } else {
                resolve({ success: false, error: result.error });
            }
        };

        document.getElementById('gLoginSubmit').onclick = submit;
        emailInput.onkeydown = (e) => { if (e.key === 'Enter') { nameInput.focus(); } };
        nameInput.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
    });
}

async function registerWithEmail(name, email, password, department, token) {
    const result = await apiCall('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            department: (department || '').trim(),
            token: token || null
        })
    });
    if (result.success) {
        if (result.autoApproved && result.token) {
            setJwtToken(result.token);
            setCurrentUser(result.user);
        }
        return {
            success: true,
            user: result.user,
            autoApproved: result.autoApproved || false,
            wasInvited: result.wasInvited || false,
            needsVerification: result.needsVerification || false
        };
    }
    return { success: false, error: result.error };
}

async function verifyCode(email, code) {
    const result = await apiCall('/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() })
    });
    return result;
}

function signOut() {
    clearJwtToken();
    localStorage.removeItem('hb_guest_mode');
    window.location.href = 'login.html';
}

// ===== GUEST MODE =====
function signInAsGuest() {
    const guestUser = {
        id: 'guest_' + Date.now(),
        name: 'Меҳмон',
        email: 'guest@demo.local',
        role: 'foydalanuvchi',
        department: '',
        status: 'approved',
        isGuest: true,
        createdAt: new Date().toISOString()
    };
    localStorage.setItem('hb_guest_mode', 'true');
    setCurrentUser(guestUser);
    // Don't set JWT token — guest has no server auth
    return { success: true, user: guestUser };
}

function isGuest(user) {
    return (user && user.isGuest) || localStorage.getItem('hb_guest_mode') === 'true';
}

function requireRegistration(actionName) {
    // Show modal prompting guest to register
    const existing = document.getElementById('guestRegModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'guestRegModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
    <div style="background:linear-gradient(135deg,#FFFBF5,#FFF3E0);border-radius:20px;padding:32px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.2);border:1px solid rgba(192,120,64,0.15);text-align:center">
        <div style="font-size:3rem;margin-bottom:12px">🔒</div>
        <h3 style="margin:0 0 8px;color:#3D2B1F;font-size:1.15rem">Рўйхатдан ўтишингиз керак</h3>
        <p style="color:#6B5744;font-size:0.88rem;margin-bottom:20px;line-height:1.5">
            ${actionName ? '<strong>«' + actionName + '»</strong> амалини бажариш учун<br>' : ''}
            платформада рўйхатдан ўтинг ёки тизимга киринг.
        </p>
        <div style="display:flex;gap:10px">
            <button onclick="document.getElementById('guestRegModal').remove()" 
                style="flex:1;padding:12px;border:1px solid rgba(192,120,64,0.2);background:white;border-radius:10px;cursor:pointer;font-weight:600;color:#6B5744;font-size:0.9rem">Бекор</button>
            <button onclick="signOut()" 
                style="flex:1;padding:12px;border:none;background:linear-gradient(135deg,#C07840,#D4956B);color:white;border-radius:10px;cursor:pointer;font-weight:700;font-size:0.9rem">📝 Рўйхатдан ўтиш</button>
        </div>
    </div>`;

    document.body.appendChild(modal);
    return false;
}

// ===== ROLE CHECKS =====
function isAdmin(user) { return user && user.role === 'admin'; }
function isRahbar(user) { return user && user.role === 'rahbar'; }
function isEkspert(user) { return user && user.role === 'ekspert'; }
function isIshchi(user) { return user && user.role === 'ishchi'; }
function canDelegate(user) { return user && (user.role === 'admin' || user.role === 'rahbar'); }
function canCreateTasks(user) { return user && user.role !== 'foydalanuvchi'; }
function canViewFinance(user) { return user && ['admin', 'rahbar', 'ekspert', 'ishchi'].includes(user.role); }
function canViewAllTeam(user) { return user && (user.role === 'admin' || user.role === 'rahbar'); }
function canAccessAdmin(user) { return user && user.role === 'admin'; }
function canEditSettings(user) { return user && (user.role === 'admin' || user.role === 'rahbar'); }
function canApproveCompletion(user) { return user && (user.role === 'admin' || user.role === 'rahbar'); }
function canReviewTasks(user) { return user && (user.role === 'ekspert' || user.role === 'rahbar' || user.role === 'admin'); }
function canInviteWorkers(user) { return user && (user.role === 'admin' || user.role === 'rahbar'); }
function canBrainstorm(user) { return user && (user.role === 'admin' || user.role === 'rahbar' || user.role === 'ekspert'); }

// ===== DEPARTMENT HELPERS =====
function getDeptWorkers(user) {
    return getUsers().filter(u => u.department === user.department && u.role === 'ishchi' && u.status === 'approved');
}
function getDeptUsers(user) {
    return getUsers().filter(u => u.department === user.department && u.status === 'approved');
}
function getAllDepartmentNames() {
    return [...new Set(getUsers().map(u => u.department).filter(Boolean))];
}

// ===== INVITATION SYSTEM =====
function getInvitations() {
    const cached = localStorage.getItem('hb_cached_invitations');
    return cached ? JSON.parse(cached) : [];
}
function saveInvitations(invs) {
    localStorage.setItem('hb_cached_invitations', JSON.stringify(invs));
}

async function fetchInvitations() {
    const result = await apiCall('/api/invitations');
    if (result.success && result.invitations) {
        saveInvitations(result.invitations);
        return result.invitations;
    }
    return getInvitations();
}

async function inviteWorker(email, department, invitedById) {
    const result = await apiCall('/api/admin/invite', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), department })
    });
    if (result.success) {
        return { success: true, invitation: result.invitation, link: result.link, emailSent: result.emailSent };
    }
    return { success: false, error: result.error };
}

async function validateInvitationToken(token) {
    const result = await apiCall('/api/invitation/' + token);
    return result;
}

function getInvitationByToken(token) {
    return getInvitations().find(inv => inv.token === token);
}

// ===== NOTIFICATION SYSTEM =====
function getNotifications(userId) {
    const all = JSON.parse(localStorage.getItem(AUTH_KEYS.notifications) || '[]');
    return all.filter(n => n.userId === userId || n.user_id === userId).sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
}

async function fetchNotifications() {
    const result = await apiCall('/api/notifications');
    if (result.success && result.notifications) {
        localStorage.setItem(AUTH_KEYS.notifications, JSON.stringify(result.notifications));
        return result.notifications;
    }
    return [];
}

function addNotification(userId, type, message, relatedId) {
    // In API mode, notifications are created server-side
    // This is a local fallback for non-critical notifications
    const all = JSON.parse(localStorage.getItem(AUTH_KEYS.notifications) || '[]');
    all.push({
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
        userId, user_id: userId,
        type,
        message,
        relatedId, related_id: relatedId,
        read: false, is_read: 0,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString()
    });
    localStorage.setItem(AUTH_KEYS.notifications, JSON.stringify(all));
}

async function markNotificationsRead(userId) {
    await apiCall('/api/notifications/read', { method: 'POST' });
    const all = JSON.parse(localStorage.getItem(AUTH_KEYS.notifications) || '[]');
    all.forEach(n => { if (n.userId === userId || n.user_id === userId) { n.read = true; n.is_read = 1; } });
    localStorage.setItem(AUTH_KEYS.notifications, JSON.stringify(all));
}

function getUnreadCount(userId) {
    return getNotifications(userId).filter(n => !n.read && !n.is_read).length;
}

// ===== ADMIN FUNCTIONS =====
async function approveUser(userId) {
    const result = await apiCall('/api/admin/approve/' + userId, { method: 'POST' });
    if (result.success) await fetchUsers();
    return result.success ? { id: userId } : null;
}

async function rejectUser(userId) {
    const result = await apiCall('/api/admin/reject/' + userId, { method: 'POST' });
    if (result.success) await fetchUsers();
    return result.success ? { id: userId } : null;
}

async function removeUser(userId) {
    const result = await apiCall('/api/admin/users/' + userId, { method: 'DELETE' });
    if (result.success) await fetchUsers();
}

async function changeUserRole(userId, newRole) {
    const result = await apiCall('/api/admin/role/' + userId, {
        method: 'POST',
        body: JSON.stringify({ role: newRole })
    });
    if (result.success) await fetchUsers();
    return result.success ? { id: userId, role: newRole } : null;
}

function getApprovedUsers() {
    return getUsers().filter(u => u.status === 'approved');
}

// ===== AUTH CHECK =====
function requireAuth() {
    // Allow guest users
    if (localStorage.getItem('hb_guest_mode') === 'true') {
        const user = getCurrentUser();
        if (user) return user;
    }
    const token = getJwtToken();
    const user = getCurrentUser();
    if (!token || !user) {
        window.location.href = 'login.html';
        return null;
    }
    // Async refresh in background
    fetchCurrentUser().then(freshUser => {
        if (!freshUser) {
            clearJwtToken();
            window.location.href = 'login.html';
        }
    });
    // Also fetch users cache for department helpers
    fetchUsers();
    return user;
}
