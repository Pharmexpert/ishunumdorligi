// ==========================================
// PRODUCTIVITY MODULE
// ==========================================
function renderProductivity() {
    const items = loadData(STORAGE_KEYS.prodItems);
    const prod = loadData(STORAGE_KEYS.productivity, {});
    document.getElementById('prodMonthLabel').textContent = getMonthName(currentProdMonth) + ' ' + currentProdYear;
    document.getElementById('prodPrevMonth').onclick = () => { currentProdMonth--; if (currentProdMonth < 0) { currentProdMonth = 11; currentProdYear--; } renderProductivity(); };
    document.getElementById('prodNextMonth').onclick = () => { currentProdMonth++; if (currentProdMonth > 11) { currentProdMonth = 0; currentProdYear++; } renderProductivity(); };

    const daysInMonth = new Date(currentProdYear, currentProdMonth + 1, 0).getDate();
    let totalChecked = 0, totalPossible = daysInMonth * items.length;
    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${currentProdYear}-${String(currentProdMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const day = prod[key] || {};
        totalChecked += Object.values(day).filter(Boolean).length;
    }
    const pct = totalPossible ? Math.round(totalChecked / totalPossible * 100) : 0;
    document.getElementById('prodStats').innerHTML = `
        <div class="prod-stat"><div class="prod-stat-value" style="color:var(--accent-primary)">${pct}%</div><div class="prod-stat-label">${t('prod.monthlyResult')}</div></div>
        <div class="prod-stat"><div class="prod-stat-value" style="color:var(--success)">${totalChecked}</div><div class="prod-stat-label">${t('prod.done')}</div></div>
        <div class="prod-stat"><div class="prod-stat-value" style="color:var(--danger)">${totalPossible - totalChecked}</div><div class="prod-stat-label">${t('prod.notDone')}</div></div>
        <div class="prod-stat"><div class="prod-stat-value">${items.length}</div><div class="prod-stat-label">${t('prod.habitsCount')}</div></div>`;

    const habitCount = items.length;
    let html = `<div class="prod-row header" style="--habit-count:${habitCount}"><div class="prod-cell header-cell">${t('prod.day')}</div>`;
    items.forEach(item => html += `<div class="prod-cell header-cell" title="${item}">${item.slice(0, 6)}</div>`);
    html += `<div class="prod-cell header-cell">%</div></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${currentProdYear}-${String(currentProdMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const day = prod[key] || {};
        const dayChecked = Object.values(day).filter(Boolean).length;
        const dayPct = items.length ? Math.round(dayChecked / items.length * 100) : 0;
        const pctColor = dayPct >= 80 ? 'var(--success)' : dayPct >= 50 ? 'var(--warning)' : 'var(--danger)';
        html += `<div class="prod-row" style="--habit-count:${habitCount}"><div class="prod-cell day-num">${d}</div>`;
        items.forEach((item, i) => {
            const checked = day[i] || false;
            html += `<div class="prod-cell"><button class="prod-check ${checked ? 'checked' : ''}" onclick="toggleProd('${key}',${i})"></button></div>`;
        });
        html += `<div class="prod-cell pct" style="color:${pctColor}">${dayPct}%</div></div>`;
    }
    document.getElementById('prodGrid').innerHTML = html;
    renderProdTasks();
}

function toggleProd(key, index) {
    const prod = loadData(STORAGE_KEYS.productivity, {});
    if (!prod[key]) prod[key] = {};
    prod[key][index] = !prod[key][index];
    saveData(STORAGE_KEYS.productivity, prod);
    renderProductivity();
}

function renderProdTasks() {
    const tasks = loadData(STORAGE_KEYS.tasks);
    const activeTasks = tasks.filter(task => task.status !== 'bajarildi' && task.status !== 'bekor' && (task.assignedTo === _authUser.id || task.createdBy === _authUser.id));
    activeTasks.sort((a, b) => (a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1);
    const container = document.getElementById('prodTasksList');
    if (!activeTasks.length) { container.innerHTML = `<div class="empty-state"><h3>${t('prod.noActive')}</h3><p>${t('prod.allDone')}</p></div>`; return; }
    container.innerHTML = activeTasks.map(task => {
        const days = getDaysRemaining(task.deadline);
        const isOverdue = days !== null && days < 0;
        const assignee = task.assigneeName || '';
        return `<div class="task-item ${isOverdue ? 'overdue' : ''}" style="cursor:pointer" onclick="openProdTaskDetail('${task.id}')">
            <div class="task-checkbox ${task.status === 'bajarildi' ? 'checked' : ''}" onclick="event.stopPropagation();toggleTask('${task.id}');renderProductivity()"></div>
            <div class="task-info"><div class="task-name">${task.name}</div>
            <div class="task-meta"><span class="badge ${task.priority}">${t('priority.' + task.priority)}</span>
            <span>📅 ${formatDate(task.deadline)}</span>${task.time ? `<span>⏰ ${task.time}</span>` : ''}
            ${assignee ? `<span>👤 ${assignee}</span>` : ''}
            ${task.executionNote ? `<span>📝</span>` : ''}
            ${days !== null ? `<span style="color:${isOverdue ? 'var(--danger)' : days <= 3 ? 'var(--warning)' : 'var(--text-muted)'}; font-weight:600">${isOverdue ? Math.abs(days) + ' ' + t('tasks.daysOverdue') : days + ' ' + t('tasks.daysLeft')}</span>` : ''}</div></div></div>`;
    }).join('');
}

async function openProdTaskDetail(taskId) {
    const tasks = loadData(STORAGE_KEYS.tasks);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Fetch users from server
    let usersHtml = '<option value="">— Танланмаган —</option>';
    try {
        const token = getJwtToken();
        const res = await fetch('/api/chat/users', { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        if (data.users) {
            usersHtml += data.users.map(u =>
                `<option value="${u.id}" ${task.assignedTo === u.id ? 'selected' : ''}>${u.name} (${u.department || u.role})</option>`
            ).join('');
        }
    } catch (e) { }
    // Add current user
    usersHtml += `<option value="${_authUser.id}" ${task.assignedTo === _authUser.id ? 'selected' : ''}>${_authUser.name} (Мен)</option>`;

    const statusOptions = ['yangi', 'jarayonda', 'tekshiruvda', 'bajarildi', 'uzoq_muddatli', 'bekor'].map(s =>
        `<option value="${s}" ${task.status === s ? 'selected' : ''}>${t('status.' + s)}</option>`
    ).join('');

    openModal('📋 ' + task.name, `
        <div style="display:flex;flex-direction:column;gap:14px">
            <div>
                <label style="font-weight:600;font-size:0.85rem;color:var(--text-muted);margin-bottom:4px;display:block">📊 Ижро ҳолати</label>
                <select id="prodTaskStatus" class="form-input">${statusOptions}</select>
            </div>
            <div>
                <label style="font-weight:600;font-size:0.85rem;color:var(--text-muted);margin-bottom:4px;display:block">👤 Ижрочи (тайинлаш)</label>
                <select id="prodTaskAssignee" class="form-input">${usersHtml}</select>
            </div>
            <div>
                <label style="font-weight:600;font-size:0.85rem;color:var(--text-muted);margin-bottom:4px;display:block">📝 Ижро бўйича изоҳ</label>
                <textarea id="prodTaskNote" class="form-input" rows="3" placeholder="Бажарилган ишлар, натижалар...">${task.executionNote || ''}</textarea>
            </div>
            <div style="display:flex;gap:10px;font-size:0.82rem;color:var(--text-muted)">
                <span>📅 Муддат: ${task.deadline || '—'}</span>
                <span>🏷️ ${t('priority.' + task.priority)}</span>
                ${task.category ? `<span>📁 ${task.category}</span>` : ''}
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
                <button class="btn-secondary" onclick="closeModal()">Бекор</button>
                <button class="btn-primary" onclick="saveProdTaskDetail('${task.id}')">💾 Сақлаш</button>
            </div>
        </div>
    `);
}

function saveProdTaskDetail(taskId) {
    const tasks = loadData(STORAGE_KEYS.tasks);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = document.getElementById('prodTaskStatus').value;
    const assigneeId = document.getElementById('prodTaskAssignee').value;
    const assigneeName = document.getElementById('prodTaskAssignee').selectedOptions[0]?.text.replace(/ \(.*\)$/, '') || '';
    const note = document.getElementById('prodTaskNote').value;

    task.status = newStatus;
    task.assignedTo = assigneeId || task.assignedTo;
    task.assigneeName = assigneeName;
    task.executionNote = note;
    task.lastUpdated = new Date().toISOString();

    saveData(STORAGE_KEYS.tasks, tasks);
    closeModal();
    renderProductivity();
    showToast('✅ Вазифа янгиланди');
}

// ==========================================
// FINANCE MODULE
// ==========================================
function renderFinance() {
    if (!canViewFinance(_authUser)) { document.getElementById('view-finance').innerHTML = `<div class="empty-state"><h3>${t('auth.rejected')}</h3></div>`; return; }
    const fin = loadData(STORAGE_KEYS.finance, {});
    const months = getMonthNames();
    let tabsHtml = '';
    months.forEach((m, i) => { tabsHtml += `<button class="month-tab ${i === currentFinMonth ? 'active' : ''}" onclick="currentFinMonth=${i};renderFinance()">${m.slice(0, 3)}</button>`; });
    tabsHtml += `<button class="month-tab ${currentFinMonth === 12 ? 'active' : ''}" onclick="currentFinMonth=12;renderFinance()">${t('fin.year')}</button>`;
    tabsHtml += `<button class="month-tab ${currentFinMonth === 13 ? 'active' : ''}" onclick="currentFinMonth=13;renderFinance()">${t('fin.debts')}</button>`;
    document.getElementById('financeMonthTabs').innerHTML = tabsHtml;

    const content = document.getElementById('financeContent');
    if (currentFinMonth === 13) { renderDebts(content); return; }
    if (currentFinMonth === 12) { renderFinanceYearly(fin, content); return; }

    const mf = fin[currentFinMonth] || { income: [], expenses: [], savings: 0 };
    const totalInc = mf.income.reduce((s, x) => s + x.amount, 0);
    const totalExp = mf.expenses.reduce((s, x) => s + x.amount, 0);
    const balance = totalInc - totalExp;
    const savings = mf.savings || 0;
    const pctSpent = totalInc ? Math.round(totalExp / totalInc * 100) : 0;

    content.innerHTML = `
        <div class="finance-summary">
            <div class="finance-stat"><div class="finance-stat-label">💵 ${t('fin.income')}</div><div class="finance-stat-value income">${formatNum(totalInc)} ${t('common.som')}</div></div>
            <div class="finance-stat"><div class="finance-stat-label">💸 ${t('fin.expenses')}</div><div class="finance-stat-value expense">${formatNum(totalExp)} ${t('common.som')}</div></div>
            <div class="finance-stat"><div class="finance-stat-label">💰 ${t('fin.savings')}</div><div class="finance-stat-value savings">${formatNum(savings)} ${t('common.som')}</div></div>
            <div class="finance-stat"><div class="finance-stat-label">📊 ${t('fin.balance')}</div><div class="finance-stat-value balance">${formatNum(balance)} ${t('common.som')}</div></div>
        </div>
        <div style="margin-bottom:16px;font-size:0.85rem;color:var(--text-muted)">📉 ${pctSpent}% ${t('fin.spentPct')}</div>
        <div class="finance-section-title"><span class="dot green"></span> ${t('fin.tushum')}</div>
        <table class="finance-table"><thead><tr><th>${t('fin.name')}</th><th>${t('fin.categoryLabel')}</th><th>${t('fin.amount')}</th><th></th></tr></thead><tbody>
        ${mf.income.map(x => `<tr><td>${x.name}</td><td>${x.category || '—'}</td><td class="amount positive">+${formatNum(x.amount)}</td><td><button class="btn-danger" onclick="deleteFinEntry(${currentFinMonth},'income','${x.id}')">✕</button></td></tr>`).join('')}
        ${!mf.income.length ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">${t('fin.noData')}</td></tr>` : ''}
        </tbody></table>
        <div class="finance-section-title"><span class="dot red"></span> ${t('fin.xarajat')}</div>
        <table class="finance-table"><thead><tr><th>${t('fin.name')}</th><th>${t('fin.categoryLabel')}</th><th>${t('fin.amount')}</th><th></th></tr></thead><tbody>
        ${mf.expenses.map(x => `<tr><td>${x.name}</td><td>${x.category || '—'}</td><td class="amount negative">-${formatNum(x.amount)}</td><td><button class="btn-danger" onclick="deleteFinEntry(${currentFinMonth},'expenses','${x.id}')">✕</button></td></tr>`).join('')}
        ${!mf.expenses.length ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">${t('fin.noData')}</td></tr>` : ''}
        </tbody></table>`;
    renderFinanceCharts(fin);
}

function renderFinanceYearly(fin, content) {
    let totalInc = 0, totalExp = 0, totalSav = 0; let rows = '';
    const months = getMonthNames();
    for (let i = 0; i < 12; i++) {
        const mf = fin[i] || { income: [], expenses: [], savings: 0 };
        const inc = mf.income.reduce((s, x) => s + x.amount, 0);
        const exp = mf.expenses.reduce((s, x) => s + x.amount, 0);
        totalInc += inc; totalExp += exp; totalSav += (mf.savings || 0);
        if (inc || exp) rows += `<tr><td>${months[i]}</td><td class="amount positive">+${formatNum(inc)}</td><td class="amount negative">-${formatNum(exp)}</td><td class="amount" style="color:${inc - exp >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatNum(inc - exp)}</td></tr>`;
    }
    content.innerHTML = `
        <div class="finance-summary">
            <div class="finance-stat"><div class="finance-stat-label">${t('fin.yearlyIncome')}</div><div class="finance-stat-value income">${formatNum(totalInc)} ${t('common.som')}</div></div>
            <div class="finance-stat"><div class="finance-stat-label">${t('fin.yearlyExpense')}</div><div class="finance-stat-value expense">${formatNum(totalExp)} ${t('common.som')}</div></div>
            <div class="finance-stat"><div class="finance-stat-label">${t('fin.yearlySavings')}</div><div class="finance-stat-value savings">${formatNum(totalSav)} ${t('common.som')}</div></div>
            <div class="finance-stat"><div class="finance-stat-label">${t('fin.yearlyBalance')}</div><div class="finance-stat-value balance">${formatNum(totalInc - totalExp)} ${t('common.som')}</div></div>
        </div>
        <table class="finance-table"><thead><tr><th>${t('common.month')}</th><th>${t('fin.income')}</th><th>${t('fin.expenses')}</th><th>${t('fin.balance')}</th></tr></thead><tbody>${rows}</tbody></table>`;
    renderFinanceCharts(fin);
}

function renderDebts(content) {
    const debts = loadData(STORAGE_KEYS.debts, []);
    const totalRemaining = debts.reduce((s, d) => s + (d.remaining || 0), 0);
    const totalOriginal = debts.reduce((s, d) => s + (d.originalAmount || 0), 0);
    const totalPaid = debts.reduce((s, d) => s + (d.paidAmount || 0), 0);
    content.innerHTML = `
        <div class="finance-summary">
            <div class="finance-stat"><div class="finance-stat-label">${t('fin.totalDebt')}</div><div class="finance-stat-value expense">${formatNum(totalOriginal)} ${t('common.som')}</div></div>
            <div class="finance-stat"><div class="finance-stat-label">${t('fin.totalPaid')}</div><div class="finance-stat-value income">${formatNum(totalPaid)} ${t('common.som')}</div></div>
            <div class="finance-stat"><div class="finance-stat-label">${t('fin.remaining')}</div><div class="finance-stat-value balance">${formatNum(totalRemaining)} ${t('common.som')}</div></div>
        </div>
        <table class="finance-table"><thead><tr><th>#</th><th>${t('common.date')}</th><th>${t('fin.creditor')}</th><th>${t('fin.originalAmount')}</th><th>${t('fin.paidAmount')}</th><th>${t('fin.remaining')}</th><th>${t('fin.monthlyPayment')}</th><th>${t('fin.debtStatus')}</th><th></th></tr></thead>
        <tbody>${debts.map((d, i) => `<tr><td>${i + 1}</td><td>${formatDate(d.date)}</td><td>${d.creditor}</td><td class="amount">${formatNum(d.originalAmount)}</td><td class="amount positive">${formatNum(d.paidAmount)}</td><td class="amount negative">${formatNum(d.remaining)}</td><td class="amount">${formatNum(d.monthlyPayment)}</td>
        <td><span class="debt-status ${d.status === 'paid' ? 'paid' : 'active'}">${d.status === 'paid' ? t('fin.debtPaid') : t('fin.debtActive')}</span></td>
        <td><button class="btn-danger" onclick="deleteDebt('${d.id}')">✕</button></td></tr>`).join('')}
        ${!debts.length ? `<tr><td colspan="9" style="text-align:center;color:var(--text-muted)">${t('fin.noDebts')}</td></tr>` : ''}
        </tbody></table>
        <div style="margin-top:16px"><button class="btn-primary" onclick="showDebtModal()">+ ${t('fin.addDebt')}</button></div>`;
    document.querySelector('.finance-charts').style.display = 'none';
}

function renderFinanceCharts(fin) {
    document.querySelector('.finance-charts').style.display = 'grid';
    if (charts.incExp) charts.incExp.destroy();
    if (charts.monthComp) charts.monthComp.destroy();
    const labels = [], incData = [], expData = [];
    const chartTextColor = '#6B5744';
    const months = getMonthNames();
    for (let i = 0; i < 12; i++) {
        labels.push(months[i].slice(0, 3));
        const mf = fin[i] || { income: [], expenses: [] };
        incData.push(mf.income.reduce((s, x) => s + x.amount, 0));
        expData.push(mf.expenses.reduce((s, x) => s + x.amount, 0));
    }
    const totalInc = incData.reduce((a, b) => a + b, 0);
    const totalExp = expData.reduce((a, b) => a + b, 0);
    charts.incExp = new Chart(document.getElementById('chartIncomeExpense'), {
        type: 'doughnut', data: { labels: [t('fin.income'), t('fin.expenses')], datasets: [{ data: [totalInc, totalExp], backgroundColor: ['#3B9B6E', '#C44D4D'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: chartTextColor } }, datalabels: { display: true, color: '#fff', font: { weight: 'bold', size: 13 }, formatter: function (v) { return formatNumShort(v); } }, tooltip: { callbacks: { label: function (ctx) { return ctx.label + ': ' + formatNum(ctx.raw) + " so'm"; } } } } }
    });
    charts.monthComp = new Chart(document.getElementById('chartMonthlyComparison'), {
        type: 'line', data: {
            labels, datasets: [
                { label: t('fin.income'), data: incData, borderColor: '#3B9B6E', backgroundColor: 'rgba(59,155,110,0.08)', fill: true, tension: 0.4, pointRadius: 3 },
                { label: t('fin.expenses'), data: expData, borderColor: '#C44D4D', backgroundColor: 'rgba(196,77,77,0.08)', fill: true, tension: 0.4, pointRadius: 3 }
            ]
        }, options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: chartTextColor } },
                y: { grid: { color: 'rgba(180,140,100,0.08)' }, ticks: { color: chartTextColor, callback: function (v) { return formatNumShort(v); } } }
            },
            plugins: {
                legend: { labels: { color: chartTextColor } },
                datalabels: { display: false },
                tooltip: { callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + formatNum(ctx.raw) + " so'm"; } } }
            }
        }
    });
}

