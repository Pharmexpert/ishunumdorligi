/* ==========================================
   App Part 2: Tasks, Kanban, Planner, Pomodoro, Reports
   v4 FIXED: Uses correct HTML containers + compatible data schema
   Eisenhower Matrix, SMART Goals, Workflow, Brainstorming, Focus Mode, Feedback
   ========================================== */

// ===== EISENHOWER MATRIX PRIORITIES =====
const EISENHOWER = {
    urgent_important: { label: '🔴 Шошилинч + Муҳим', color: '#C44D4D', quadrant: 1, action: 'Ҳозир бажаринг' },
    not_urgent_important: { label: '🟡 Муҳим', color: '#D4930E', quadrant: 2, action: 'Режалаштиринг' },
    urgent_not_important: { label: '🔵 Шошилинч', color: '#4A7FBF', quadrant: 3, action: 'Делегация' },
    not_urgent_not_important: { label: '⚪ Паст', color: '#9C8B7A', quadrant: 4, action: 'Кейинга' }
};

// Map old priority keys to Eisenhower
function getEisenhower(task) {
    if (task.eisenhower) return task.eisenhower;
    const map = { ota_muhim: 'urgent_important', muhim: 'not_urgent_important', orta: 'urgent_not_important', past: 'not_urgent_not_important' };
    return map[task.priority] || 'not_urgent_not_important';
}

// ===== WORKFLOW STAGES =====
const WORKFLOW_STAGES = [
    { key: 'yangi', label: '📥 Янги', color: '#9C8B7A' },
    { key: 'jarayonda', label: '🔄 Жараёнда', color: '#D4930E' },
    { key: 'tekshiruvda', label: '🔍 Кўрикда', color: '#4A7FBF' },
    { key: 'bajarildi', label: '✅ Бажарилди', color: '#3B9B6E' },
    { key: 'uzoq_muddatli', label: '📌 Узоқ муддатли', color: '#7C5CBF' },
    { key: 'bekor', label: '📦 Якунланган (Архив)', color: '#9C8B7A' }
];

function getTaskName(t) { return t.name || t.title || ''; }
function getTaskStatus(t) { return t.status || 'yangi'; }

// Helper for days remaining
function getDaysRemainingInfo(deadline) {
    if (!deadline) return { days: 999, text: '' };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dl = new Date(deadline); dl.setHours(0, 0, 0, 0);
    const days = Math.ceil((dl - today) / (1000 * 60 * 60 * 24));
    if (days < 0) return { days, text: `${Math.abs(days)} кун кечикди ⚠️` };
    if (days === 0) return { days: 0, text: 'Бугун!' };
    if (days === 1) return { days: 1, text: 'Эртага' };
    return { days, text: `${days} кун қолди` };
}

// ==========================================
// TASKS — Main render (called from switchView)
// ==========================================
function renderTasks() {
    // Render task list into the existing tasklist container
    const listEl = document.getElementById('tasksList');
    if (listEl) renderTaskList(listEl);
    // Also render stats bar
    renderTasksStatsBar();
}

// Global sync: re-render ALL task views so changes propagate everywhere
function renderAllTaskViews() {
    renderTasks();
    const kb = document.getElementById('kanbanBoard'); if (kb) renderKanban(kb);
    const em = document.getElementById('eisenhowerMatrix'); if (em) renderEisenhowerMatrix(em);
    const dp = document.getElementById('dailyPlanner'); if (dp) renderDailyPlanner(dp);
    const tc = document.getElementById('tasksCalendar'); if (tc) renderTaskCalendar(tc);
}

