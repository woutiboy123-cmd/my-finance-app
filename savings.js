document.addEventListener('DOMContentLoaded', async function () {
    const container    = document.getElementById('accounts-container');
    const totalDisplay = document.getElementById('total-savings-amount');
    const addBtn       = document.getElementById('add-account-btn');
    const modalInput   = document.getElementById('new-account-name');
    const modalOverlay = document.getElementById('modal-overlay');
    const deleteModal  = document.getElementById('delete-modal-overlay');

    // In-memory structure: [{ id, name, history: [{id, date, balance}] }]
    // Declared first so the cache block below can safely reference it.
    let accounts = [];

    // ─── Show cache immediately (before requireAuth waits) ───
    const localUid = getLocalUserId();
    if (localUid) {
        try {
            const cached = JSON.parse(localStorage.getItem('cache_savings_' + localUid));
            if (Array.isArray(cached) && cached.length > 0) {
                accounts = cached;
                updateUI();
            }
        } catch (e) {}
    }

    const sb   = getSupabase();
    const user = await requireAuth();
    if (!user) return;

    const CACHE_KEY = 'cache_savings_' + user.id;

    function saveCache(data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {}
    }

    function loadCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || []; } catch (e) { return []; }
    }

    // ─── Load data from Supabase ──────────────────────────

    async function loadData() {
        const cached = loadCache();
        if (cached.length > 0 && accounts.length === 0) { accounts = cached; updateUI(); }

        const r1 = await sb.from('savings_accounts').select('id, name').order('created_at');
        if (r1.error) { console.error(r1.error); return; }

        const r2 = await sb.from('savings_entries').select('id, account_id, date, balance').order('date');
        if (r2.error) { console.error(r2.error); return; }

        accounts = (r1.data || []).map(function (acc) {
            const history = (r2.data || [])
                .filter(function (e) { return e.account_id === acc.id; })
                .map(function (e) { return { id: e.id, date: e.date, balance: parseFloat(e.balance) }; });
            return { id: acc.id, name: acc.name, history: history };
        });

        saveCache(accounts);
        updateUI();
    }

    // ─── Helpers ──────────────────────────────────────────

    function getLatestBalance(acc) {
        if (!acc.history || acc.history.length === 0) return 0;
        const sorted = acc.history.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
        return parseFloat(sorted[sorted.length - 1].balance) || 0;
    }

    function getLatestDate(acc) {
        if (!acc.history || acc.history.length === 0) return null;
        const sorted = acc.history.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
        return sorted[sorted.length - 1].date;
    }

    function fmtDate(iso) {
        if (!iso) return '';
        const p = iso.split('-');
        return p[2] + '-' + p[1] + '-' + p[0];
    }

    function fmtMoney(n) {
        return '\u20ac ' + (parseFloat(n) || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 });
    }

    // ─── Render ───────────────────────────────────────────

    function updateUI() {
        container.innerHTML = '';
        let total = 0;

        accounts.forEach(function (acc, index) {
            const balance = getLatestBalance(acc);
            const date    = getLatestDate(acc);
            const datePill = fmtDate(date);
            total += balance;

            const div = document.createElement('div');
            div.className = 'account-item';
            div.innerHTML =
                '<span class="acc-name">' + escapeHtml(acc.name) + '</span>' +
                '<div class="account-item-controls">' +
                    '<span class="acc-date-pill"' + (datePill ? '' : ' style="display:none"') + '>' + escapeHtml(datePill) + '</span>' +
                    '<span class="acc-balance-display">' + fmtMoney(balance) + '</span>' +
                    '<button class="acc-edit-btn" onclick="window.openEntryModal(' + index + ')" title="Edit entries">&#9998;</button>' +
                    '<button class="delete-btn" onclick="window.openDeleteModal(' + index + ')">\u2715</button>' +
                '</div>';
            container.appendChild(div);
        });

        totalDisplay.innerText = fmtMoney(total);
        updateChart();
    }

    // ─── Chart ────────────────────────────────────────────

    const chartElem = document.getElementById('yearlySavingsChart');
    let savingsChart;

    function buildChartData() {
        const byDate = {};
        accounts.forEach(function (acc) {
            (acc.history || []).forEach(function (e) { byDate[e.date] = true; });
        });
        const dates = Object.keys(byDate).sort();
        if (dates.length === 0) return { labels: [], data: [] };

        const totals = dates.map(function (date) {
            let sum = 0;
            accounts.forEach(function (acc) {
                const sorted = (acc.history || []).slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
                let last = 0;
                sorted.forEach(function (e) { if (e.date <= date) last = parseFloat(e.balance) || 0; });
                sum += last;
            });
            return sum;
        });

        return { labels: dates.map(fmtDate), data: totals };
    }

    function updateChart() {
        if (!chartElem) return;
        const cd = buildChartData();
        if (!savingsChart) {
            savingsChart = new Chart(chartElem.getContext('2d'), {
                type: 'line',
                data: {
                    labels: cd.labels,
                    datasets: [{ label: 'Savings', data: cd.data, borderColor: '#4facfe', backgroundColor: 'rgba(79,172,254,0.08)', fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#4facfe', pointBorderColor: '#0b0e14', pointBorderWidth: 2, pointHoverRadius: 7 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: 'rgba(11,14,20,0.95)', titleColor: '#888891', bodyColor: '#fff', borderColor: 'rgba(79,172,254,0.3)', borderWidth: 1, padding: 12, callbacks: { label: function (c) { return '  \u20ac ' + c.raw.toLocaleString('nl-NL', { minimumFractionDigits: 2 }); } } }
                    },
                    scales: {
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888891', callback: function (v) { return '\u20ac ' + v.toLocaleString('nl-NL'); } } },
                        x: { grid: { display: false }, ticks: { color: '#888891', maxTicksLimit: 8 } }
                    }
                }
            });
        } else {
            savingsChart.data.labels           = cd.labels;
            savingsChart.data.datasets[0].data = cd.data;
            savingsChart.update();
        }
    }

    // ─── Add account ──────────────────────────────────────

    addBtn.onclick = function () { modalOverlay.style.display = 'flex'; modalInput.focus(); };

    document.getElementById('confirm-modal').onclick = async function () {
        const name = modalInput.value.trim();
        if (!name) return;

        const { data, error } = await sb.from('savings_accounts')
            .insert({ name: name, user_id: user.id })
            .select('id, name').single();
        if (error) { console.error(error); return; }

        accounts.push({ id: data.id, name: data.name, history: [] });
        saveCache(accounts);
        updateUI();
        modalOverlay.style.display = 'none';
        modalInput.value = '';
    };

    document.getElementById('cancel-modal').onclick = function () { modalOverlay.style.display = 'none'; };

    // ─── Entry modal (view/add history) ──────────────────

    const entryModal      = document.getElementById('entry-modal-overlay');
    const entryModalTitle = document.getElementById('entry-modal-title');
    const entryDateInp    = document.getElementById('entry-date');
    const entryAmtInp     = document.getElementById('entry-amount');
    const entryList       = document.getElementById('entry-history-list');
    let activeIndex = null;

    window.openEntryModal = function (index) {
        activeIndex = index;
        entryModalTitle.innerText = accounts[index].name;
        const today = new Date().toISOString().split('T')[0];
        entryDateInp.value = today;
        entryDateInp.max   = today;
        entryAmtInp.value  = '';
        renderEntryHistory();
        entryModal.style.display = 'flex';
        entryAmtInp.focus();
    };

    function renderEntryHistory() {
        entryList.innerHTML = '';
        const sorted = (accounts[activeIndex].history || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
        if (sorted.length === 0) {
            entryList.innerHTML = '<p class="entry-empty">No entries yet. Add one above.</p>';
            return;
        }
        sorted.forEach(function (e, i) {
            const row = document.createElement('div');
            row.className = 'entry-row';
            row.innerHTML =
                '<span class="entry-date">' + escapeHtml(fmtDate(e.date)) + '</span>' +
                '<span class="entry-bal">' + fmtMoney(e.balance) + '</span>' +
                '<button class="entry-delete-btn" onclick="window.deleteEntry(' + i + ')">\u2715</button>';
            entryList.appendChild(row);
        });
    }

    document.getElementById('confirm-entry').onclick = async function () {
        const date    = entryDateInp.value;
        const balance = parseFloat(entryAmtInp.value.replace(',', '.'));
        if (!date || isNaN(balance)) return;

        const acc      = accounts[activeIndex];
        const existing = acc.history.find(function (e) { return e.date === date; });

        if (existing) {
            const { error } = await sb.from('savings_entries').update({ balance: balance }).eq('id', existing.id);
            if (error) { console.error(error); return; }
            existing.balance = balance;
        } else {
            const { data, error } = await sb.from('savings_entries')
                .insert({ account_id: acc.id, user_id: user.id, date: date, balance: balance })
                .select('id, date, balance').single();
            if (error) { console.error(error); return; }
            acc.history.push({ id: data.id, date: data.date, balance: parseFloat(data.balance) });
            acc.history.sort(function (a, b) { return a.date.localeCompare(b.date); });
        }

        entryAmtInp.value = '';
        saveCache(accounts);
        renderEntryHistory();
        updateUI();
    };

    window.deleteEntry = async function (sortedIndex) {
        const sorted = (accounts[activeIndex].history || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
        const entry  = sorted[sortedIndex];

        const { error } = await sb.from('savings_entries').delete().eq('id', entry.id);
        if (error) { console.error(error); return; }

        accounts[activeIndex].history = accounts[activeIndex].history.filter(function (e) { return e.id !== entry.id; });
        saveCache(accounts);
        renderEntryHistory();
        updateUI();
    };

    document.getElementById('close-entry-modal').onclick = function () { entryModal.style.display = 'none'; };

    // ─── Delete account ───────────────────────────────────

    // Use a local variable instead of window.indexToDelete
    let indexToDelete = null;

    window.openDeleteModal = function (index) {
        indexToDelete = index;
        deleteModal.style.display = 'flex';
    };

    document.getElementById('confirm-delete').onclick = async function () {
        if (indexToDelete === null) return;
        const acc   = accounts[indexToDelete];
        const index = indexToDelete;
        indexToDelete = null;

        const { error } = await sb.from('savings_accounts').delete().eq('id', acc.id);
        if (error) { console.error(error); return; }

        accounts.splice(index, 1);
        saveCache(accounts);
        updateUI();
        deleteModal.style.display = 'none';
    };

    document.getElementById('cancel-delete').onclick = function () {
        indexToDelete = null;
        deleteModal.style.display = 'none';
    };

    // ─── Start ────────────────────────────────────────────
    await loadData();
});