/* ==========================================
   HAYOT BOSHQARUVCHISI 2026 — Admin Panel
   API-based v3 — Fixed container routing + Charts
   ========================================== */

async function renderAdmin() {
    const subTab = document.querySelector('#view-admin .sub-tab.active')?.dataset?.subtab || 'adminusers';
    const users = await fetchUsers();

    if (subTab === 'adminusers') renderAdminUsers(users);
    else if (subTab === 'adminstats') renderAdminStats(users);
    else if (subTab === 'admindepts') renderAdminDepts(users);
    else if (subTab === 'admininvites') await renderAdminInvites();
}

function renderAdminUsers(allUsers) {
    const c = document.getElementById('adminUsersList');
    if (!c) return;

    // Stats row
    const total = allUsers.length;
    const approved = allUsers.filter(u => u.status === 'approved').length;
    const pending = allUsers.filter(u => u.status === 'pending').length;
    const rejected = allUsers.filter(u => u.status === 'rejected').length;
    const googleUsers = allUsers.filter(u => u.authMethod === 'google').length;

    const statsEl = document.getElementById('adminStats');
    if (statsEl) statsEl.innerHTML = `
        <div class="stat-card"><div class="stat-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
        <div class="stat-info"><div class="stat-label">Жами</div><div class="stat-value">${total}</div></div></div>

        <div class="stat-card"><div class="stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
        <div class="stat-info"><div class="stat-label">Тасдиқланган</div><div class="stat-value">${approved}</div></div></div>

        <div class="stat-card"><div class="stat-icon yellow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <div class="stat-info"><div class="stat-label">Кутилмоқда</div><div class="stat-value">${pending}</div></div></div>

        <div class="stat-card"><div class="stat-icon" style="background:rgba(196,77,77,0.1);color:#C44D4D"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
        <div class="stat-info"><div class="stat-label">Рад этилган</div><div class="stat-value">${rejected}</div></div></div>

        <div class="stat-card"><div class="stat-icon" style="background:rgba(66,133,244,0.1);color:#4285F4"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div>
        <div class="stat-info"><div class="stat-label">Google</div><div class="stat-value">${googleUsers}</div></div></div>`;

    const roleBadge = r => {
        const map = { admin: '👑', rahbar: '🏷️', ekspert: '🔬', ishchi: '👷', foydalanuvchi: '👤' };
        return `<span class="role-badge role-${r}">${map[r] || '👤'} ${r}</span>`;
    };
    const statusBadge = s => {
        const cls = { approved: 'success', pending: 'warning', rejected: 'danger' };
        const labels = { approved: 'Тасдиқланган', pending: 'Кутилмоқда', rejected: 'Рад этилган' };
        return `<span class="status-badge badge-${cls[s] || 'warning'}">${labels[s] || s}</span>`;
    };
    const authBadge = u => {
        if (u.authMethod === 'google') return '<span style="background:rgba(66,133,244,0.1);color:#4285F4;padding:2px 8px;border-radius:6px;font-size:0.72rem;font-weight:600">🔐 Google</span>';
        return '<span style="background:rgba(192,120,64,0.1);color:#C07840;padding:2px 8px;border-radius:6px;font-size:0.72rem;font-weight:600">🔑 Парол</span>';
    };

    let html = '';
    allUsers.forEach(u => {
        const lastLogin = u.last_login ? new Date(u.last_login).toLocaleDateString('uz') : 'Кирмаган';
        const avatarHtml = u.avatarUrl
            ? `<img src="${u.avatarUrl}" alt="${u.name}" style="width:44px;height:44px;border-radius:50%;object-fit:cover">`
            : `<div class="user-avatar">${u.avatar || u.name?.charAt(0) || '?'}</div>`;
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ');
        html += `
        <div class="admin-user-card" data-status="${u.status}" data-role="${u.role}">
            ${avatarHtml}
            <div class="user-info">
                <div class="user-name">${u.name}${fullName && fullName !== u.name ? ` <span style="color:#9C8B7A;font-size:0.8rem">(${fullName})</span>` : ''}</div>
                <div class="user-email">${u.email}${u.phone ? ` · 📞 ${u.phone}` : ''}</div>
                <div class="user-dept">${u.department || '—'}</div>
                <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">${roleBadge(u.role)} ${statusBadge(u.status)} ${authBadge(u)}</div>
                <div style="font-size:0.72rem;color:#9C8B7A;margin-top:4px">📅 Сўнгги кириш: ${lastLogin}</div>
            </div>
            <div class="user-actions">
                ${u.status === 'pending' ? `
                    <button class="btn-sm btn-success" onclick="adminApprove('${u.id}')">✓ Тасдиқлаш</button>
                    <button class="btn-sm btn-danger" onclick="adminReject('${u.id}')">✗ Рад этиш</button>
                ` : ''}
                <button class="btn-sm" style="background:rgba(74,127,191,0.1);color:#4A7FBF;border:1px solid rgba(74,127,191,0.2)" onclick="adminEditUser('${u.id}')">✏️ Таҳрирлаш</button>
                <select class="role-select" onchange="adminChangeRole('${u.id}', this.value)">
                    ${['admin', 'rahbar', 'ekspert', 'ishchi', 'foydalanuvchi'].map(r =>
            `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`
        ).join('')}
                </select>
                <button class="btn-sm btn-danger" onclick="adminRemove('${u.id}')">🗑️</button>
            </div>
        </div>`;
    });
    c.innerHTML = html || '<p style="color:#9C8B7A;text-align:center;padding:40px;">Фойдаланувчилар топилмади</p>';

    // Filter handlers
    const filterRole = document.getElementById('adminFilterRole');
    const filterStatus = document.getElementById('adminFilterStatus');
    const applyFilters = () => {
        const role = filterRole?.value || 'all';
        const status = filterStatus?.value || 'all';
        document.querySelectorAll('.admin-user-card').forEach(card => {
            const matchRole = role === 'all' || card.dataset.role === role;
            const matchStatus = status === 'all' || card.dataset.status === status;
            card.style.display = (matchRole && matchStatus) ? '' : 'none';
        });
    };
    if (filterRole) filterRole.onchange = applyFilters;
    if (filterStatus) filterStatus.onchange = applyFilters;
}