function deleteFinEntry(month, type, id) {
    const fin = loadData(STORAGE_KEYS.finance, {});
    if (fin[month] && fin[month][type]) fin[month][type] = fin[month][type].filter(x => x.id !== id);
    saveData(STORAGE_KEYS.finance, fin); renderFinance(); showToast(t('fin.deleted'), 'info');
}

function showFinanceModal() {
    const incCats = ["Asosiy ish haqi", "Qo'shimcha daromad", "Dividendlar", "Qarzni qaytarish", "Stipendiya", "Ijara daromadi", "Frilanserlik", "Sovg'a", "Boshqa daromad"];
    const expCats = ['Uy-joy', 'Oziq-ovqat', 'Transport', 'Kommunal', 'Kiyim', "Sog'liq", "Ta'lim", 'Dam olish', 'Texnologiya', 'Bolalar', 'Boshqa'];
    const buildOptions = (cats) => cats.map(c => `<option value="${c}">${c}</option>`).join('');
    openModal(t('fin.newEntry'), `
        <div class="form-group"><label class="form-label">${t('fin.type')}</label><select class="form-select" id="mFinType">
            <option value="income">${t('fin.income')}</option><option value="expenses">${t('fin.expenses')}</option></select></div>
        <div class="form-group"><label class="form-label">${t('fin.name')}</label><input class="form-input" id="mFinName"></div>
        <div class="form-group" id="mFinCatGroup"><label class="form-label">${t('fin.categoryLabel')}</label><select class="form-select" id="mFinCategory">
            ${buildOptions(incCats)}</select></div>
        <div class="form-group"><label class="form-label">${t('fin.amount')}</label><input class="form-input" type="number" id="mFinAmount"></div>
        <div class="form-actions"><button class="btn-secondary" onclick="closeModal()">${t('common.cancel')}</button>
        <button class="btn-primary" onclick="saveFinEntry()">${t('common.save')}</button></div>`);
    document.getElementById('mFinType').onchange = function () {
        const catSelect = document.getElementById('mFinCategory');
        catSelect.innerHTML = this.value === 'income' ? buildOptions(incCats) : buildOptions(expCats);
    };
}