function renderTasksStatsBar() {
    const bar = document.getElementById('tasksStatsBar');
    if (!bar) return;
    const tasks = getMyTasks(loadData(STORAGE_KEYS.tasks));
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'bajarildi').length;
    const inProgress = tasks.filter(t => t.status === 'jarayonda').length;
    const review = tasks.filter(t => t.status === 'tekshiruvda').length;
    const activeFilter = window._taskStatusFilter || 'all';
    const mkCls = (key) => activeFilter === key ? 'background:var(--accent-primary);color:white;border-color:var(--accent-primary)' : '';
    bar.innerHTML = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
            <div class="stat-card" style="cursor:pointer;padding:6px 14px;min-width:70px;text-align:center;${mkCls('all')}" onclick="filterTasksByStatus('all')">
                <div class="stat-value" style="font-size:1.1rem">${total}</div><div class="stat-label" style="font-size:0.68rem">Жами</div></div>
            <div class="stat-card" style="cursor:pointer;padding:6px 14px;min-width:70px;text-align:center;${mkCls('bajarildi')}" onclick="filterTasksByStatus('bajarildi')">
                <div class="stat-value" style="font-size:1.1rem;color:${activeFilter === 'bajarildi' ? 'white' : 'var(--success)'}">${done}</div><div class="stat-label" style="font-size:0.68rem">Бажарилди</div></div>
            <div class="stat-card" style="cursor:pointer;padding:6px 14px;min-width:70px;text-align:center;${mkCls('jarayonda')}" onclick="filterTasksByStatus('jarayonda')">
                <div class="stat-value" style="font-size:1.1rem;color:${activeFilter === 'jarayonda' ? 'white' : '#D4930E'}">${inProgress}</div><div class="stat-label" style="font-size:0.68rem">Жараёнда</div></div>
            <div class="stat-card" style="cursor:pointer;padding:6px 14px;min-width:70px;text-align:center;${mkCls('tekshiruvda')}" onclick="filterTasksByStatus('tekshiruvda')">
                <div class="stat-value" style="font-size:1.1rem;color:${activeFilter === 'tekshiruvda' ? 'white' : '#4A7FBF'}">${review}</div><div class="stat-label" style="font-size:0.68rem">Кўрикда</div></div>
        </div>`;
}

window._taskStatusFilter = 'all';
function filterTasksByStatus(status) {
    window._taskStatusFilter = status;
    renderTasksStatsBar();
    renderTaskList(document.getElementById('tasksList'));
}

function renderTaskList(c) {
    if (!c) return;
    const tasks = loadData(STORAGE_KEYS.tasks);
    let myTasks = getMyTasks(tasks);
    // Apply status filter
    if (window._taskStatusFilter && window._taskStatusFilter !== 'all') {
        myTasks = myTasks.filter(t => t.status === window._taskStatusFilter);
    }
    const addBtn = canCreateTasks(_authUser) ?
        `<div class="task-header"><button class="btn-primary" onclick="showTaskModal()">+ Қўшиш</button></div>` : '';

    // Focus Mode indicator
    const focusTasks = myTasks.filter(tk => tk.isFocus && tk.status !== 'bajarildi');
    const focusBanner = focusTasks.length > 0 ? `
        <div class="focus-banner">
            <span class="focus-icon">🎯</span>
            <span>Фокус: <strong>${getTaskName(focusTasks[0])}</strong></span>
        </div>` : '';

    if (!myTasks.length) {
        c.innerHTML = `${addBtn}<p style="text-align:center;color:var(--text-muted);padding:40px">📋 Вазифалар йўқ</p>`;
        return;
    }

    // Sort: focus first, then by eisenhower quadrant, then by deadline
    myTasks.sort((a, b) => {
        if (a.isFocus && !b.isFocus) return -1;
        if (!a.isFocus && b.isFocus) return 1;
        const qa = EISENHOWER[getEisenhower(a)]?.quadrant || 4;
        const qb = EISENHOWER[getEisenhower(b)]?.quadrant || 4;
        if (qa !== qb) return qa - qb;
        return new Date(a.deadline || '2099') - new Date(b.deadline || '2099');
    });

    c.innerHTML = addBtn + focusBanner + myTasks.map(task => {
        const eisen = EISENHOWER[getEisenhower(task)] || EISENHOWER.not_urgent_not_important;
        const wfStage = WORKFLOW_STAGES.find(s => s.key === task.status) || WORKFLOW_STAGES[0];
        const deadlineInfo = getDaysRemainingInfo(task.deadline);
        const assignee = task.assignedTo ? getUsers().find(u => u.id === task.assignedTo) : null;
        const comments = loadData(STORAGE_KEYS.comments).filter(cm => cm.taskId === task.id);
        const name = getTaskName(task);

        return `
        <div class="task-card ${task.isFocus ? 'task-focus' : ''}" data-id="${task.id}">
            <div class="task-status-bar" style="background:${wfStage.color}"></div>
            <div class="task-main">
                <div class="task-top-row">
                    <span class="eisenhower-badge" style="background:${eisen.color}20;color:${eisen.color};border:1px solid ${eisen.color}40">
                        ${eisen.label}
                    </span>
                    ${task.isFocus ? '<span class="focus-badge">🎯 Фокус</span>' : ''}
                    ${task.smartGoal ? '<span class="smart-badge">📐 SMART</span>' : ''}
                </div>
                <h4 class="task-title">${name}</h4>
                ${task.note || task.description ? `<p class="task-desc">${task.note || task.description}</p>` : ''}
                <div class="task-meta">
                    <span class="wf-badge" style="color:${wfStage.color}">${wfStage.label}</span>
                    ${task.deadline ? `<span class="deadline-badge ${deadlineInfo.days <= 1 ? 'urgent' : ''}">${deadlineInfo.text}</span>` : ''}
                    ${task.category ? `<span class="cat-badge">${task.category}</span>` : ''}
                    ${assignee ? `<span class="assignee-badge">👤 ${assignee.name}</span>` : ''}
                    ${comments.length ? `<span class="comment-count" onclick="showCommentsModal('${task.id}')">💬 ${comments.length}</span>` : ''}
                </div>
                ${task.feedback ? `<div class="task-feedback"><strong>📝 Баҳо:</strong> ${task.feedback} <span class="feedback-rating">⭐${task.feedbackRating || '-'}/5</span></div>` : ''}
            </div>
            <div class="task-actions" style="padding:6px 8px">
                ${task.status === 'yangi' ? `<button class="btn-sm btn-primary" onclick="startTask('${task.id}')">▶ Бошлаш</button>` : ''}
                ${task.status === 'jarayonda' ? `
                    <button class="btn-sm btn-success" onclick="submitForReview('${task.id}')">📤 Текшириш</button>
                    ${!task.isFocus ? `<button class="btn-sm" onclick="setFocusTask('${task.id}')">🎯</button>` : `<button class="btn-sm" onclick="clearFocus()">✖️</button>`}
                ` : ''}
                ${task.status === 'tekshiruvda' && canReviewTasks(_authUser) ? `
                    <button class="btn-sm btn-success" onclick="approveTask('${task.id}')">✓ Тасдиқ</button>
                    <button class="btn-sm btn-danger" onclick="returnTask('${task.id}')">↩ Қайтар</button>
                    <button class="btn-sm" onclick="showFeedbackModal('${task.id}')">📝</button>
                ` : ''}
                ${task.status === 'bajarildi' ? `<span style="color:var(--success);font-weight:600;font-size:0.8rem">✅ Тайёр</span>` : ''}
                <button class="btn-sm" onclick="showCommentsModal('${task.id}')">💬</button>
                ${canCreateTasks(_authUser) ? `<button class="btn-sm" onclick="showTaskModal('${task.id}')">✏️</button>` : ''}
                ${canDelegate(_authUser) ? `<button class="btn-sm btn-danger" onclick="deleteTask('${task.id}')">🗑</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

// ===== EISENHOWER MATRIX VIEW (with drag & drop) =====
function renderEisenhowerMatrix(c) {
    if (!c) return;
    const tasks = getMyTasks(loadData(STORAGE_KEYS.tasks)).filter(tk => tk.status !== 'bajarildi' && tk.status !== 'bekor' && tk.status !== 'uzoq_muddatli');
    const getQ = (q) => tasks.filter(tk => getEisenhower(tk) === q);
    const QUADS = [
        { key: 'urgent_important', cls: 'q1', title: 'Ҳозир бажаринг!' },
        { key: 'not_urgent_important', cls: 'q2', title: 'Режалаштиринг' },
        { key: 'urgent_not_important', cls: 'q3', title: 'Делегация' },
        { key: 'not_urgent_not_important', cls: 'q4', title: 'Кейинга' }
    ];

    c.innerHTML = `
    <div class="eisenhower-grid">
        <div class="eisenhower-header-row">
            <div></div>
            <div class="eisenhower-col-header">🔴 Шошилинч</div>
            <div class="eisenhower-col-header">🟢 Шошилинч эмас</div>
        </div>
        <div class="eisenhower-row-header">⚡ Муҳим</div>
        <div class="eisenhower-cell q1" data-quadrant="urgent_important">
            <h4>${QUADS[0].title}</h4>
            ${getQ('urgent_important').map(tk => `<div class="eisen-task" draggable="true" data-task-id="${tk.id}" onclick="showTaskModal('${tk.id}')">${getTaskName(tk)}</div>`).join('') || '<p class="empty-q">Бўш</p>'}
        </div>
        <div class="eisenhower-cell q2" data-quadrant="not_urgent_important">
            <h4>${QUADS[1].title}</h4>
            ${getQ('not_urgent_important').map(tk => `<div class="eisen-task" draggable="true" data-task-id="${tk.id}" onclick="showTaskModal('${tk.id}')">${getTaskName(tk)}</div>`).join('') || '<p class="empty-q">Бўш</p>'}
        </div>
        <div class="eisenhower-row-header">💤 Муҳим эмас</div>
        <div class="eisenhower-cell q3" data-quadrant="urgent_not_important">
            <h4>${QUADS[2].title}</h4>
            ${getQ('urgent_not_important').map(tk => `<div class="eisen-task" draggable="true" data-task-id="${tk.id}" onclick="showTaskModal('${tk.id}')">${getTaskName(tk)}</div>`).join('') || '<p class="empty-q">Бўш</p>'}
        </div>
        <div class="eisenhower-cell q4" data-quadrant="not_urgent_not_important">
            <h4>${QUADS[3].title}</h4>
            ${getQ('not_urgent_not_important').map(tk => `<div class="eisen-task" draggable="true" data-task-id="${tk.id}" onclick="showTaskModal('${tk.id}')">${getTaskName(tk)}</div>`).join('') || '<p class="empty-q">Бўш</p>'}
        </div>
    </div>`;
    initEisenhowerDragDrop();
}

// Map quadrant key to priority key
const QUADRANT_TO_PRIORITY = {
    'urgent_important': 'ota_muhim',
    'not_urgent_important': 'muhim',
    'urgent_not_important': 'orta',
    'not_urgent_not_important': 'past'
};

function initEisenhowerDragDrop() {
    document.querySelectorAll('.eisen-task[draggable]').forEach(card => {
        card.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', card.dataset.taskId);
            e.dataTransfer.effectAllowed = 'move';
            card.style.opacity = '0.4';
        });
        card.addEventListener('dragend', e => {
            card.style.opacity = '';
            document.querySelectorAll('.eisenhower-cell.drag-over').forEach(el => el.classList.remove('drag-over'));
        });
    });
    document.querySelectorAll('.eisenhower-cell[data-quadrant]').forEach(cell => {
        cell.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; cell.classList.add('drag-over'); });
        cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
        cell.addEventListener('drop', e => {
            e.preventDefault(); cell.classList.remove('drag-over');
            const taskId = e.dataTransfer.getData('text/plain');
            const newQuadrant = cell.dataset.quadrant;
            if (!taskId || !newQuadrant) return;
            const newPriority = QUADRANT_TO_PRIORITY[newQuadrant];
            if (!newPriority) return;
            const tasks = loadData(STORAGE_KEYS.tasks);
            const task = tasks.find(tk => tk.id === taskId);
            if (task && task.priority !== newPriority) {
                task.priority = newPriority;
                saveData(STORAGE_KEYS.tasks, tasks);
                renderAllTaskViews();
                const qLabel = EISENHOWER[newQuadrant]?.label || newQuadrant;
                showToast(`📊 ${getTaskName(task)} → ${qLabel}`);
            }
        });
    });
}

// ===== TASK ACTIONS =====
function startTask(id) {
    const tasks = loadData(STORAGE_KEYS.tasks);
    const task = tasks.find(t => t.id === id);
    if (task) { task.status = 'jarayonda'; task.startedAt = new Date().toISOString(); saveData(STORAGE_KEYS.tasks, tasks); }
    renderAllTaskViews(); showToast('▶ Вазифа бошланди');
}

function submitForReview(id) {
    const tasks = loadData(STORAGE_KEYS.tasks);
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.status = 'tekshiruvda'; task.submittedAt = new Date().toISOString(); saveData(STORAGE_KEYS.tasks, tasks);
        addNotification(task.createdBy || _authUser.id, 'task_review', `"${getTaskName(task)}" текширишга юборилди`, id);
    }
    renderTasks(); showToast('📤 Текширишга юборилди');
}

function setFocusTask(id) {
    const tasks = loadData(STORAGE_KEYS.tasks);
    tasks.forEach(t => t.isFocus = false);
    const task = tasks.find(t => t.id === id);
    if (task) task.isFocus = true;
    saveData(STORAGE_KEYS.tasks, tasks);
    renderTasks(); showToast('🎯 Фокус режим');
}

function clearFocus() {
    const tasks = loadData(STORAGE_KEYS.tasks);
    tasks.forEach(t => t.isFocus = false);
    saveData(STORAGE_KEYS.tasks, tasks);
    renderTasks();
}

function handleTaskToggle(id) {
    const tasks = loadData(STORAGE_KEYS.tasks);
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    if (t.status === 'bajarildi') { t.status = 'yangi'; t.completedAt = null; }
    else { t.status = 'bajarildi'; t.completedAt = new Date().toISOString(); t.isFocus = false; }
    saveData(STORAGE_KEYS.tasks, tasks); renderTasks();
}

function approveTask(id) {
    const tasks = loadData(STORAGE_KEYS.tasks);
    const t = tasks.find(x => x.id === id);
    if (t) {
        t.status = 'bajarildi'; t.completedAt = new Date().toISOString(); t.approvedBy = _authUser.id; t.isFocus = false;
        addNotification(t.assignedTo || t.createdBy, 'task_approved', `✅ "${getTaskName(t)}" тасдиқланди`, id);
    }
    saveData(STORAGE_KEYS.tasks, tasks); renderTasks(); showToast('✅ Тасдиқланди');
}

function returnTask(id) {
    const tasks = loadData(STORAGE_KEYS.tasks);
    const t = tasks.find(x => x.id === id);
    if (t) {
        t.status = 'jarayonda'; t.returnedAt = new Date().toISOString();
        addNotification(t.assignedTo || t.createdBy, 'task_returned', `↩ "${getTaskName(t)}" қайтарилди`, id);
    }
    saveData(STORAGE_KEYS.tasks, tasks); renderTasks(); showToast('↩ Қайтарилди');
}

function deleteTask(id) {
    if (!confirm('Ростдан ўчирасизми?')) return;
    let tasks = loadData(STORAGE_KEYS.tasks);
    tasks = tasks.filter(task => task.id !== id);
    saveData(STORAGE_KEYS.tasks, tasks); renderTasks();
}

// ===== TASK CREATE/EDIT MODAL (SMART + Eisenhower) =====
async function showTaskModal(editId, prefillDate) {
    const task = editId ? loadData(STORAGE_KEYS.tasks).find(x => x.id === editId) : null;
    const cats = loadData(STORAGE_KEYS.settings)?.taskCategories || DEFAULT_TASK_CATEGORIES;
    const defDeadline = task?.deadline || prefillDate || '';

    // Fetch all users from server for assignment
    let allUsersHtml = `<option value="">Ўзимга</option>`;
    try {
        const token = getJwtToken();
        const res = await fetch('/api/chat/users', { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        if (data.users) {
            allUsersHtml += data.users.map(u =>
                `<option value="${u.id}" data-name="${u.name}" ${task?.assignedTo === u.id ? 'selected' : ''}>${u.name} (${u.department || u.role})</option>`
            ).join('');
        }
    } catch (e) { }

    openModal(task ? 'Вазифани таҳрирлаш' : 'Янги вазифа', `
        <div class="form-group"><label class="form-label">Сарлавҳа *</label>
            <input class="form-input" id="mTitle" value="${(task ? getTaskName(task) : '').replace(/"/g, '&quot;')}" placeholder="Аниқ ва қисқа ёзинг"></div>
        <div class="form-group"><label class="form-label">Тавсиф</label>
            <textarea class="form-input" id="mDesc" rows="2" placeholder="Батафсил...">${task?.note || task?.description || ''}</textarea></div>
        <div class="form-row">
            <div class="form-group"><label class="form-label">📊 Устуворлик</label>
                <select class="form-select" id="mEisenhower">
                    ${Object.entries(EISENHOWER).map(([k, v]) =>
        `<option value="${k}" ${getEisenhower(task || {}) === k ? 'selected' : ''}>${v.label}</option>`
    ).join('')}
                </select></div>
            <div class="form-group"><label class="form-label">📁 Категория</label>
                <select class="form-select" id="mCat">
                    ${cats.map(c => `<option ${(task?.category) === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label class="form-label">📅 Муддат *</label>
                <input class="form-input" type="date" id="mDeadline" value="${defDeadline}"></div>
            <div class="form-group"><label class="form-label">⏰ Вақт</label>
                <input class="form-input" type="time" id="mTime" value="${task?.time || ''}"></div>
        </div>
        <div class="form-group"><label class="form-label">👤 Ижрочи (топшириқ тайинлаш)</label>
            <select class="form-select" id="mAssign">${allUsersHtml}</select></div>
        <div class="form-group"><label class="form-label">📐 Ўлчов мезони (SMART)</label>
            <input class="form-input" id="mSmartMeasure" value="${(task?.smartMeasure || '').replace(/"/g, '&quot;')}" placeholder="Масалан: 5 та ҳужжат тайёрлаш"></div>
        <div class="form-group">
            <label class="form-label"><input type="checkbox" id="mSmartGoal" ${task?.smartGoal ? 'checked' : ''}> 📐 SMART мақсад</label>
        </div>
        <div class="form-actions">
            <button class="btn-secondary" onclick="closeModal()">Бекор</button>
            <button class="btn-primary" onclick="saveTask('${editId || ''}')">Сақлаш</button>
        </div>`);
    // Auto-focus title
    setTimeout(() => document.getElementById('mTitle')?.focus(), 100);
}

function saveTask(editId) {
    const title = document.getElementById('mTitle').value.trim();
    if (!title) { showToast('Сарлавҳа киритинг', 'error'); return; }

    const tasks = loadData(STORAGE_KEYS.tasks);
    const assignEl = document.getElementById('mAssign');
    const assigneeId = assignEl?.value || _authUser.id;
    const assigneeName = assignEl?.selectedOptions[0]?.getAttribute('data-name') || (assigneeId === _authUser.id ? _authUser.name : '');
    const data = {
        name: title,
        note: document.getElementById('mDesc').value.trim(),
        eisenhower: document.getElementById('mEisenhower').value,
        priority: document.getElementById('mEisenhower').value === 'urgent_important' ? 'ota_muhim' :
            document.getElementById('mEisenhower').value === 'not_urgent_important' ? 'muhim' :
                document.getElementById('mEisenhower').value === 'urgent_not_important' ? 'orta' : 'past',
        category: document.getElementById('mCat')?.value || '',
        deadline: document.getElementById('mDeadline')?.value || '',
        time: document.getElementById('mTime')?.value || '',
        smartMeasure: document.getElementById('mSmartMeasure')?.value?.trim() || '',
        smartGoal: document.getElementById('mSmartGoal')?.checked || false,
        assignedTo: assigneeId,
        assigneeName: assigneeName,
    };

    if (editId) {
        const task = tasks.find(x => x.id === editId);
        if (task) Object.assign(task, data);
    } else {
        tasks.push({
            id: genId(), ...data,
            status: 'yangi', createdBy: _authUser.id, department: _authUser.department,
            isFocus: false, feedback: null, feedbackRating: null,
            created: new Date().toISOString().split('T')[0]
        });
        if (data.assignedTo && data.assignedTo !== _authUser.id) {
            addNotification(data.assignedTo, 'task_assigned', `📋 Янги вазифа: "${title}"`, tasks[tasks.length - 1].id);
        }
    }
    saveData(STORAGE_KEYS.tasks, tasks);
    closeModal(); renderTasks(); showToast(editId ? 'Ўзгартирилди ✏️' : '✅ Вазифа қўшилди');
}