function renderAdminStats(users) {
    const c = document.getElementById('adminStatsContent');
    if (!c) return;

    const total = users.length;
    const approved = users.filter(u => u.status === 'approved').length;
    const pending = users.filter(u => u.status === 'pending').length;
    const rejected = users.filter(u => u.status === 'rejected').length;

    // Role distribution
    const byRole = {};
    users.forEach(u => { byRole[u.role] = (byRole[u.role] || 0) + 1; });

    // Department distribution
    const byDept = {};
    users.filter(u => u.department).forEach(u => { byDept[u.department] = (byDept[u.department] || 0) + 1; });

    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = users.filter(u => u.created_at && new Date(u.created_at) >= thirtyDaysAgo);

    // Activity by day (last 7 days)
    const dayLabels = [];
    const dayData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        dayLabels.push(d.toLocaleDateString('uz', { weekday: 'short' }));
        dayData.push(users.filter(u => u.created_at?.slice(0, 10) === dateStr || u.last_login?.slice(0, 10) === dateStr).length);
    }

    c.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px">
        <div class="stat-card"><div class="stat-value" style="font-size:2rem">${total}</div><div class="stat-label">Жами фойдаланувчилар</div></div>
        <div class="stat-card"><div class="stat-value" style="font-size:2rem;color:#3B9B6E">${approved}</div><div class="stat-label">Тасдиқланган</div></div>
        <div class="stat-card"><div class="stat-value" style="font-size:2rem;color:#D4930E">${pending}</div><div class="stat-label">Кутилмоқда</div></div>
        <div class="stat-card"><div class="stat-value" style="font-size:2rem;color:#C44D4D">${rejected}</div><div class="stat-label">Рад этилган</div></div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;margin-bottom:24px">
        <div class="card">
            <h3 class="card-title">👥 Роллар бўйича</h3>
            <div class="chart-container" style="height:250px"><canvas id="chartAdminRoles"></canvas></div>
        </div>
        <div class="card">
            <h3 class="card-title">🏢 Бўлимлар бўйича</h3>
            <div class="chart-container" style="height:250px"><canvas id="chartAdminDepts"></canvas></div>
        </div>
    </div>

    <div class="card" style="margin-bottom:24px">
        <h3 class="card-title">📊 Ҳафталик фаоллик (кириш + рўйхатдан ўтиш)</h3>
        <div class="chart-container" style="height:200px"><canvas id="chartAdminActivity"></canvas></div>
    </div>

    <div class="card">
        <h3 class="card-title">📋 Сўнгги рўйхатдан ўтганлар (30 кун)</h3>
        <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
                <thead><tr style="border-bottom:1px solid rgba(180,140,100,0.12)">
                    <th style="text-align:left;padding:8px;color:#6B5744">Исм</th>
                    <th style="text-align:left;padding:8px;color:#6B5744">Email</th>
                    <th style="text-align:left;padding:8px;color:#6B5744">Рол</th>
                    <th style="text-align:left;padding:8px;color:#6B5744">Сана</th>
                    <th style="text-align:left;padding:8px;color:#6B5744">Статус</th>
                </tr></thead>
                <tbody>
                    ${recentUsers.length ? recentUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(u => `
                        <tr style="border-bottom:1px solid rgba(180,140,100,0.06)">
                            <td style="padding:8px;color:#3D2B1F">${u.name}</td>
                            <td style="padding:8px;color:#6B5744">${u.email}</td>
                            <td style="padding:8px"><span class="role-badge role-${u.role}">${u.role}</span></td>
                            <td style="padding:8px;color:#9C8B7A">${new Date(u.created_at).toLocaleDateString('uz')}</td>
                            <td style="padding:8px"><span class="status-badge badge-${u.status === 'approved' ? 'success' : u.status === 'pending' ? 'warning' : 'danger'}">${u.status}</span></td>
                        </tr>
                    `).join('') : '<tr><td colspan="5" style="padding:20px;text-align:center;color:#9C8B7A">Сўнгги 30 кунда рўйхатдан ўтган фойдаланувчи йўқ</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>`;

    // Render charts
    setTimeout(() => {
        const tc = '#6B5744';
        const roleEmojis = { admin: '👑', rahbar: '🏷️', ekspert: '🔬', ishchi: '👷', foydalanuvchi: '👤' };

        // Roles doughnut
        const rolesCanvas = document.getElementById('chartAdminRoles');
        if (rolesCanvas) {
            new Chart(rolesCanvas, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(byRole).map(r => `${roleEmojis[r] || ''} ${r}`),
                    datasets: [{
                        data: Object.values(byRole),
                        backgroundColor: ['#C07840', '#3B9B6E', '#4A7FBF', '#D4930E', '#9C8B7A'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: tc, padding: 12, font: { size: 12 } } } }
                }
            });
        }

        // Departments bar
        const deptsCanvas = document.getElementById('chartAdminDepts');
        if (deptsCanvas) {
            const deptNames = Object.keys(byDept).map(d => d.length > 20 ? d.slice(0, 20) + '…' : d);
            new Chart(deptsCanvas, {
                type: 'bar',
                data: {
                    labels: deptNames,
                    datasets: [{
                        label: 'Ходимлар сони',
                        data: Object.values(byDept),
                        backgroundColor: ['rgba(192,120,64,0.5)', 'rgba(59,155,110,0.5)', 'rgba(74,127,191,0.5)', 'rgba(212,147,14,0.5)'],
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                    scales: { x: { grid: { color: 'rgba(180,140,100,0.08)' }, ticks: { color: tc } }, y: { grid: { display: false }, ticks: { color: tc, font: { size: 11 } } } },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // Activity line
        const actCanvas = document.getElementById('chartAdminActivity');
        if (actCanvas) {
            new Chart(actCanvas, {
                type: 'line',
                data: {
                    labels: dayLabels,
                    datasets: [{
                        label: 'Фаоллик',
                        data: dayData,
                        borderColor: '#C07840',
                        backgroundColor: 'rgba(192,120,64,0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#C07840',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { x: { grid: { display: false }, ticks: { color: tc } }, y: { beginAtZero: true, grid: { color: 'rgba(180,140,100,0.08)' }, ticks: { color: tc, stepSize: 1 } } },
                    plugins: { legend: { display: false } }
                }
            });
        }
    }, 100);
}

function renderAdminDepts(users) {
    const c = document.getElementById('adminDeptsContent');
    if (!c) return;

    const depts = {};
    users.filter(u => u.department).forEach(u => {
        if (!depts[u.department]) depts[u.department] = [];
        depts[u.department].push(u);
    });

    let html = '';
    Object.entries(depts).forEach(([dept, members]) => {
        const approved = members.filter(m => m.status === 'approved').length;
        const rahbars = members.filter(m => m.role === 'rahbar').length;
        const ishchilar = members.filter(m => m.role === 'ishchi').length;
        const ekspertlar = members.filter(m => m.role === 'ekspert').length;

        html += `
        <div class="dept-card" style="margin-bottom:16px; padding:20px; background:rgba(180,140,100,0.04); border-radius:14px; border:1px solid rgba(180,140,100,0.08);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <h4 style="color:#3D2B1F; margin:0; font-size:1rem;">🏢 ${dept}</h4>
                <span style="background:rgba(192,120,64,0.1);color:#C07840;padding:4px 10px;border-radius:6px;font-size:0.78rem;font-weight:600">${members.length} ходим</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
                ${members.map(m => `<span class="role-badge role-${m.role}" style="margin:2px 0">${m.avatar || m.name?.charAt(0)} ${m.name} (${m.role})</span>`).join('')}
            </div>
            <div style="display:flex;gap:16px;font-size:0.78rem;color:#9C8B7A;">
                <span>✅ Тасдиқланган: ${approved}</span>
                <span>🏷️ Раҳбарлар: ${rahbars}</span>
                <span>🔬 Экспертлар: ${ekspertlar}</span>
                <span>👷 Ишчилар: ${ishchilar}</span>
            </div>
        </div>`;
    });
    c.innerHTML = html || '<p style="color:#9C8B7A;text-align:center;padding:40px;">Бўлимлар топилмади</p>';
}

async function adminApprove(userId) {
    const result = await approveUser(userId);
    if (result) {
        showToast(t('admin.userApproved') || 'Фойдаланувчи тасдиқланди');
        renderAdmin();
    }
}

async function adminReject(userId) {
    if (!confirm('Ростдан ҳам рад этмоқчимисиз?')) return;
    const result = await rejectUser(userId);
    if (result) {
        showToast(t('admin.userRejected') || 'Фойдаланувчи рад этилди');
        renderAdmin();
    }
}

async function adminRemove(userId) {
    if (!confirm('Ростдан ҳам ўчирмоқчимисиз? Бу амални ортга қайтариб бўлмайди!')) return;
    await removeUser(userId);
    showToast('Фойдаланувчи ўчирилди');
    renderAdmin();
}

async function adminChangeRole(userId, newRole) {
    const result = await changeUserRole(userId, newRole);
    if (result) {
        showToast(`Рол ўзгартирилди: ${newRole}`);
        renderAdmin();
    }
}

async function renderAdminInvites() {
    const c = document.getElementById('adminInvitesContent');
    if (!c) return;

    c.innerHTML = '<div style="text-align:center;padding:40px;color:#9C8B7A;">Юкланмоқда...</div>';

    const invitations = await fetchInvitations();
    let html = '';

    if (invitations.length === 0) {
        html = '<p style="color:#9C8B7A; text-align:center; padding:40px;">Таклифномалар йўқ</p>';
    } else {
        html = '<div class="admin-users-list">';
        invitations.forEach(inv => {
            const statusCls = inv.status === 'accepted' ? 'success' : (inv.status === 'cancelled' ? 'danger' : (new Date(inv.expires_at) < new Date() ? 'danger' : 'warning'));
            const statusLabel = inv.status === 'accepted' ? '✅ Қабул қилинган' : (inv.status === 'cancelled' ? '🚫 Бекор қилинган' : (new Date(inv.expires_at) < new Date() ? '⏰ Муддати ўтган' : '⏳ Кутилмоқда'));

            html += `
            <div class="admin-user-card">
                <div class="user-avatar">✉️</div>
                <div class="user-info">
                    <div class="user-name">${inv.email}</div>
                    <div class="user-dept">${inv.department || '—'}</div>
                    <div style="margin-top:6px">
                        <span class="status-badge badge-${statusCls}">${statusLabel}</span>
                    </div>
                    <div style="font-size:0.75rem; color:#9C8B7A; margin-top:4px;">
                        📅 ${new Date(inv.created_at).toLocaleDateString('uz')} | ${inv.expires_at ? 'Муддат: ' + new Date(inv.expires_at).toLocaleDateString('uz') : ''}
                    </div>
                </div>
                <div style="display:flex;gap:6px;margin-left:auto;align-items:center">
                    ${inv.status !== 'accepted' ? `<button class="btn-sm btn-success" onclick="approveInvitation('${inv.id}')" title="Тасдиқлаш">✅</button>` : ''}
                    ${inv.status !== 'accepted' ? `<button class="btn-sm btn-danger" onclick="cancelInvitation('${inv.id}')" title="Бекор қилиш">❌</button>` : ''}
                </div>
            </div>`;
        });
        html += '</div>';
    }
    c.innerHTML = html;
}

// ==========================================
// ADMIN EDIT USER MODAL
// ==========================================
async function adminEditUser(userId) {
    const users = await fetchUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return showToast('Фойдаланувчи топилмади', 'error');

    // Get departments for dropdown
    const depts = [...new Set(users.map(u => u.department).filter(Boolean))];
    const deptOptions = depts.map(d => `<option value="${d}" ${user.department === d ? 'selected' : ''}>${d}</option>`).join('');

    const modalHtml = `
    <div id="adminEditModal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)" onclick="if(event.target===this)this.remove()">
        <div style="background:linear-gradient(135deg,#FFFBF5,#FFF8F0);border-radius:20px;padding:32px;width:90%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(61,43,31,0.15);border:1px solid rgba(180,140,100,0.12)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
                <h3 style="margin:0;color:#3D2B1F;font-size:1.15rem">✏️ Фойдаланувчини таҳрирлаш</h3>
                <button onclick="document.getElementById('adminEditModal').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#9C8B7A">✕</button>
            </div>

            ${user.avatarUrl ? `<div style="text-align:center;margin-bottom:20px"><img src="${user.avatarUrl}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid rgba(192,120,64,0.2)"></div>` : ''}

            <div style="display:grid;gap:16px">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div>
                        <label style="display:block;font-size:0.8rem;color:#6B5744;margin-bottom:4px;font-weight:600">Исм</label>
                        <input id="editFirstName" value="${user.firstName || ''}" style="width:100%;padding:10px 14px;border:1px solid rgba(180,140,100,0.2);border-radius:10px;background:white;font-size:0.9rem;color:#3D2B1F;box-sizing:border-box" placeholder="Исм">
                    </div>
                    <div>
                        <label style="display:block;font-size:0.8rem;color:#6B5744;margin-bottom:4px;font-weight:600">Фамилия</label>
                        <input id="editLastName" value="${user.lastName || ''}" style="width:100%;padding:10px 14px;border:1px solid rgba(180,140,100,0.2);border-radius:10px;background:white;font-size:0.9rem;color:#3D2B1F;box-sizing:border-box" placeholder="Фамилия">
                    </div>
                </div>

                <div>
                    <label style="display:block;font-size:0.8rem;color:#6B5744;margin-bottom:4px;font-weight:600">Тўлиқ исм</label>
                    <input id="editName" value="${user.name || ''}" style="width:100%;padding:10px 14px;border:1px solid rgba(180,140,100,0.2);border-radius:10px;background:white;font-size:0.9rem;color:#3D2B1F;box-sizing:border-box" placeholder="Тўлиқ исм">
                </div>

                <div>
                    <label style="display:block;font-size:0.8rem;color:#6B5744;margin-bottom:4px;font-weight:600">📧 Email</label>
                    <input id="editEmail" value="${user.email || ''}" type="email" style="width:100%;padding:10px 14px;border:1px solid rgba(180,140,100,0.2);border-radius:10px;background:white;font-size:0.9rem;color:#3D2B1F;box-sizing:border-box" placeholder="email@example.com">
                </div>

                <div>
                    <label style="display:block;font-size:0.8rem;color:#6B5744;margin-bottom:4px;font-weight:600">📞 Телефон</label>
                    <input id="editPhone" value="${user.phone || ''}" type="tel" style="width:100%;padding:10px 14px;border:1px solid rgba(180,140,100,0.2);border-radius:10px;background:white;font-size:0.9rem;color:#3D2B1F;box-sizing:border-box" placeholder="+998 XX XXX XX XX">
                </div>

                <div>
                    <label style="display:block;font-size:0.8rem;color:#6B5744;margin-bottom:4px;font-weight:600">🏢 Бўлим / Ташкилот</label>
                    <input id="editDepartment" value="${user.department || ''}" list="deptList" style="width:100%;padding:10px 14px;border:1px solid rgba(180,140,100,0.2);border-radius:10px;background:white;font-size:0.9rem;color:#3D2B1F;box-sizing:border-box" placeholder="Бўлим номи">
                    <datalist id="deptList">${deptOptions}</datalist>
                </div>

                <div>
                    <label style="display:block;font-size:0.8rem;color:#6B5744;margin-bottom:4px;font-weight:600">👤 Рол</label>
                    <select id="editRole" style="width:100%;padding:10px 14px;border:1px solid rgba(180,140,100,0.2);border-radius:10px;background:white;font-size:0.9rem;color:#3D2B1F;box-sizing:border-box">
                        ${['admin', 'rahbar', 'ekspert', 'ishchi', 'foydalanuvchi'].map(r =>
        `<option value="${r}" ${user.role === r ? 'selected' : ''}>${{ admin: '👑 Администратор', rahbar: '🏷️ Раҳбар', ekspert: '🔬 Эксперт', ishchi: '👷 Ишчи', foydalanuvchi: '👤 Фойдаланувчи' }[r]}</option>`
    ).join('')}
                    </select>
                </div>

                <div style="font-size:0.78rem;color:#9C8B7A;padding:8px 0;border-top:1px solid rgba(180,140,100,0.08)">
                    ${user.authMethod === 'google' ? '🔐 Google орқали рўйхатдан ўтган' : '🔑 Email/парол билан рўйхатдан ўтган'}
                    · Рўйхатдан ўтган: ${user.created_at ? new Date(user.created_at).toLocaleDateString('uz') : '—'}
                </div>
            </div>

            <div style="display:flex;gap:12px;margin-top:24px">
                <button onclick="saveAdminEdit('${userId}')" style="flex:1;padding:12px;background:linear-gradient(135deg,#C07840,#D4956B);color:white;border:none;border-radius:12px;font-size:0.95rem;font-weight:700;cursor:pointer;transition:transform 0.15s" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">💾 Сақлаш</button>
                <button onclick="document.getElementById('adminEditModal').remove()" style="padding:12px 20px;background:rgba(180,140,100,0.08);color:#6B5744;border:1px solid rgba(180,140,100,0.15);border-radius:12px;font-size:0.95rem;cursor:pointer">Бекор</button>
            </div>
        </div>
    </div>`;

    // Remove existing modal if any
    document.getElementById('adminEditModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function saveAdminEdit(userId) {
    const data = {
        name: document.getElementById('editName').value,
        firstName: document.getElementById('editFirstName').value,
        lastName: document.getElementById('editLastName').value,
        email: document.getElementById('editEmail').value,
        phone: document.getElementById('editPhone').value,
        department: document.getElementById('editDepartment').value,
        role: document.getElementById('editRole').value
    };

    const result = await apiCall(`/api/admin/users/${userId}/edit`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

    if (result.success) {
        showToast('✅ Фойдаланувчи маълумотлари сақланди');
        document.getElementById('adminEditModal')?.remove();
        renderAdmin();
    } else {
        showToast(result.error || 'Хатолик юз берди', 'error');
    }
}