function saveFinEntry() {
    const type = document.getElementById('mFinType').value;
    const name = document.getElementById('mFinName').value.trim();
    const amount = parseInt(document.getElementById('mFinAmount').value) || 0;
    const category = document.getElementById('mFinCategory').value;
    if (!name || !amount) { showToast(t('common.fillAll'), 'error'); return; }
    const fin = loadData(STORAGE_KEYS.finance, {});
    const m = currentFinMonth === 12 || currentFinMonth === 13 ? new Date().getMonth() : currentFinMonth;
    if (!fin[m]) fin[m] = { income: [], expenses: [], savings: 0 };
    const entry = { id: genId(), name, amount, category };
    fin[m][type].push(entry);
    saveData(STORAGE_KEYS.finance, fin); closeModal(); renderFinance(); showToast(t('fin.added'));
}

function deleteDebt(id) {
    let debts = loadData(STORAGE_KEYS.debts, []);
    debts = debts.filter(d => d.id !== id);
    saveData(STORAGE_KEYS.debts, debts); renderFinance(); showToast(t('fin.deleted'), 'info');
}

function showDebtModal() {
    openModal(t('fin.newDebt'), `
        <div class="form-row">
            <div class="form-group"><label class="form-label">${t('common.date')}</label><input class="form-input" type="date" id="mDebtDate"></div>
            <div class="form-group"><label class="form-label">${t('fin.creditor')}</label><input class="form-input" id="mDebtCreditor"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label class="form-label">${t('fin.originalAmount')}</label><input class="form-input" type="number" id="mDebtOriginal"></div>
            <div class="form-group"><label class="form-label">${t('fin.paidAmount')}</label><input class="form-input" type="number" id="mDebtPaid" value="0"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label class="form-label">${t('fin.months')}</label><input class="form-input" type="number" id="mDebtMonths"></div>
            <div class="form-group"><label class="form-label">${t('tasks.deadline')}</label><input class="form-input" type="date" id="mDebtDeadline"></div>
        </div>
        <div class="form-group"><label class="form-label">${t('tasks.note')}</label><input class="form-input" id="mDebtNote"></div>
        <div class="form-actions"><button class="btn-secondary" onclick="closeModal()">${t('common.cancel')}</button>
        <button class="btn-primary" onclick="saveDebt()">${t('common.save')}</button></div>`);
}