// ===== FEEDBACK MODAL =====
function showFeedbackModal(taskId) {
    window._feedbackRating = 0;
    openModal('📝 Баҳо бериш', `
        <div class="form-group"><label class="form-label">Баҳо</label>
            <div class="rating-stars" id="ratingStars">
                ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-val="${i}" onclick="setRating(${i})">☆</span>`).join('')}
            </div></div>
        <div class="form-group"><label class="form-label">Изоҳ</label>
            <textarea class="form-input" id="mFeedback" rows="3" placeholder="Иш сифати ҳақида..."></textarea></div>
        <div class="form-actions">
            <button class="btn-secondary" onclick="closeModal()">Бекор</button>
            <button class="btn-primary" onclick="saveFeedback('${taskId}')">Сақлаш</button>
        </div>`);
}
function setRating(val) {
    window._feedbackRating = val;
    document.querySelectorAll('.star').forEach(s => {
        s.textContent = parseInt(s.dataset.val) <= val ? '★' : '☆';
        s.style.color = parseInt(s.dataset.val) <= val ? '#D4930E' : '#B8A898';
    });
}
function saveFeedback(taskId) {
    const tasks = loadData(STORAGE_KEYS.tasks);
    const task = tasks.find(x => x.id === taskId);
    if (task) {
        task.feedback = document.getElementById('mFeedback').value.trim();
        task.feedbackRating = window._feedbackRating;
        addNotification(task.assignedTo || task.createdBy, 'feedback', `📝 Баҳо: ⭐${task.feedbackRating}/5 — "${getTaskName(task)}"`, taskId);
    }
    saveData(STORAGE_KEYS.tasks, tasks); closeModal(); renderTasks(); showToast('📝 Баҳо сақланди');
}

// ===== COMMENTS =====
function showCommentsModal(taskId) {
    const comments = loadData(STORAGE_KEYS.comments).filter(c => c.taskId === taskId);
    const task = loadData(STORAGE_KEYS.tasks).find(t => t.id === taskId);
    openModal(`💬 ${getTaskName(task) || 'Изоҳлар'}`, `
        <div id="commentsList">${comments.map(c => `
            <div class="comment-item">
                <div class="comment-avatar">${c.avatar || '?'}</div>
                <div class="comment-body"><strong>${c.author}</strong><span class="comment-time">${timeAgo(c.createdAt)}</span><p>${c.text}</p></div>
            </div>`).join('') || '<p style="color:var(--text-muted)">Изоҳлар йўқ</p>'}
        </div>
        <div class="comment-input-row">
            <input class="form-input" id="mComment" placeholder="Изоҳ ёзинг..." onkeydown="if(event.key==='Enter')addComment('${taskId}')">
            <button class="btn-primary" onclick="addComment('${taskId}')">→</button>
        </div>`);
}
function addComment(taskId) {
    const text = document.getElementById('mComment').value.trim();
    if (!text) return;
    const comments = loadData(STORAGE_KEYS.comments);
    comments.push({ id: genId(), taskId, text, author: _authUser.name, avatar: _authUser.avatar || _authUser.name?.charAt(0), createdAt: new Date().toISOString() });
    saveData(STORAGE_KEYS.comments, comments);
    showCommentsModal(taskId);
}

// ===== KANBAN WITH DRAG & DROP =====
function renderKanban(c) {
    if (!c) { c = document.getElementById('kanbanBoard'); if (!c) return; }
    const tasks = getMyTasks(loadData(STORAGE_KEYS.tasks));
    c.innerHTML = `<div class="kanban-board">
        ${WORKFLOW_STAGES.map(stage => {
        const stageTasks = tasks.filter(tk => tk.status === stage.key);
        const isSpecial = stage.key === 'bekor' || stage.key === 'uzoq_muddatli';
        return `
            <div class="kanban-column" data-status="${stage.key}" style="${stage.key === 'bekor' ? 'opacity:0.7' : ''}">
                <div class="kanban-col-header" style="border-bottom:3px solid ${stage.color}">
                    ${stage.label} <span class="kanban-count">${stageTasks.length}</span>
                </div>
                <div class="kanban-cards" data-status="${stage.key}">
                    ${stageTasks.map(tk => {
            const eisen = EISENHOWER[getEisenhower(tk)] || EISENHOWER.not_urgent_not_important;
            const dlInfo = getDaysRemainingInfo(tk.deadline);
            return `<div class="kanban-card" draggable="true" data-task-id="${tk.id}" ${stage.key === 'bekor' ? 'style="opacity:0.6"' : ''} onclick="showTaskModal('${tk.id}')">
                            ${!isSpecial ? `<div class="kanban-eisen" style="background:${eisen.color}">${eisen.label.split(' ')[0]}</div>` : ''}
                            <div class="kanban-title" ${stage.key === 'bekor' ? 'style="text-decoration:line-through"' : ''}>${getTaskName(tk)}</div>
                            ${tk.deadline ? `<div class="kanban-deadline">${dlInfo.text}</div>` : ''}
                            ${tk.isFocus ? '<div class="kanban-focus">🎯</div>' : ''}
                        </div>`;
        }).join('') || `<p class="kanban-empty">${stage.key === 'bekor' ? 'Архив бўш' : stage.key === 'uzoq_muddatli' ? 'Бўш' : '—'}</p>`}
                </div>
            </div>`;
    }).join('')}
    </div>`;
    // Attach drag-and-drop events
    initKanbanDragDrop();
}

function initKanbanDragDrop() {
    let draggedId = null;
    // Drag start/end on cards
    document.querySelectorAll('.kanban-card[draggable]').forEach(card => {
        card.addEventListener('dragstart', e => {
            draggedId = card.dataset.taskId;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedId);
            // Prevent onclick from firing after drag
            setTimeout(() => card.style.opacity = '0.4', 0);
        });
        card.addEventListener('dragend', e => {
            card.classList.remove('dragging');
            card.style.opacity = '';
            document.querySelectorAll('.kanban-cards.drag-over').forEach(el => el.classList.remove('drag-over'));
        });
    });
    // Drop zones
    document.querySelectorAll('.kanban-cards[data-status]').forEach(zone => {
        zone.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', e => {
            zone.classList.remove('drag-over');
        });
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const taskId = e.dataTransfer.getData('text/plain');
            const newStatus = zone.dataset.status;
            if (!taskId || !newStatus) return;
            const tasks = loadData(STORAGE_KEYS.tasks);
            const task = tasks.find(tk => tk.id === taskId);
            if (task && task.status !== newStatus) {
                task.status = newStatus;
                if (newStatus === 'jarayonda' && !task.startedAt) task.startedAt = new Date().toISOString();
                if (newStatus === 'bajarildi') { task.completedAt = new Date().toISOString(); task.isFocus = false; }
                saveData(STORAGE_KEYS.tasks, tasks);
                renderAllTaskViews();
                showToast(`📋 ${getTaskName(task)} → ${(WORKFLOW_STAGES.find(s => s.key === newStatus) || {}).label || newStatus}`);
            }
        });
    });
}

// ===== BRAINSTORMING =====
function renderBrainstorming(c) {
    if (!c) { c = document.getElementById('brainstormBoard'); if (!c) return; }
    const ideas = loadData('hb_ideas');
    c.innerHTML = `
    <div class="brainstorm-header">
        <h3>💡 Ғоялар доскаси</h3>
        <button class="btn-primary" onclick="addIdea()">+ Ғоя қўшиш</button>
    </div>
    <div class="ideas-grid">
        ${ideas.length ? ideas.sort((a, b) => (b.votes || 0) - (a.votes || 0)).map(idea => `
            <div class="idea-card ${idea.status === 'approved' ? 'idea-approved' : ''}">
                <div class="idea-category">${idea.category || '💡'}</div>
                <h4>${idea.title}</h4>
                <p>${idea.description || ''}</p>
                <div class="idea-meta"><span>👤 ${idea.author}</span><span>${timeAgo(idea.createdAt)}</span></div>
                <div class="idea-actions">
                    <button class="btn-sm ${idea.votedBy?.includes(_authUser.id) ? 'voted' : ''}" onclick="voteIdea('${idea.id}')">👍 ${idea.votes || 0}</button>
                    <button class="btn-sm" onclick="ideaToCalendar('${idea.id}')" title="Вазифага айлантириш">📅</button>
                    ${canApproveCompletion(_authUser) ? `<button class="btn-sm btn-success" onclick="approveIdea('${idea.id}')">✓</button><button class="btn-sm btn-danger" onclick="deleteIdea('${idea.id}')">✗</button>` : ''}
                </div>
            </div>`).join('') : '<p style="text-align:center;padding:40px;color:var(--text-muted)">Ҳали ғоялар йўқ. Биринчи бўлинг!</p>'}
    </div>`;
}

function addIdea() {
    openModal('💡 Янги ғоя', `
        <div class="form-group"><label class="form-label">Сарлавҳа</label><input class="form-input" id="mIdeaTitle" placeholder="Ғоянгиз"></div>
        <div class="form-group"><label class="form-label">Тавсиф</label><textarea class="form-input" id="mIdeaDesc" rows="3" placeholder="Батафсил..."></textarea></div>
        <div class="form-group"><label class="form-label">Категория</label>
            <select class="form-select" id="mIdeaCat">
                <option value="💡 Инновация">💡 Инновация</option><option value="⚡ Оптимизация">⚡ Оптимизация</option>
                <option value="🛠 Техник">🛠 Техник</option><option value="👥 Жамоа">👥 Жамоа</option>
            </select></div>
        <div class="form-actions"><button class="btn-secondary" onclick="closeModal()">Бекор</button><button class="btn-primary" onclick="saveIdea()">Сақлаш</button></div>`);
}
function saveIdea() {
    const title = document.getElementById('mIdeaTitle').value.trim();
    if (!title) { showToast('Сарлавҳа киритинг', 'error'); return; }
    const ideas = loadData('hb_ideas');
    ideas.push({ id: genId(), title, description: document.getElementById('mIdeaDesc').value.trim(), category: document.getElementById('mIdeaCat').value, author: _authUser.name, authorId: _authUser.id, votes: 0, votedBy: [], status: 'pending', createdAt: new Date().toISOString() });
    saveData('hb_ideas', ideas); closeModal(); renderBrainstorming(); showToast('💡 Ғоя қўшилди');
}
function voteIdea(id) {
    const ideas = loadData('hb_ideas');
    const idea = ideas.find(i => i.id === id);
    if (!idea) return;
    if (!idea.votedBy) idea.votedBy = [];
    if (idea.votedBy.includes(_authUser.id)) { idea.votedBy = idea.votedBy.filter(v => v !== _authUser.id); idea.votes = Math.max(0, (idea.votes || 1) - 1); }
    else { idea.votedBy.push(_authUser.id); idea.votes = (idea.votes || 0) + 1; }
    saveData('hb_ideas', ideas); renderBrainstorming();
}
function approveIdea(id) { const ideas = loadData('hb_ideas'); const i = ideas.find(x => x.id === id); if (i) i.status = 'approved'; saveData('hb_ideas', ideas); renderBrainstorming(); showToast('✅ Тасдиқланди'); }
function deleteIdea(id) { let ideas = loadData('hb_ideas'); ideas = ideas.filter(i => i.id !== id); saveData('hb_ideas', ideas); renderBrainstorming(); }

// ===== DAILY PLANNER =====
function renderDailyPlanner(c) {
    if (!c) { c = document.getElementById('dailyPlanner'); if (!c) return; }
    const tasks = getMyTasks(loadData(STORAGE_KEYS.tasks)).filter(t => t.status !== 'bajarildi' && t.status !== 'bekor');
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => t.deadline === today);
    const overdue = tasks.filter(t => t.deadline && t.deadline < today);
    const upcoming = tasks.filter(t => t.deadline && t.deadline > today).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);

    const renderSlot = (label, slotTasks, icon) => `
        <div class="planner-slot">
            <h4>${icon} ${label} <span class="planner-count">${slotTasks.length}</span></h4>
            ${slotTasks.map(t => `<div class="planner-task"><span class="planner-dot" style="background:${(EISENHOWER[getEisenhower(t)] || EISENHOWER.not_urgent_not_important).color}"></span> ${getTaskName(t)} ${t.time ? `<span style="color:var(--text-muted);margin-left:auto;font-size:0.78rem">${t.time}</span>` : ''}</div>`).join('') || '<p style="color:var(--text-muted);font-size:0.85rem;padding:4px 12px">—</p>'}
        </div>`;

    c.innerHTML = `<div class="daily-planner">
        <div class="planner-date"><h3>📅 ${new Date().toLocaleDateString('uz', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3></div>
        ${overdue.length ? renderSlot('Кечикаётган', overdue, '🔴') : ''}
        ${renderSlot("Бугунги вазифалар", todayTasks, '📌')}
        ${renderSlot("Келаётган", upcoming, '📆')}
    </div>`;
}

// ===== TASK CALENDAR =====
function renderTaskCalendar(c) {
    if (!c) { c = document.getElementById('tasksCalendar'); if (!c) return; }
    const tasks = loadData(STORAGE_KEYS.tasks);
    const reminders = loadData('hb_reminders');
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = now.toLocaleDateString('uz', { month: 'long', year: 'numeric' });

    let cal = `<div class="task-calendar"><h3>📅 ${monthName}</h3><div class="cal-grid"><div class="cal-head">Ду</div><div class="cal-head">Се</div><div class="cal-head">Чо</div><div class="cal-head">Па</div><div class="cal-head">Жу</div><div class="cal-head">Ша</div><div class="cal-head">Як</div>`;
    const adj = (firstDay + 6) % 7;
    for (let i = 0; i < adj; i++) cal += '<div class="cal-day empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayTasks = tasks.filter(tk => tk.deadline === dateStr);
        const dayReminders = reminders.filter(r => r.date === dateStr);
        const isToday = d === now.getDate();
        cal += `<div class="cal-day ${isToday ? 'today' : ''} ${dayTasks.length || dayReminders.length ? 'has-tasks' : ''}" onclick="showCalendarDayModal('${dateStr}')" style="cursor:pointer">
            <span class="cal-num">${d}</span>
            ${dayReminders.map(r => `<div class="cal-task cal-reminder" style="background:rgba(192,120,64,0.15);color:#C07840;font-size:0.65rem">🔔 ${r.text.slice(0, 10)}</div>`).join('')}
            ${dayTasks.slice(0, 2 - dayReminders.length).map(tk => `<div class="cal-task" style="background:${(EISENHOWER[getEisenhower(tk)] || EISENHOWER.not_urgent_not_important).color}20">${getTaskName(tk).slice(0, 12)}</div>`).join('')}
            ${(dayTasks.length + dayReminders.length) > 2 ? `<div class="cal-more">+${dayTasks.length + dayReminders.length - 2}</div>` : ''}
        </div>`;
    }
    c.innerHTML = cal + '</div></div>';
}

// Calendar day click — show reminders + tasks for that day
function showCalendarDayModal(dateStr) {
    const tasks = loadData(STORAGE_KEYS.tasks).filter(tk => tk.deadline === dateStr);
    const reminders = loadData('hb_reminders').filter(r => r.date === dateStr);
    const dateLabel = new Date(dateStr + 'T00:00:00').toLocaleDateString('uz', { weekday: 'long', day: 'numeric', month: 'long' });

    openModal(`📅 ${dateLabel}`, `
        <div style="margin-bottom:16px">
            <h4 style="margin-bottom:8px">🔔 Эслатмалар</h4>
            ${reminders.length ? reminders.map(r => `
                <div class="reminder-item" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(192,120,64,0.06);border-radius:8px;margin-bottom:6px">
                    <span style="flex:1">${r.time ? '<strong>' + r.time + '</strong> — ' : ''}${r.text}</span>
                    <button class="btn-sm" onclick="sendReminderEmail('${r.text.replace(/'/g, '')}','${dateStr}','${r.time || ''}')" title="Emailга юбориш">📧</button>
                    <button class="btn-sm btn-danger" onclick="deleteReminder('${r.id}','${dateStr}')">✗</button>
                </div>`).join('') : '<p style="color:var(--text-muted);font-size:0.85rem">Эслатмалар йўқ</p>'}
        </div>
        <div style="margin-bottom:16px">
            <h4 style="margin-bottom:8px">📋 Вазифалар</h4>
            ${tasks.length ? tasks.map(tk => `
                <div style="padding:6px 12px;background:var(--bg-secondary);border-radius:8px;margin-bottom:4px;cursor:pointer" onclick="closeModal();showTaskModal('${tk.id}')">
                    ${getTaskName(tk)} <span style="color:var(--text-muted);font-size:0.78rem">${(WORKFLOW_STAGES.find(s => s.key === tk.status) || {}).label || ''}</span>
                </div>`).join('') : '<p style="color:var(--text-muted);font-size:0.85rem">Вазифалар йўқ</p>'}
        </div>
        <hr style="border:none;border-top:1px solid rgba(180,140,100,0.12);margin:16px 0">
        <h4 style="margin-bottom:8px">➕ Янги қўшиш</h4>
        <div class="form-row" style="gap:8px">
            <input class="form-input" id="mReminderTime" type="time" style="width:100px">
            <input class="form-input" id="mReminderText" placeholder="Эслатма матни..." style="flex:1" onkeydown="if(event.key==='Enter')saveReminder('${dateStr}')">
        </div>
        <div class="form-actions" style="margin-top:12px">
            <button class="btn-secondary" onclick="closeModal();showTaskModal(null,'${dateStr}')">📋 Вазифа қўшиш</button>
            <button class="btn-secondary" onclick="saveAndEmailReminder('${dateStr}')">📧 Email</button>
            <button class="btn-primary" onclick="saveReminder('${dateStr}')">🔔 Эслатма</button>
        </div>`);
    setTimeout(() => document.getElementById('mReminderText')?.focus(), 100);
}

function saveReminder(dateStr) {
    const text = document.getElementById('mReminderText').value.trim();
    if (!text) { showToast('Матн киритинг', 'error'); return; }
    const time = document.getElementById('mReminderTime')?.value || '';
    const reminders = loadData('hb_reminders');
    reminders.push({ id: genId(), date: dateStr, time, text, createdBy: _authUser.id, createdAt: new Date().toISOString() });
    saveData('hb_reminders', reminders);
    showToast('🔔 Эслатма сақланди');
    showCalendarDayModal(dateStr);
}

function deleteReminder(id, dateStr) {
    let reminders = loadData('hb_reminders');
    reminders = reminders.filter(r => r.id !== id);
    saveData('hb_reminders', reminders);
    showCalendarDayModal(dateStr);
}

async function sendReminderEmail(text, date, time) {
    const token = getJwtToken();
    if (!token) { showToast('Авторизация керак', 'error'); return; }
    try {
        const res = await fetch('/api/reminders/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ text, date, time })
        });
        const data = await res.json();
        if (data.emailSent) showToast('📧 Email юборилди!');
        else showToast('❌ Email юборилмади: ' + (data.error || ''), 'error');
    } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

async function saveAndEmailReminder(dateStr) {
    const text = document.getElementById('mReminderText').value.trim();
    if (!text) { showToast('Матн киритинг', 'error'); return; }
    const time = document.getElementById('mReminderTime')?.value || '';
    saveReminder(dateStr);
    await sendReminderEmail(text, dateStr, time);
}

function ideaToCalendar(ideaId) {
    const ideas = loadData('hb_ideas');
    const idea = ideas.find(i => i.id === ideaId);
    if (!idea) return;
    closeModal();
    showTaskModal(null, new Date().toISOString().slice(0, 10));
    setTimeout(() => {
        const nameEl = document.getElementById('mName');
        const noteEl = document.getElementById('mNote');
        if (nameEl) nameEl.value = idea.title;
        if (noteEl) noteEl.value = idea.description || '';
    }, 200);
}

function renderTaskSettings(c) {
    if (!c) { c = document.getElementById('taskSettings'); if (!c) return; }
    const cats = loadData(STORAGE_KEYS.settings)?.taskCategories || DEFAULT_TASK_CATEGORIES;
    c.innerHTML = `<h3>⚙️ Созламалар</h3>
    <div class="form-group"><label class="form-label">Категориялар</label>
    <div id="catList">${cats.map(c => `<span class="cat-tag">${c} <span onclick="removeCat('${c}')">✗</span></span>`).join('')}</div>
    <div class="form-row" style="margin-top:8px"><input class="form-input" id="newCat" placeholder="Янги категория" onkeydown="if(event.key==='Enter')addTaskCategory()"><button class="btn-primary" onclick="addTaskCategory()">+</button></div></div>`;
}
function addTaskCategory() {
    const val = document.getElementById('newCat')?.value.trim();
    if (!val) return;
    const settings = loadData(STORAGE_KEYS.settings) || {};
    if (!settings.taskCategories) settings.taskCategories = [...DEFAULT_TASK_CATEGORIES];
    if (!settings.taskCategories.includes(val)) settings.taskCategories.push(val);
    saveData(STORAGE_KEYS.settings, settings); renderTaskSettings();
}
function removeCat(cat) {
    const settings = loadData(STORAGE_KEYS.settings) || {};
    settings.taskCategories = (settings.taskCategories || DEFAULT_TASK_CATEGORIES).filter(c => c !== cat);
    saveData(STORAGE_KEYS.settings, settings); renderTaskSettings();
}

// ===== POMODORO =====
let pomoState = { running: false, mode: 'work', time: 25 * 60, interval: null, sessions: 0 };
const POMO_TIMES = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };

function renderPomodoro(c) {
    if (!c) { c = document.getElementById('pomodoroTimer'); if (!c) return; }
    const min = Math.floor(pomoState.time / 60), sec = pomoState.time % 60;
    const modeLabels = { work: '🎯 Иш (Focus)', short: '☕ Қисқа дам', long: '🌴 Узун дам' };
    c.innerHTML = `<div class="pomo-container">
        <div class="pomo-ring" data-mode="${pomoState.mode}">
            <div class="pomo-timer" id="pomoTimerDisplay">${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}</div>
            <div class="pomo-mode">${modeLabels[pomoState.mode]}</div>
        </div>
        <div class="pomo-controls">
            <button class="btn-primary pomo-btn" onclick="togglePomo()">${pomoState.running ? '⏸ Тўхтатиш' : '▶ Бошлаш'}</button>
            <button class="btn-secondary pomo-btn" onclick="resetPomo()">🔄 Қайта</button>
        </div>
        <div class="pomo-modes">
            <button class="btn-sm ${pomoState.mode === 'work' ? 'active' : ''}" onclick="setPomoMode('work')">🎯 Иш (25)</button>
            <button class="btn-sm ${pomoState.mode === 'short' ? 'active' : ''}" onclick="setPomoMode('short')">☕ Дам (5)</button>
            <button class="btn-sm ${pomoState.mode === 'long' ? 'active' : ''}" onclick="setPomoMode('long')">🌴 Узун (15)</button>
        </div>
        <div class="pomo-stats"><div class="stat-card"><div class="stat-value">${pomoState.sessions}</div><div class="stat-label">Бугун сессиялар</div></div></div>
        <p style="color:var(--text-muted);font-size:0.82rem;text-align:center;margin-top:16px">💡 Бир вақтда фақат 1 вазифага эътибор қаратинг.</p>
    </div>`;
}
function setPomoMode(mode) { if (pomoState.running) return; pomoState.mode = mode; pomoState.time = POMO_TIMES[mode]; renderPomodoro(); updatePomoMini(); }
function togglePomo() {
    if (pomoState.running) { clearInterval(pomoState.interval); pomoState.running = false; }
    else {
        pomoState.running = true;
        pomoState.interval = setInterval(() => {
            pomoState.time--;
            if (pomoState.time <= 0) {
                clearInterval(pomoState.interval); pomoState.running = false;
                if (pomoState.mode === 'work') { pomoState.sessions++; const log = loadData(STORAGE_KEYS.pomodoro); log.push({ date: new Date().toISOString().split('T')[0], completedAt: new Date().toISOString() }); saveData(STORAGE_KEYS.pomodoro, log); showToast('🎉 Сессия тугади! Дам олинг.'); }
                else showToast('⏰ Дам тугади. Ишга қайтинг!');
                renderPomodoro();
            }
            const timerEl = document.getElementById('pomoTimerDisplay');
            if (timerEl) { const m = Math.floor(pomoState.time / 60), s = pomoState.time % 60; timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }
            updatePomoMini();
        }, 1000);
    }
    renderPomodoro(); updatePomoMini();
}
function resetPomo() { clearInterval(pomoState.interval); pomoState.running = false; pomoState.time = POMO_TIMES[pomoState.mode]; renderPomodoro(); updatePomoMini(); }
function updatePomoMini() {
    const mini = document.getElementById('pomoMiniTimer');
    const miniEl = document.getElementById('pomoMini');
    if (mini) { const m = Math.floor(pomoState.time / 60), s = pomoState.time % 60; mini.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }
    if (miniEl) miniEl.style.display = pomoState.running ? 'block' : 'none';
}

// ===== TEAM REPORT =====
function renderTeamReport(c) {
    if (!c) { c = document.getElementById('teamReport'); if (!c) return; }
    if (!canViewAllTeam(_authUser)) { c.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-muted)">Раҳбар/Админ учун</p>'; return; }
    const deptUsers = getDeptUsers(_authUser);
    const tasks = loadData(STORAGE_KEYS.tasks);

    c.innerHTML = `<div class="team-report">
        <h3>📊 Жамоа — ${_authUser.department || 'Барча'}</h3>
        <div class="stats-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:16px">
            <div class="stat-card"><div class="stat-value">${deptUsers.length}</div><div class="stat-label">Аъзолар</div></div>
            <div class="stat-card"><div class="stat-value">${tasks.filter(t => t.status === 'bajarildi').length}</div><div class="stat-label">Бажарилди</div></div>
            <div class="stat-card"><div class="stat-value">${tasks.filter(t => t.status === 'jarayonda').length}</div><div class="stat-label">Жараёнда</div></div>
        </div>
        <div class="team-members">${deptUsers.map(u => {
        const uTasks = tasks.filter(t => t.assignedTo === u.id || (t.createdBy === u.id && !t.assignedTo));
        const completed = uTasks.filter(t => t.status === 'bajarildi').length;
        const total = uTasks.length;
        const eff = total ? Math.round((completed / total) * 100) : 0;
        return `<div class="team-member-card">
                <div class="user-avatar">${u.avatar || u.name?.charAt(0)}</div>
                <div class="member-info"><strong>${u.name}</strong><span class="role-badge role-${u.role}">${u.role}</span></div>
                <div class="member-stats"><div class="member-progress"><div class="progress-bar" style="width:${eff}%"></div></div><span>${eff}% (${completed}/${total})</span></div>
            </div>`;
    }).join('')}</div>
    </div>`;
}

// ==========================================
// GOOGLE DRIVE INTEGRATION (Frontend)
// ==========================================
let _driveCurrentFolder = 'root';
let _driveBreadcrumbs = [{ id: 'root', name: 'Drive' }];

async function renderGoogleDrive() {
    const grid = document.getElementById('driveFilesGrid');
    const status = document.getElementById('driveStatus');
    if (!grid) return;

    // Check connection status
    try {
        const token = getJwtToken();
        if (!token) {
            grid.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted)"><p>⚠️ Авторизация керак</p></div>';
            return;
        }

        grid.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted)"><div class="loading-spinner" style="width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--accent-primary);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px"></div><p>Юкланмоқда...</p></div>';

        const res = await fetch(`/api/drive/files?folderId=${_driveCurrentFolder}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        if (!res.ok) {
            grid.innerHTML = `<div style="text-align:center;padding:60px;color:var(--danger)"><div style="font-size:2rem;margin-bottom:12px">❌</div><p>${data.error || 'Хато юз берди'}</p></div>`;
            return;
        }

        // Update breadcrumbs
        if (data.breadcrumbs && data.breadcrumbs.length) {
            _driveBreadcrumbs = [{ id: 'root', name: '📁 Drive' }, ...data.breadcrumbs];
        }
        renderDriveBreadcrumbs();

        const files = data.files || [];
        if (!files.length) {
            grid.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted)"><div style="font-size:3rem;margin-bottom:12px">📂</div><p>Бу папка бўш</p></div>';
            return;
        }

        // Separate folders and files
        const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
        const regularFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

        grid.innerHTML = [...folders, ...regularFiles].map(file => {
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            const icon = getDriveIcon(file.mimeType);
            const size = file.size ? formatFileSize(parseInt(file.size)) : '';
            const modified = file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('uz', { day: 'numeric', month: 'short' }) : '';

            return `<div class="drive-file-card ${isFolder ? 'drive-folder' : ''}" onclick="${isFolder ? `driveNavigate('${file.id}')` : `drivePreview('${file.id}','${file.name.replace(/'/g, "\\'")}','${file.mimeType}','${file.webViewLink || ''}')`}">
                <div class="drive-file-icon">${icon}</div>
                <div class="drive-file-info">
                    <div class="drive-file-name" title="${file.name}">${file.name}</div>
                    <div class="drive-file-meta">${size}${size && modified ? ' · ' : ''}${modified}</div>
                </div>
                <div class="drive-file-actions" onclick="event.stopPropagation()">
                    ${!isFolder ? `<button class="btn-sm" onclick="driveShareToChat('${file.id}','${file.name.replace(/'/g, "\\'")}')" title="Чатга жўнатиш">📤</button>` : ''}
                    ${!isFolder ? `<button class="btn-sm" onclick="driveDownload('${file.id}','${file.name.replace(/'/g, "\\'")}')" title="Юклаб олиш">⬇️</button>` : ''}
                    <button class="btn-sm btn-danger" onclick="driveDelete('${file.id}','${file.name.replace(/'/g, "\\'")}')" title="Ўчириш">🗑</button>
                </div>
            </div>`;
        }).join('');

        if (status) status.innerHTML = `<div style="font-size:0.78rem;color:var(--text-muted);padding:4px 0">📊 ${folders.length} папка, ${regularFiles.length} файл</div>`;

    } catch (err) {
        grid.innerHTML = `<div style="text-align:center;padding:60px;color:var(--danger)"><div style="font-size:2rem;margin-bottom:12px">❌</div><p>${err.message}</p></div>`;
    }
}

function renderDriveBreadcrumbs() {
    const el = document.getElementById('driveBreadcrumbs');
    if (!el) return;
    el.innerHTML = _driveBreadcrumbs.map((crumb, i) => {
        const isLast = i === _driveBreadcrumbs.length - 1;
        return `${i > 0 ? '<span style="color:var(--text-muted);margin:0 4px">›</span>' : ''}
            <span class="drive-crumb ${isLast ? 'active' : ''}" onclick="driveNavigate('${crumb.id}')">${crumb.name}</span>`;
    }).join('');
}

function driveNavigate(folderId) {
    _driveCurrentFolder = folderId;
    if (folderId === 'root') {
        _driveBreadcrumbs = [{ id: 'root', name: '📁 Drive' }];
    } else {
        // Trim breadcrumbs to this folder
        const idx = _driveBreadcrumbs.findIndex(b => b.id === folderId);
        if (idx >= 0) _driveBreadcrumbs = _driveBreadcrumbs.slice(0, idx + 1);
    }
    renderGoogleDrive();
}

async function driveUploadFile() {
    const input = document.getElementById('driveUploadInput');
    if (!input || !input.files.length) return;
    const token = getJwtToken();
    if (!token) { showToast('Авторизация керак', 'error'); return; }

    for (const file of input.files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderId', _driveCurrentFolder);

        try {
            showToast(`📤 Юкланмоқда: ${file.name}...`);
            const res = await fetch('/api/drive/upload', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            });
            const data = await res.json();
            if (data.success) showToast(`✅ ${file.name} юкланди`);
            else showToast(`❌ ${data.error}`, 'error');
        } catch (err) {
            showToast(`❌ ${err.message}`, 'error');
        }
    }
    input.value = '';
    renderGoogleDrive();
}

async function driveDownload(fileId, fileName) {
    const token = getJwtToken();
    if (!token) return;
    try {
        showToast(`⬇️ ${fileName} юкланмоқда...`);
        const res = await fetch(`/api/drive/download/${fileId}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) { showToast('❌ Юклаб олишда хато', 'error'); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
        showToast(`✅ ${fileName} юклаб олинди`);
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

async function driveDelete(fileId, fileName) {
    if (!confirm(`"${fileName}" ни ўчирасизми?`)) return;
    const token = getJwtToken();
    if (!token) return;
    try {
        const res = await fetch(`/api/drive/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success) { showToast(`🗑 ${fileName} ўчирилди`); renderGoogleDrive(); }
        else showToast('❌ ' + data.error, 'error');
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

async function driveCreateFolder() {
    const name = prompt('Янги папка номи:');
    if (!name || !name.trim()) return;
    const token = getJwtToken();
    if (!token) return;
    try {
        const res = await fetch('/api/drive/folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ name: name.trim(), parentId: _driveCurrentFolder })
        });
        const data = await res.json();
        if (data.success) { showToast(`📁 "${name}" папка яратилди`); renderGoogleDrive(); }
        else showToast('❌ ' + data.error, 'error');
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

function driveSearchFiles() {
    const q = document.getElementById('driveSearch')?.value?.trim();
    if (!q) { renderGoogleDrive(); return; }
    _driveCurrentFolder = 'root';
    _driveBreadcrumbs = [{ id: 'root', name: '📁 Drive' }];
    // Search will be handled by the API
    const grid = document.getElementById('driveFilesGrid');
    if (grid) grid.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted)"><p>🔍 Қидирилмоқда...</p></div>';

    const token = getJwtToken();
    fetch(`/api/drive/files?folderId=root&q=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
        .then(r => r.json())
        .then(data => {
            if (!data.files?.length) {
                grid.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted)"><p>🔍 "${q}" бўйича ҳеч нарса топилмади</p></div>`;
                return;
            }
            // Re-render with results
            const files = data.files;
            grid.innerHTML = files.map(file => {
                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                const icon = getDriveIcon(file.mimeType);
                return `<div class="drive-file-card ${isFolder ? 'drive-folder' : ''}" onclick="${isFolder ? `driveNavigate('${file.id}')` : `drivePreview('${file.id}','${file.name.replace(/'/g, "\\'")}','${file.mimeType}','${file.webViewLink || ''}')`}">
                <div class="drive-file-icon">${icon}</div>
                <div class="drive-file-info">
                    <div class="drive-file-name">${file.name}</div>
                    <div class="drive-file-meta">${file.size ? formatFileSize(parseInt(file.size)) : ''}</div>
                </div>
                <div class="drive-file-actions" onclick="event.stopPropagation()">
                    ${!isFolder ? `<button class="btn-sm" onclick="driveShareToChat('${file.id}','${file.name.replace(/'/g, "\\'")}')" title="Чатга жўнатиш">📤</button>` : ''}
                    ${!isFolder ? `<button class="btn-sm" onclick="driveDownload('${file.id}','${file.name.replace(/'/g, "\\'")}')" title="Юклаб олиш">⬇️</button>` : ''}
                    <button class="btn-sm btn-danger" onclick="driveDelete('${file.id}','${file.name.replace(/'/g, "\\'")}')" title="Ўчириш">🗑</button>
                </div>
            </div>`;
            }).join('');
        })
        .catch(err => { grid.innerHTML = `<div style="text-align:center;padding:60px;color:var(--danger)">❌ ${err.message}</div>`; });
}

function drivePreview(fileId, name, mimeType, webViewLink) {
    const isImage = mimeType.startsWith('image/');
    const isPdf = mimeType === 'application/pdf';
    const isText = /text\/|\.txt|\.md|\.csv|\.json|\.js|\.css|\.html|\.xml|\.log/.test(mimeType) || /\.(txt|md|csv|json|js|css|html|xml|log|py|yml|yaml)$/i.test(name);
    const publicUrl = `${window.location.origin}/api/drive/public/${fileId}`;
    const escapedName = name.replace(/'/g, "\\'");

    // PDF — open in new full-screen tab
    if (isPdf) {
        window.open(publicUrl, '_blank');
        return;
    }

    let previewContent = '';
    let actions = `<button class="btn-secondary" onclick="driveDownload('${fileId}','${escapedName}')">⬇️ Юклаб олиш</button>`;
    // Google Drive button for all non-text files
    actions += ` <button class="btn-primary" onclick="driveOpenInGoogle('${fileId}','${escapedName}')" style="display:inline-flex;align-items:center;gap:6px" id="googleOpenBtn_${fileId}">
        <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Google'да очиш
    </button>`;

    if (isImage) {
        previewContent = `<div style="max-height:450px;overflow:auto;margin-bottom:16px;border-radius:12px;border:1px solid rgba(180,140,100,0.15)"><img src="${publicUrl}" style="width:100%;display:block;border-radius:12px" alt="${name}"></div>`;
    } else if (isText) {
        previewContent = `<div id="textEditorArea" style="margin-bottom:16px"><p style="color:var(--text-muted);text-align:center">Юкланмоқда...</p></div>`;
        actions += ` <button class="btn-primary" id="saveTextBtn" onclick="driveEditText('${fileId}','${escapedName}')" style="display:none">💾 Сақлаш</button>`;
    } else {
        previewContent = `<div style="text-align:center;padding:30px"><div style="font-size:4rem;margin-bottom:16px">${getDriveIcon(mimeType)}</div><h3 style="margin-bottom:8px;color:var(--text-primary)">${name}</h3></div>`;
    }

    openModal(`📄 ${name}`, `
        ${previewContent}
        <div style="text-align:center;margin-bottom:12px">
            <p style="color:var(--text-muted);font-size:0.8rem">${mimeType}</p>
        </div>
        <div class="form-actions" style="flex-wrap:wrap;gap:8px">${actions}</div>`);

    if (isText) loadTextFileContent(fileId);
}

async function driveOpenInGoogle(fileId, name) {
    const btn = document.getElementById('googleOpenBtn_' + fileId);
    if (btn) { btn.textContent = '⏳ Юкланмоқда...'; btn.disabled = true; }
    const token = getJwtToken();
    if (!token) { showToast('Авторизация керак', 'error'); return; }
    try {
        const res = await fetch(`/api/drive/open-in-google/${fileId}`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success && data.url) {
            window.open(data.url, '_blank');
            if (data.mode === 'google_drive') {
                showToast(`✅ ${name} Google Docs да очилди ${data.converted ? '(конвертация қилинди)' : ''}`);
            } else if (data.mode === 'office_viewer') {
                showToast(`📄 ${name} Office Viewer да очилди`);
            } else if (data.mode === 'cached') {
                showToast(`✅ ${name} Google Docs да очилди`);
            } else {
                showToast(`📄 ${name} кўриш режимида очилди`);
            }
        } else if (data.needsReupload) {
            showToast('⚠️ Файл серверда топилмади. Файлни қайтадан юкланг.', 'error');
        } else {
            showToast('❌ ' + (data.error || 'Хато'), 'error');
        }
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
    if (btn) { btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> Google'да очиш`; btn.disabled = false; }
}

async function loadTextFileContent(fileId) {
    const token = getJwtToken();
    const area = document.getElementById('textEditorArea');
    if (!area || !token) return;
    try {
        const res = await fetch(`/api/drive/text/${fileId}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success) {
            area.innerHTML = `<textarea id="textFileContent" style="width:100%;height:350px;padding:14px;border:1px solid rgba(180,140,100,0.2);border-radius:10px;font-family:'Fira Code',monospace;font-size:0.85rem;resize:vertical;background:var(--bg-primary,#FFF8F0);color:var(--text-primary);box-sizing:border-box">${data.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>`;
            const saveBtn = document.getElementById('saveTextBtn');
            if (saveBtn) saveBtn.style.display = 'inline-flex';
        } else {
            area.innerHTML = `<p style="color:var(--danger)">${data.error}</p>`;
        }
    } catch (err) {
        area.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`;
    }
}

async function driveEditText(fileId, name) {
    const content = document.getElementById('textFileContent')?.value;
    if (content === undefined) return;
    const token = getJwtToken();
    if (!token) return;
    try {
        const res = await fetch(`/api/drive/text/${fileId}`, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ ${name} сақланди`);
        } else showToast('❌ ' + data.error, 'error');
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

function getDriveIcon(mimeType) {
    if (!mimeType) return '📄';
    if (mimeType === 'application/vnd.google-apps.folder') return '📁';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📎';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return '📦';
    return '📄';
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// ==========================================
// CANCEL INVITATION (Frontend)
// ==========================================
async function cancelInvitation(invId) {
    if (!confirm('Таклифномани бекор қиласизми?')) return;
    const token = getJwtToken();
    if (!token) return;
    try {
        const res = await fetch(`/api/invitations/${invId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success) { showToast('✅ Таклифнома бекор қилинди'); renderAdminInvites(); if (typeof renderInviteList === 'function') renderInviteList(); }
        else showToast('❌ ' + data.error, 'error');
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

// ==========================================
// APPROVE INVITATION (Frontend)
// ==========================================
async function approveInvitation(invId) {
    const token = getJwtToken();
    if (!token) return;
    try {
        const res = await fetch(`/api/invitations/${invId}/approve`, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) { showToast('✅ ' + (data.message || 'Таклифнома тасдиқланди')); renderAdminInvites(); if (typeof renderInviteList === 'function') renderInviteList(); }
        else showToast('❌ ' + data.error, 'error');
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

// ==========================================
// USER PROFILE MODAL
// ==========================================
function showProfileModal() {
    const user = getCurrentUser();
    if (!user) return;

    const existingModal = document.getElementById('profileModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'profileModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    const roleLabels = { admin: '👑 Администратор', rahbar: '🏷️ Раҳбар', ekspert: '🔬 Эксперт', ishchi: '👷 Ишчи', foydalanuvchi: '👤 Фойдаланувчи' };

    const avatarDisplay = user.avatarUrl
        ? `<img src="${user.avatarUrl}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #C07840">`
        : `<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#C07840,#D4956B);display:inline-flex;align-items:center;justify-content:center;font-size:2rem;color:white;font-weight:700">${user.avatar || user.name?.charAt(0) || 'U'}</div>`;

    modal.innerHTML = `
    <div style="background:var(--card-bg,#FFFBF5);border-radius:20px;padding:32px;max-width:480px;width:90%;max-height:85vh;overflow-y:auto;border:1px solid rgba(180,140,100,0.12);box-shadow:0 20px 60px rgba(0,0,0,0.15)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
            <h2 style="margin:0;color:var(--text-primary,#3D2B1F)">👤 Профил маълумотлари</h2>
            <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-muted)">✕</button>
        </div>

        <div style="text-align:center;margin-bottom:24px">
            <div id="profileAvatarPreview" style="position:relative;display:inline-block;cursor:pointer" onclick="document.getElementById('avatarFileInput').click()">
                ${avatarDisplay}
                <div style="position:absolute;bottom:0;right:0;width:28px;height:28px;background:#C07840;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;font-size:14px">📷</div>
            </div>
            <input type="file" id="avatarFileInput" accept="image/*" style="display:none" onchange="uploadProfileAvatar(this)">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">Расмни ўзгартириш учун устига босинг</div>
            <div style="font-weight:600;font-size:1.1rem;margin-top:8px">${user.name}</div>
            <div style="color:var(--text-muted);font-size:0.85rem">${roleLabels[user.role] || user.role}</div>
            <div style="color:var(--text-muted);font-size:0.8rem">${user.email}</div>
        </div>

        <div id="profileTabs" style="display:flex;gap:8px;margin-bottom:20px;border-bottom:2px solid rgba(180,140,100,0.1);padding-bottom:8px">
            <button class="profile-tab active" onclick="showProfileTab('info')" style="padding:8px 16px;border:none;background:linear-gradient(135deg,#C07840,#D4956B);color:white;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.85rem">📝 Маълумот</button>
            <button class="profile-tab" onclick="showProfileTab('password')" style="padding:8px 16px;border:1px solid rgba(180,140,100,0.2);background:transparent;border-radius:8px;cursor:pointer;font-weight:500;font-size:0.85rem;color:var(--text-secondary)">🔐 Парол</button>
        </div>

        <div id="profileInfoTab">
            <div style="margin-bottom:16px">
                <label style="display:block;font-weight:600;margin-bottom:6px;font-size:0.85rem;color:var(--text-secondary)">Исм-фамилия</label>
                <input id="profileName" type="text" value="${user.name || ''}" style="width:100%;padding:10px 14px;border:1px solid rgba(180,140,100,0.2);border-radius:10px;font-size:0.95rem;background:var(--bg-primary,#FFF8F0);color:var(--text-primary);box-sizing:border-box">
            </div>
            <div style="margin-bottom:16px">
                <label style="display:block;font-weight:600;margin-bottom:6px;font-size:0.85rem;color:var(--text-secondary)">Email</label>
                <input type="text" value="${user.email}" disabled style="width:100%;padding:10px 14px;border:1px solid rgba(180,140,100,0.1);border-radius:10px;font-size:0.95rem;background:rgba(180,140,100,0.05);color:var(--text-muted);box-sizing:border-box">
            </div>
            <div style="margin-bottom:16px">
                <label style="display:block;font-weight:600;margin-bottom:6px;font-size:0.85rem;color:var(--text-secondary)">Аватар (ҳарф — расм бўлмаса)</label>
                <input id="profileAvatar" type="text" value="${user.avatar || ''}" maxlength="2" style="width:60px;padding:10px 14px;border:1px solid rgba(180,140,100,0.2);border-radius:10px;font-size:1.2rem;text-align:center;background:var(--bg-primary,#FFF8F0);color:var(--text-primary)">
            </div>
            <button onclick="saveProfileInfo()" style="width:100%;padding:12px;background:linear-gradient(135deg,#C07840,#D4956B);color:white;border:none;border-radius:12px;font-weight:700;cursor:pointer;font-size:0.95rem">💾 Сақлаш</button>
        </div>

        <div id="profilePasswordTab" style="display:none">
            <div style="margin-bottom:16px">
                <label style="display:block;font-weight:600;margin-bottom:6px;font-size:0.85rem;color:var(--text-secondary)">Жорий парол</label>
                <input id="profileCurPw" type="password" placeholder="••••••••" style="width:100%;padding:10px 14px;border:1px solid rgba(180,140,100,0.2);border-radius:10px;font-size:0.95rem;background:var(--bg-primary,#FFF8F0);color:var(--text-primary);box-sizing:border-box">
            </div>
            <div style="margin-bottom:16px">
                <label style="display:block;font-weight:600;margin-bottom:6px;font-size:0.85rem;color:var(--text-secondary)">Янги парол (камида 8 белги)</label>
                <input id="profileNewPw" type="password" placeholder="••••••••" style="width:100%;padding:10px 14px;border:1px solid rgba(180,140,100,0.2);border-radius:10px;font-size:0.95rem;background:var(--bg-primary,#FFF8F0);color:var(--text-primary);box-sizing:border-box">
            </div>
            <div style="margin-bottom:16px">
                <label style="display:block;font-weight:600;margin-bottom:6px;font-size:0.85rem;color:var(--text-secondary)">Янги паролни тасдиқланг</label>
                <input id="profileConfirmPw" type="password" placeholder="••••••••" style="width:100%;padding:10px 14px;border:1px solid rgba(180,140,100,0.2);border-radius:10px;font-size:0.95rem;background:var(--bg-primary,#FFF8F0);color:var(--text-primary);box-sizing:border-box">
            </div>
            <button onclick="changeProfilePassword()" style="width:100%;padding:12px;background:linear-gradient(135deg,#C07840,#D4956B);color:white;border:none;border-radius:12px;font-weight:700;cursor:pointer;font-size:0.95rem">🔐 Паролни ўзгартириш</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
}

// Upload profile avatar image
async function uploadProfileAvatar(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) { showToast('❌ Фақат расм файллари', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('❌ Расм 5MB дан кичик бўлиши керак', 'error'); return; }

    const formData = new FormData();
    formData.append('avatar', file);
    const token = getJwtToken();
    try {
        const res = await fetch('/api/profile/avatar', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            // Update user data
            const user = getCurrentUser();
            user.avatarUrl = data.avatarUrl;
            setCurrentUser(user);
            // Update preview in modal
            const preview = document.getElementById('profileAvatarPreview');
            if (preview) {
                preview.innerHTML = `<img src="${data.avatarUrl}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #C07840"><div style="position:absolute;bottom:0;right:0;width:28px;height:28px;background:#C07840;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;font-size:14px">📷</div>`;
            }
            // Update sidebar avatar
            updateSidebarAvatar(data.avatarUrl);
            showToast('✅ Расм юкланди');
        } else {
            showToast('❌ ' + data.error, 'error');
        }
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

// Update sidebar avatar to show image
function updateSidebarAvatar(avatarUrl) {
    const el = document.getElementById('userAvatar');
    if (!el) return;
    if (avatarUrl) {
        el.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
        el.style.padding = '0';
        el.style.overflow = 'hidden';
    }
}

function showProfileTab(tab) {
    const infoTab = document.getElementById('profileInfoTab');
    const pwTab = document.getElementById('profilePasswordTab');
    const tabs = document.querySelectorAll('#profileTabs .profile-tab');
    if (tab === 'info') {
        infoTab.style.display = 'block';
        pwTab.style.display = 'none';
        tabs[0].style.background = 'linear-gradient(135deg,#C07840,#D4956B)';
        tabs[0].style.color = 'white';
        tabs[1].style.background = 'transparent';
        tabs[1].style.color = 'var(--text-secondary)';
    } else {
        infoTab.style.display = 'none';
        pwTab.style.display = 'block';
        tabs[1].style.background = 'linear-gradient(135deg,#C07840,#D4956B)';
        tabs[1].style.color = 'white';
        tabs[0].style.background = 'transparent';
        tabs[0].style.color = 'var(--text-secondary)';
    }
}

async function saveProfileInfo() {
    const name = document.getElementById('profileName')?.value?.trim();
    const avatar = document.getElementById('profileAvatar')?.value?.trim();
    if (!name) { showToast('❌ Исм киритинг', 'error'); return; }
    try {
        const res = await apiCall('/api/profile', {
            method: 'PUT',
            body: JSON.stringify({ name, avatar })
        });
        if (res.success) {
            setCurrentUser(res.user);
            document.getElementById('userName').textContent = res.user.name;
            document.getElementById('userAvatar').textContent = res.user.avatar || res.user.name.charAt(0);
            showToast('✅ Маълумотлар сақланди');
            const modal = document.getElementById('profileModal');
            if (modal) modal.remove();
        } else {
            showToast('❌ ' + res.error, 'error');
        }
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

async function changeProfilePassword() {
    const cur = document.getElementById('profileCurPw')?.value;
    const newPw = document.getElementById('profileNewPw')?.value;
    const confirm = document.getElementById('profileConfirmPw')?.value;
    if (!newPw || newPw.length < 8) { showToast('❌ Янги парол камида 8 белги бўлиши керак', 'error'); return; }
    if (newPw !== confirm) { showToast('❌ Пароллар мос келмайди', 'error'); return; }
    try {
        const res = await apiCall('/api/profile/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword: cur, newPassword: newPw })
        });
        if (res.success) {
            showToast('✅ Парол ўзгартирилди');
            const modal = document.getElementById('profileModal');
            if (modal) modal.remove();
        } else {
            showToast('❌ ' + res.error, 'error');
        }
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

// ==========================================
// NOTIFICATION SEND MODAL
// ==========================================
async function showSendNotificationModal() {
    const existingModal = document.getElementById('sendNotifModal');
    if (existingModal) existingModal.remove();

    // Fetch users for dropdown
    let users = [];
    try {
        const result = await apiCall('/api/admin/users');
        if (result.success) users = result.users.filter(u => u.status === 'approved');
    } catch (e) { }

    const modal = document.createElement('div');
    modal.id = 'sendNotifModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    const userOptions = users.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');

    modal.innerHTML = `
    <div style="background:var(--card-bg,#FFFBF5);border-radius:20px;padding:32px;max-width:480px;width:90%;border:1px solid rgba(180,140,100,0.12);box-shadow:0 20px 60px rgba(0,0,0,0.15)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
            <h2 style="margin:0;color:var(--text-primary,#3D2B1F)">📢 Хабарнома юбориш</h2>
            <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-muted)">✕</button>
        </div>
        <div style="margin-bottom:16px">
            <label style="display:block;font-weight:600;margin-bottom:6px;font-size:0.85rem">Кимга</label>
            <select id="notifTarget" style="width:100%;padding:10px 14px;border:1px solid rgba(180,140,100,0.2);border-radius:10px;font-size:0.95rem;background:var(--bg-primary,#FFF8F0);color:var(--text-primary);box-sizing:border-box">
                <option value="all">📢 Барчага (жамоавий)</option>
                ${userOptions}
            </select>
        </div>
        <div style="margin-bottom:16px">
            <label style="display:block;font-weight:600;margin-bottom:6px;font-size:0.85rem">Хабар матни</label>
            <textarea id="notifMessage" rows="4" placeholder="Хабарингизни ёзинг..." style="width:100%;padding:10px 14px;border:1px solid rgba(180,140,100,0.2);border-radius:10px;font-size:0.95rem;resize:vertical;background:var(--bg-primary,#FFF8F0);color:var(--text-primary);box-sizing:border-box;font-family:inherit"></textarea>
        </div>
        <button onclick="sendNotification()" style="width:100%;padding:12px;background:linear-gradient(135deg,#C07840,#D4956B);color:white;border:none;border-radius:12px;font-weight:700;cursor:pointer;font-size:0.95rem">📤 Юбориш</button>
    </div>`;
    document.body.appendChild(modal);
}

async function sendNotification() {
    const targetUserId = document.getElementById('notifTarget')?.value;
    const message = document.getElementById('notifMessage')?.value?.trim();
    if (!message) { showToast('❌ Хабар матнини киритинг', 'error'); return; }
    try {
        const res = await apiCall('/api/notifications/send', {
            method: 'POST',
            body: JSON.stringify({ targetUserId, message })
        });
        if (res.success) {
            showToast(`✅ Хабарнома юборилди (${res.sent} кишига)`);
            const modal = document.getElementById('sendNotifModal');
            if (modal) modal.remove();
        } else {
            showToast('❌ ' + res.error, 'error');
        }
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

// ==========================================
// DASHBOARD CARD CLICK — Navigate to views
// ==========================================
function dashboardCardClick(viewName) {
    // Navigate to the named view
    if (typeof switchView === 'function') {
        switchView(viewName);
    }
}

// ==========================================
// CHART DATA LABELS — Register plugin to show numbers
// ==========================================
const chartDataLabelsPlugin = {
    id: 'customDataLabels',
    afterDraw(chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (!meta.hidden) {
                meta.data.forEach((element, index) => {
                    const value = dataset.data[index];
                    if (value === 0 || value === undefined) return;
                    ctx.save();
                    ctx.fillStyle = chart.config.type === 'doughnut' ? '#fff' : (dataset.fontColor || '#3D2B1F');
                    ctx.font = 'bold 11px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const { x, y } = element.tooltipPosition();
                    ctx.fillText(value, x, y);
                    ctx.restore();
                });
            }
        });
    }
};

// Register the plugin globally for all Chart.js instances
if (typeof Chart !== 'undefined') {
    Chart.register(chartDataLabelsPlugin);
}

// ==========================================
// IN-APP CHAT WIDGET
// ==========================================
let _chatOpen = false;
let _chatView = 'list'; // 'list' | 'conversation'
let _chatPartnerId = null;
let _chatPartnerName = '';
let _chatUnread = 0;
let _chatPollTimer = null;
let _chatHeartbeatTimer = null;
let _lastMsgCount = 0;

function initChatWidget() {
    if (document.getElementById('chatWidget')) return;

    const widget = document.createElement('div');
    widget.id = 'chatWidget';
    widget.innerHTML = `
    <button id="chatToggleBtn" onclick="toggleChat()" title="Чат">
        💬
        <span id="chatBadge" class="chat-badge" style="display:none">0</span>
    </button>
    <div id="chatPanel" class="chat-panel" style="display:none">
        <div id="chatHeader" class="chat-header">
            <div class="chat-header-left">
                <button id="chatBackBtn" onclick="chatShowList()" style="display:none" class="chat-back">←</button>
                <span id="chatHeaderTitle">💬 Хабарлар</span>
            </div>
            <button onclick="toggleChat()" class="chat-close">✕</button>
        </div>
        <div id="chatBody" class="chat-body"></div>
        <div id="chatInputArea" class="chat-input-area" style="display:none">
            <input type="file" id="chatFileInput" style="display:none" onchange="chatUploadFile()" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar">
            <button onclick="document.getElementById('chatFileInput').click()" class="chat-attach-btn" title="Файл/расм жўнатиш">📎</button>
            <input id="chatInput" type="text" placeholder="Хабар ёзинг..." onkeydown="if(event.key==='Enter')chatSend()">
            <button onclick="chatSend()" class="chat-send-btn">➤</button>
        </div>
    </div>`;
    document.body.appendChild(widget);

    // Start heartbeat & polling
    chatHeartbeat();
    _chatHeartbeatTimer = setInterval(chatHeartbeat, 15000);
    chatPollUnread();
    _chatPollTimer = setInterval(chatPollUnread, 5000);
}

function toggleChat() {
    _chatOpen = !_chatOpen;
    const panel = document.getElementById('chatPanel');
    if (_chatOpen) {
        panel.style.display = 'flex';
        if (_chatView === 'list') chatShowList();
        else chatLoadMessages();
    } else {
        panel.style.display = 'none';
    }
}

async function chatHeartbeat() {
    const token = getJwtToken();
    if (!token) return;
    try { await fetch('/api/chat/heartbeat', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } }); } catch (e) { }
}

async function chatPollUnread() {
    const token = getJwtToken();
    if (!token) return;
    try {
        const res = await fetch('/api/chat/unread', { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        const badge = document.getElementById('chatBadge');
        if (data.unread > 0) {
            badge.textContent = data.unread;
            badge.style.display = 'flex';
            if (data.unread > _chatUnread) {
                // New message notification
                showToast('💬 Янги хабар келди!');
                try { new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10markup').play(); } catch (e) { }
            }
        } else {
            badge.style.display = 'none';
        }
        _chatUnread = data.unread;
        // Auto-refresh conversation if open
        if (_chatOpen && _chatView === 'conversation' && _chatPartnerId) {
            chatLoadMessages(true);
        }
    } catch (e) { }
}

async function chatShowList() {
    _chatView = 'list';
    _chatPartnerId = null;
    document.getElementById('chatBackBtn').style.display = 'none';
    document.getElementById('chatHeaderTitle').textContent = '💬 Хабарлар';
    document.getElementById('chatInputArea').style.display = 'none';

    const body = document.getElementById('chatBody');
    body.innerHTML = '<div class="chat-loading">Юкланмоқда...</div>';

    const token = getJwtToken();
    try {
        const res = await fetch('/api/chat/users', { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        if (!data.users || !data.users.length) {
            body.innerHTML = '<div class="chat-empty">Фойдаланувчилар топилмади</div>';
            return;
        }
        // Fetch conversations too for sorting by recent
        let convMap = {};
        try {
            const convRes = await fetch('/api/chat/conversations', { headers: { 'Authorization': 'Bearer ' + token } });
            const convData = await convRes.json();
            (convData.conversations || []).forEach(c => { convMap[c.partnerId] = c; });
        } catch (e) { }

        // Sort: users with recent conversations first (by last message time), then online, then alphabetically
        const users = data.users.sort((a, b) => {
            const ca = convMap[a.id], cb = convMap[b.id];
            if (ca && !cb) return -1;
            if (!ca && cb) return 1;
            if (ca && cb) return new Date(cb.lastTimestamp) - new Date(ca.lastTimestamp);
            if (a.online !== b.online) return b.online - a.online;
            return a.name.localeCompare(b.name);
        });
        body.innerHTML = users.map(u => {
            const conv = convMap[u.id];
            const lastMsg = conv ? conv.lastMessage : '';
            const lastTime = conv ? new Date(conv.lastTimestamp).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' }) : '';
            return `
            <div class="chat-user-item" onclick="chatOpenConversation('${u.id}','${u.name.replace(/'/g, "\\'")}')">
                <div class="chat-avatar">
                    <span class="chat-avatar-letter">${u.name[0]}</span>
                    <span class="chat-status-dot ${u.online ? 'online' : 'offline'}"></span>
                </div>
                <div class="chat-user-info">
                    <div class="chat-user-name">${u.name} ${lastTime ? `<span style="font-size:0.72em;color:var(--text-muted);font-weight:400;float:right">${lastTime}</span>` : ''}</div>
                    <div class="chat-user-role">${lastMsg || u.department || u.role}</div>
                </div>
                ${u.unread ? `<span class="chat-unread-badge">${u.unread}</span>` : ''}
            </div>`;
        }).join('');
    } catch (e) {
        body.innerHTML = '<div class="chat-empty">Хато юз берди</div>';
    }
}

async function chatOpenConversation(userId, userName) {
    _chatView = 'conversation';
    _chatPartnerId = userId;
    _chatPartnerName = userName;
    document.getElementById('chatBackBtn').style.display = 'block';
    document.getElementById('chatHeaderTitle').textContent = userName;
    document.getElementById('chatInputArea').style.display = 'flex';
    document.getElementById('chatInput').focus();
    await chatLoadMessages();
}

async function chatLoadMessages(silent) {
    if (!_chatPartnerId) return;
    const body = document.getElementById('chatBody');
    if (!silent) body.innerHTML = '<div class="chat-loading">Юкланмоқда...</div>';

    const token = getJwtToken();
    try {
        const res = await fetch(`/api/chat/messages/${_chatPartnerId}`, { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        if (!data.messages.length) {
            body.innerHTML = '<div class="chat-empty">Ҳали хабарлар йўқ.<br>Биринчи хабарни ёзинг! 👋</div>';
            _lastMsgCount = 0;
            return;
        }
        // Only re-render if count changed
        if (silent && data.messages.length === _lastMsgCount) return;
        _lastMsgCount = data.messages.length;

        const myId = getCurrentUser().id;
        body.innerHTML = data.messages.map(m => {
            const isMine = m.from === myId;
            const time = new Date(m.timestamp).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' });
            const readInfo = isMine ? (m.read ? ' ✓✓' : ' ✓') : '';

            let content = '';
            // File/image rendering with actions
            if (m.file) {
                const fileUrl = `/api/chat/file/${m.file.savedName}`;
                const fullUrl = window.location.origin + fileUrl;
                const ext = (m.file.name || '').split('.').pop().toLowerCase();
                const isDoc = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(ext);
                const isPdf = ext === 'pdf';
                const isTxt = ['txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'md'].includes(ext);

                // Google Docs Viewer works for office docs on any URL
                const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fullUrl)}&embedded=true`;

                // Choose the correct "open" URL based on file type
                let openUrl, openLabel, openIcon;
                if (m.file.isImage) {
                    openUrl = fileUrl;
                    openLabel = 'Очиш';
                    openIcon = '🔍';
                } else if (isPdf || isTxt) {
                    openUrl = fileUrl;
                    openLabel = 'Очиш';
                    openIcon = '📂';
                } else if (isDoc) {
                    openUrl = googleViewerUrl;
                    openLabel = 'Google\'да очиш';
                    openIcon = '📂';
                } else {
                    openUrl = fileUrl;
                    openLabel = 'Очиш';
                    openIcon = '📂';
                }

                // File type icon
                let fileIcon = '📄';
                if (isDoc && (ext === 'doc' || ext === 'docx')) fileIcon = '📝';
                else if (isDoc && (ext === 'xls' || ext === 'xlsx')) fileIcon = '📊';
                else if (isDoc && (ext === 'ppt' || ext === 'pptx')) fileIcon = '📎';
                else if (isPdf) fileIcon = '📕';
                else if (isTxt) fileIcon = '📃';

                if (m.file.isImage) {
                    content = `<img src="${fileUrl}" class="chat-img" onclick="window.open('${fileUrl}','_blank')" alt="${m.file.name}">
                        <div class="chat-file-actions">
                            <a href="${fileUrl}" download="${m.file.name}" class="chat-action-btn" title="Юклаб олиш">⬇️</a>
                        </div>`;
                } else {
                    content = `<div class="chat-file-block">
                        <span class="chat-file-icon">${fileIcon}</span>
                        <div class="chat-file-details">
                            <div class="chat-file-name-link">${m.file.name}</div>
                            <small>${(m.file.size / 1024).toFixed(0)} KB</small>
                        </div>
                        <div class="chat-file-actions">
                            <a href="${fileUrl}" download="${m.file.name}" class="chat-action-btn" title="Юклаб олиш">⬇️</a>
                            <a href="${openUrl}" target="_blank" class="chat-action-btn" title="${openLabel}">${openIcon}</a>
                        </div>
                    </div>`;
                }
            } else {
                // Single-pass link detection to avoid double-replacement
                content = m.text.replace(/(https?:\/\/[^\s]+|\/api\/drive\/public\/[^\s]+|\/api\/chat\/file\/[^\s]+)/g, (match) => {
                    if (match.includes('/api/drive/public/') || match.includes('/api/chat/file/')) {
                        const href = match.startsWith('http') ? match : match;
                        return `<a href="${href}" target="_blank" style="color:inherit;text-decoration:underline">📄 Файлни очиш</a>`;
                    }
                    return `<a href="${match}" target="_blank" style="color:inherit;text-decoration:underline">${match}</a>`;
                }).replace(/\n/g, '<br>');
            }

            const deleteBtn = isMine ? `<button class="chat-delete-btn" onclick="chatDeleteMsg('${m.id}')" title="Ўчириш">🗑</button>` : '';

            return `<div class="chat-msg ${isMine ? 'mine' : 'theirs'}">
                <div class="chat-bubble">${content}
                    <span class="chat-time">${time}${readInfo}</span>
                </div>
                ${deleteBtn}
            </div>`;
        }).join('');
        body.scrollTop = body.scrollHeight;
    } catch (e) {
        if (!silent) body.innerHTML = '<div class="chat-empty">Хато юз берди</div>';
    }
}

async function chatDeleteMsg(msgId) {
    if (!confirm('Хабарни ўчириш?')) return;
    const token = getJwtToken();
    try {
        await fetch('/api/chat/message/' + msgId, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        await chatLoadMessages();
    } catch (e) { showToast('❌ Ўчиришда хато', 'error'); }
}

async function chatSend() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !_chatPartnerId) return;
    input.value = '';

    const token = getJwtToken();
    try {
        await fetch('/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ to: _chatPartnerId, text })
        });
        await chatLoadMessages();
    } catch (e) {
        showToast('❌ Хабар юборишда хато', 'error');
    }
}

// Share file from Drive to chat
async function driveShareToChat(fileId, fileName) {
    const token = getJwtToken();
    if (!token) { showToast('Авторизация керак', 'error'); return; }

    try {
        const res = await fetch('/api/chat/users', { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        if (!data.users || !data.users.length) { showToast('Фойдаланувчилар топилмади', 'error'); return; }

        const users = data.users.sort((a, b) => (b.online - a.online));
        openModal('📤 Файлни жўнатиш: ' + fileName, `
            <p style="color:var(--text-muted);margin-bottom:12px">Қабул қилувчиларни танланг:</p>
            <div style="max-height:280px;overflow-y:auto" id="shareUsersList">
                ${users.map(u => `
                    <label class="chat-user-item" style="cursor:pointer">
                        <input type="checkbox" value="${u.id}" data-name="${u.name}" style="margin-right:10px;accent-color:#C07840;width:18px;height:18px">
                        <div class="chat-avatar" style="width:36px;height:36px">
                            <span class="chat-avatar-letter" style="font-size:14px">${u.name[0]}</span>
                            <span class="chat-status-dot ${u.online ? 'online' : 'offline'}" style="width:10px;height:10px"></span>
                        </div>
                        <div class="chat-user-info">
                            <div class="chat-user-name">${u.name}</div>
                            <div class="chat-user-role">${u.department || u.role}</div>
                        </div>
                    </label>
                `).join('')}
            </div>
            <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">
                <button class="btn-secondary" onclick="closeModal()">Бекор</button>
                <button class="btn-primary" onclick="driveShareSendGroup('${fileId}','${fileName.replace(/'/g, "\\'")}')">📤 Жўнатиш</button>
            </div>
        `);
    } catch (e) {
        showToast('❌ Хато: ' + e.message, 'error');
    }
}

async function driveShareSendGroup(fileId, fileName) {
    const checkboxes = document.querySelectorAll('#shareUsersList input[type=checkbox]:checked');
    if (!checkboxes.length) { showToast('Камида бир фойдаланувчи танланг', 'error'); return; }

    const token = getJwtToken();
    const fileUrl = `/api/drive/public/${fileId}`;
    const text = `📁 Файл жўнатилди: ${fileName}\n🔗 ${fileUrl}`;
    let sent = 0;

    for (const cb of checkboxes) {
        try {
            await fetch('/api/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ to: cb.value, text })
            });
            sent++;
        } catch (e) { }
    }
    closeModal();
    showToast(`✅ "${fileName}" ${sent} кишига жўнатилди`);
}

async function chatUploadFile() {
    const fileInput = document.getElementById('chatFileInput');
    const file = fileInput.files[0];
    if (!file || !_chatPartnerId) return;

    const token = getJwtToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('to', _chatPartnerId);

    try {
        showToast('⏳ Файл юкланмоқда...');
        const res = await fetch('/api/chat/upload', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            showToast('✅ Файл жўнатилди');
            await chatLoadMessages();
        } else {
            showToast('❌ ' + (data.error || 'Хато'), 'error');
        }
    } catch (e) {
        showToast('❌ Файл юклашда хато', 'error');
    }
    fileInput.value = '';
}

// Auto-init chat when user is logged in
if (typeof _authUser !== 'undefined') {
    setTimeout(initChatWidget, 1000);
} else {
    document.addEventListener('userLoggedIn', () => setTimeout(initChatWidget, 500));
}