function saveDebt() {
    const original = parseInt(document.getElementById('mDebtOriginal').value) || 0;
    const paid = parseInt(document.getElementById('mDebtPaid').value) || 0;
    const months = parseInt(document.getElementById('mDebtMonths').value) || 1;
    const creditor = document.getElementById('mDebtCreditor').value.trim();
    if (!creditor || !original) { showToast(t('common.fillAll'), 'error'); return; }
    const debts = loadData(STORAGE_KEYS.debts, []);
    debts.push({ id: genId(), date: document.getElementById('mDebtDate').value, creditor, originalAmount: original, paidAmount: paid, remaining: original - paid, months, monthlyPayment: Math.round((original - paid) / months), deadline: document.getElementById('mDebtDeadline').value, status: paid >= original ? 'paid' : 'active', note: document.getElementById('mDebtNote').value.trim() });
    saveData(STORAGE_KEYS.debts, debts); closeModal(); renderFinance(); showToast(t('fin.added'));
}

// ==========================================
// HABITS & GOALS MODULE
// ==========================================
function renderHabits() {
    const habits = loadData(STORAGE_KEYS.habits, []);
    const container = document.getElementById('yearlyGoals');
    container.innerHTML = habits.map(cat => {
        const goals = cat.goals || [];
        const avgProgress = goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0;
        const fillClasses = ['', 'success', 'warning', 'pink', '', 'success'];
        const colorIdx = ['work', 'finance', 'creative', 'personal', 'relations', 'spiritual'].indexOf(cat.id);
        return `<div class="habit-category">
            <div class="habit-cat-header">
                <div class="habit-cat-title"><div class="habit-cat-icon ${cat.colorClass}">${cat.icon}</div>${cat.name}</div>
                <div class="habit-cat-progress">${avgProgress}% ${t('habits.progress')}</div>
            </div>
            <div class="goals-list">${goals.map(g => `
                <div class="goal-item"><div class="goal-header"><div class="goal-name">${g.name}</div><div class="goal-pct">${g.progress}%</div></div>
                    <div class="goal-desc">${g.desc || ''}</div>
                    <div class="progress-bar"><div class="progress-fill ${fillClasses[colorIdx] || ''}" style="width:${g.progress}%"></div></div>
                    <div class="goal-subtasks">${(g.subtasks || []).map(st => `
                        <span class="subtask-badge ${st.done ? 'done' : ''}" onclick="toggleSubtask('${cat.id}','${g.id}','${st.id}')">${st.type === 'daily' ? '📅' : st.type === 'weekly' ? '📆' : '🗓️'} ${st.text}</span>
                    `).join('')}</div>
                    <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end">
                        <button class="btn-secondary" onclick="adjustProgress('${cat.id}','${g.id}',-10)">-10%</button>
                        <button class="btn-secondary" onclick="adjustProgress('${cat.id}','${g.id}',10)">+10%</button>
                        <button class="btn-danger" onclick="deleteGoal('${cat.id}','${g.id}')">${t('habits.delete')}</button>
                    </div>
                </div>`).join('')}
                ${!goals.length ? `<div class="empty-state"><h3>${t('habits.noGoals')}</h3><p>${t('habits.addGoal')}</p></div>` : ''}
            </div>
        </div>`;
    }).join('');

    renderHabitsDashboard(habits);
    renderHabitsMonthly();
}

function renderHabitsDashboard(habits) {
    const container = document.getElementById('habitsDashboard');
    const allGoals = habits.flatMap(c => (c.goals || []).map(g => ({ ...g, catName: c.name, catIcon: c.icon })));
    const avgProg = allGoals.length ? Math.round(allGoals.reduce((s, g) => s + g.progress, 0) / allGoals.length) : 0;
    container.innerHTML = `
        <div class="prod-stats">
            <div class="prod-stat"><div class="prod-stat-value" style="color:var(--accent-primary)">${avgProg}%</div><div class="prod-stat-label">${t('habits.avgProgress')}</div></div>
            <div class="prod-stat"><div class="prod-stat-value" style="color:var(--success)">${allGoals.filter(g => g.progress >= 100).length}</div><div class="prod-stat-label">${t('habits.completedGoals')}</div></div>
            <div class="prod-stat"><div class="prod-stat-value" style="color:var(--warning)">${allGoals.filter(g => g.progress > 0 && g.progress < 100).length}</div><div class="prod-stat-label">${t('habits.inProgress')}</div></div>
            <div class="prod-stat"><div class="prod-stat-value">${habits.length}</div><div class="prod-stat-label">${t('habits.catCount')}</div></div>
        </div>
        <div class="dashboard-grid">${habits.map(cat => {
        const goals = cat.goals || [];
        const catProg = goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0;
        return `<div class="card"><h3 class="card-title">${cat.icon} ${cat.name}</h3>
                <div class="productivity-summary"><div class="prod-ring" style="background:conic-gradient(var(--accent-primary) ${catProg * 3.6}deg, rgba(180,140,100,0.08) 0deg)">
                    <div style="width:70px;height:70px;border-radius:50%;background:var(--bg-card);display:flex;align-items:center;justify-content:center">
                        <div style="font-size:1.3rem;font-weight:800">${catProg}%</div></div></div>
                <div class="prod-ring-label">${goals.length} ${t('dash.goalsCount')}</div></div></div>`;
    }).join('')}</div>`;
}

function renderHabitsMonthly() {
    const items = loadData(STORAGE_KEYS.prodItems);
    const prod = loadData(STORAGE_KEYS.productivity, {});
    const m = currentHabitMonth; const y = currentHabitYear;
    document.getElementById('habitMonthLabel').textContent = getMonthName(m) + ' ' + y;
    document.getElementById('habitPrevMonth').onclick = () => { currentHabitMonth--; if (currentHabitMonth < 0) { currentHabitMonth = 11; currentHabitYear--; } renderHabitsMonthly(); };
    document.getElementById('habitNextMonth').onclick = () => { currentHabitMonth++; if (currentHabitMonth > 11) { currentHabitMonth = 0; currentHabitYear++; } renderHabitsMonthly(); };
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    let totalChecked = 0, totalPossible = daysInMonth * items.length;
    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        totalChecked += Object.values(prod[key] || {}).filter(Boolean).length;
    }
    const pct = totalPossible ? Math.round(totalChecked / totalPossible * 100) : 0;
    document.getElementById('habitMonthStats').innerHTML = `
        <div class="prod-stat"><div class="prod-stat-value" style="color:var(--accent-primary)">${pct}%</div><div class="prod-stat-label">${t('habits.monthlyProgress')}</div></div>
        <div class="prod-stat"><div class="prod-stat-value" style="color:var(--success)">${totalChecked}</div><div class="prod-stat-label">${t('prod.done')}</div></div>
        <div class="prod-stat"><div class="prod-stat-value" style="color:var(--danger)">${totalPossible - totalChecked}</div><div class="prod-stat-label">${t('prod.notDone')}</div></div>
        <div class="prod-stat"><div class="prod-stat-value">${items.length}</div><div class="prod-stat-label">${t('habits.habitsLabel')}</div></div>`;
    const habitCount = items.length;
    let html = `<div class="prod-row header" style="--habit-count:${habitCount}"><div class="prod-cell header-cell">${t('prod.day')}</div>`;
    items.forEach(item => html += `<div class="prod-cell header-cell" title="${item}">${item.slice(0, 6)}</div>`);
    html += `<div class="prod-cell header-cell">%</div></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const day = prod[key] || {};
        const dayChecked = Object.values(day).filter(Boolean).length;
        const dayPct = items.length ? Math.round(dayChecked / items.length * 100) : 0;
        const pctColor = dayPct >= 80 ? 'var(--success)' : dayPct >= 50 ? 'var(--warning)' : 'var(--danger)';
        html += `<div class="prod-row" style="--habit-count:${habitCount}"><div class="prod-cell day-num">${d}</div>`;
        items.forEach((_, i) => { html += `<div class="prod-cell"><button class="prod-check ${(day[i] || false) ? 'checked' : ''}" onclick="toggleHabitMonth('${key}',${i})"></button></div>`; });
        html += `<div class="prod-cell pct" style="color:${pctColor}">${dayPct}%</div></div>`;
    }
    document.getElementById('habitMonthGrid').innerHTML = html;
}

function toggleHabitMonth(key, index) { const prod = loadData(STORAGE_KEYS.productivity, {}); if (!prod[key]) prod[key] = {}; prod[key][index] = !prod[key][index]; saveData(STORAGE_KEYS.productivity, prod); renderHabitsMonthly(); }
function toggleSubtask(catId, goalId, stId) { const habits = loadData(STORAGE_KEYS.habits, []); const cat = habits.find(c => c.id === catId); if (!cat) return; const goal = (cat.goals || []).find(g => g.id === goalId); if (!goal) return; const st = (goal.subtasks || []).find(s => s.id === stId); if (st) { st.done = !st.done; saveData(STORAGE_KEYS.habits, habits); renderHabits(); } }
function adjustProgress(catId, goalId, delta) { const habits = loadData(STORAGE_KEYS.habits, []); const cat = habits.find(c => c.id === catId); if (!cat) return; const goal = (cat.goals || []).find(g => g.id === goalId); if (goal) { goal.progress = Math.max(0, Math.min(100, goal.progress + delta)); saveData(STORAGE_KEYS.habits, habits); renderHabits(); } }
function deleteGoal(catId, goalId) { const habits = loadData(STORAGE_KEYS.habits, []); const cat = habits.find(c => c.id === catId); if (cat) { cat.goals = (cat.goals || []).filter(g => g.id !== goalId); saveData(STORAGE_KEYS.habits, habits); renderHabits(); showToast(t('habits.goalDeleted'), 'info'); } }

function showGoalModal() {
    const habits = loadData(STORAGE_KEYS.habits, []);
    openModal(t('habits.newGoal'), `
        <div class="form-group"><label class="form-label">${t('tasks.category')}</label><select class="form-select" id="mGoalCat">
            ${habits.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">${t('habits.goalName')}</label><input class="form-input" id="mGoalName"></div>
        <div class="form-group"><label class="form-label">${t('habits.goalDesc')}</label><textarea class="form-textarea" id="mGoalDesc"></textarea></div>
        <div class="form-actions"><button class="btn-secondary" onclick="closeModal()">${t('common.cancel')}</button>
        <button class="btn-primary" onclick="saveGoal()">${t('common.save')}</button></div>`);
}

function saveGoal() {
    const catId = document.getElementById('mGoalCat').value;
    const name = document.getElementById('mGoalName').value.trim();
    const desc = document.getElementById('mGoalDesc').value.trim();
    if (!name) { showToast(t('habits.enterGoalName'), 'error'); return; }
    const habits = loadData(STORAGE_KEYS.habits, []);
    const cat = habits.find(c => c.id === catId);
    if (cat) {
        if (!cat.goals) cat.goals = [];
        cat.goals.push({ id: genId(), name, desc, progress: 0, subtasks: [{ id: genId(), text: 'Kunlik vazifa', type: 'daily', done: false }, { id: genId(), text: 'Haftalik vazifa', type: 'weekly', done: false }, { id: genId(), text: 'Oylik vazifa', type: 'monthly', done: false }] });
        saveData(STORAGE_KEYS.habits, habits); closeModal(); renderHabits(); showToast(t('habits.goalAdded'));
    }
}
