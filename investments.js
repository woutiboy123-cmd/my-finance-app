document.addEventListener('DOMContentLoaded', async function () {
    var container    = document.getElementById('accounts-container');
    var totalDisplay = document.getElementById('total-investment-amount');
    var addBtn       = document.getElementById('add-account-btn');
    var modalInput   = document.getElementById('new-account-name');
    var modalOverlay = document.getElementById('modal-overlay');
    var deleteModal  = document.getElementById('delete-modal-overlay');


    // ─── Cache instant tonen (voor requireAuth wacht) ────
    var localUid = getLocalUserId();
    if (localUid) {
        var _ck = 'cache_investments_' + localUid;
        try {
            var _cached = JSON.parse(localStorage.getItem(_ck));
            if (_cached.length > 0) {
                accounts = _cached; updateUI();
            }
        } catch(e) {}
    }

    var sb   = getSupabase();
    var user = await requireAuth();
    if (!user) return;


    var CACHE_KEY = 'cache_investments_' + user.id;

    function saveCache(data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch(e) {}
    }

    function loadCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || []; } catch(e) { return []; }
    }

    // In-memory structuur: [{ id, name, history: [{id, date, balance}] }]
    var accounts = [];

    // ─── Laad data van Supabase ───────────────────────────

    async function loadData() {
        // Show from proper cache if not already shown
        var cached = loadCache();
        if (cached.length > 0) { accounts = cached; updateUI(); }

        var r1 = await sb.from('investment_accounts').select('id, name').order('created_at');
        if (r1.error) { console.error(r1.error); return; }

        var r2 = await sb.from('investment_entries').select('id, account_id, date, balance').order('date');
        if (r2.error) { console.error(r2.error); return; }

        accounts = (r1.data || []).map(function (acc) {
            var history = (r2.data || [])
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
        var sorted = acc.history.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
        return parseFloat(sorted[sorted.length - 1].balance) || 0;
    }

    function getLatestDate(acc) {
        if (!acc.history || acc.history.length === 0) return null;
        var sorted = acc.history.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
        return sorted[sorted.length - 1].date;
    }

    function fmtDate(iso) {
        if (!iso) return '';
        var p = iso.split('-');
        return p[2] + '-' + p[1] + '-' + p[0];
    }

    function fmtMoney(n) {
        return '\u20ac ' + (parseFloat(n) || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 });
    }

    // ─── Render ───────────────────────────────────────────

    function updateUI() {
        container.innerHTML = '';
        var total = 0;

        accounts.forEach(function (acc, index) {
            var balance = getLatestBalance(acc);
            var date    = getLatestDate(acc);
            total += balance;

            var div = document.createElement('div');
            div.className = 'account-item';
            div.innerHTML =
                '<span class="acc-name">' + acc.name + '</span>' +
                '<div class="account-item-controls">' +
                    '<span class="acc-date-pill"' + (fmtDate(date) ? '' : ' style="display:none"') + '>' + fmtDate(date) + '</span>' +
                    '<span class="acc-balance-display">' + fmtMoney(balance) + '</span>' +
                    '<button class="acc-edit-btn" onclick="window.openEntryModal(' + index + ')" title="Entries bewerken">&#9998;</button>' +
                    '<button class="delete-btn" onclick="window.openDeleteModal(' + index + ')">\u2715</button>' +
                '</div>';
            container.appendChild(div);
        });

        totalDisplay.innerText = fmtMoney(total);
        updateChart();
    }

    // ─── Chart ────────────────────────────────────────────

    var chartElem = document.getElementById('yearlyInvestmentChart');
    var investChart;

    function buildChartData() {
        var byDate = {};
        accounts.forEach(function (acc) {
            (acc.history || []).forEach(function (e) { byDate[e.date] = true; });
        });
        var dates = Object.keys(byDate).sort();
        if (dates.length === 0) return { labels: [], data: [] };

        var totals = dates.map(function (date) {
            var sum = 0;
            accounts.forEach(function (acc) {
                var sorted = (acc.history || []).slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
                var last   = 0;
                sorted.forEach(function (e) { if (e.date <= date) last = parseFloat(e.balance) || 0; });
                sum += last;
            });
            return sum;
        });

        return { labels: dates.map(fmtDate), data: totals };
    }

    function updateChart() {
        if (!chartElem) return;
        var cd = buildChartData();
        if (!investChart) {
            investChart = new Chart(chartElem.getContext('2d'), {
                type: 'line',
                data: {
                    labels: cd.labels,
                    datasets: [{ label: 'Investments', data: cd.data, borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.08)', fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#4ade80', pointBorderColor: '#0b0e14', pointBorderWidth: 2, pointHoverRadius: 7 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: 'rgba(11,14,20,0.95)', titleColor: '#888891', bodyColor: '#fff', borderColor: 'rgba(74,222,128,0.3)', borderWidth: 1, padding: 12, callbacks: { label: function (c) { return '  \u20ac ' + c.raw.toLocaleString('nl-NL', { minimumFractionDigits: 2 }); } } }
                    },
                    scales: {
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888891', callback: function (v) { return '\u20ac ' + v.toLocaleString('nl-NL'); } } },
                        x: { grid: { display: false }, ticks: { color: '#888891', maxTicksLimit: 8 } }
                    }
                }
            });
        } else {
            investChart.data.labels           = cd.labels;
            investChart.data.datasets[0].data = cd.data;
            investChart.update();
        }
    }

    // ─── Portfolio toevoegen ──────────────────────────────

    addBtn.onclick = function () { modalOverlay.style.display = 'flex'; modalInput.focus(); };

    document.getElementById('confirm-modal').onclick = async function () {
        var name = modalInput.value.trim();
        if (!name) return;

        var r = await sb.from('investment_accounts')
            .insert({ name: name, user_id: user.id })
            .select('id, name').single();
        if (r.error) { console.error(r.error); return; }

        accounts.push({ id: r.data.id, name: r.data.name, history: [] });
        saveCache(accounts);
        updateUI();
        modalOverlay.style.display = 'none';
        modalInput.value = '';
    };

    document.getElementById('cancel-modal').onclick = function () { modalOverlay.style.display = 'none'; };

    // ─── Entry modal (history bekijken / toevoegen) ───────

    var entryModal      = document.getElementById('entry-modal-overlay');
    var entryModalTitle = document.getElementById('entry-modal-title');
    var entryDateInp    = document.getElementById('entry-date');
    var entryAmtInp     = document.getElementById('entry-amount');
    var entryList       = document.getElementById('entry-history-list');
    var activeIndex     = null;

    window.openEntryModal = function (index) {
        activeIndex = index;
        entryModalTitle.innerText = accounts[index].name;
        var today = new Date().toISOString().split('T')[0];
        entryDateInp.value = today;
        entryDateInp.max   = today;
        entryAmtInp.value  = '';
        renderEntryHistory();
        entryModal.style.display = 'flex';
        entryAmtInp.focus();
    };

    function renderEntryHistory() {
        entryList.innerHTML = '';
        var sorted = (accounts[activeIndex].history || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
        if (sorted.length === 0) {
            entryList.innerHTML = '<p class="entry-empty">Nog geen entries. Voeg er een toe hierboven.</p>';
            return;
        }
        sorted.forEach(function (e, i) {
            var row = document.createElement('div');
            row.className = 'entry-row';
            row.innerHTML =
                '<span class="entry-date">' + fmtDate(e.date) + '</span>' +
                '<span class="entry-bal">' + fmtMoney(e.balance) + '</span>' +
                '<button class="entry-delete-btn" onclick="window.deleteEntry(' + i + ')">\u2715</button>';
            entryList.appendChild(row);
        });
    }

    document.getElementById('confirm-entry').onclick = async function () {
        var date    = entryDateInp.value;
        var balance = parseFloat(entryAmtInp.value.replace(',', '.'));
        if (!date || isNaN(balance)) return;

        var acc      = accounts[activeIndex];
        var existing = acc.history.find(function (e) { return e.date === date; });

        if (existing) {
            var r = await sb.from('investment_entries').update({ balance: balance }).eq('id', existing.id);
            if (r.error) { console.error(r.error); return; }
            existing.balance = balance;
        } else {
            var r = await sb.from('investment_entries')
                .insert({ account_id: acc.id, user_id: user.id, date: date, balance: balance })
                .select('id, date, balance').single();
            if (r.error) { console.error(r.error); return; }
            acc.history.push({ id: r.data.id, date: r.data.date, balance: parseFloat(r.data.balance) });
            acc.history.sort(function (a, b) { return a.date.localeCompare(b.date); });
        }

        entryAmtInp.value = '';
        saveCache(accounts);
        renderEntryHistory();
        updateUI();
    };

    window.deleteEntry = async function (sortedIndex) {
        var sorted = (accounts[activeIndex].history || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
        var entry  = sorted[sortedIndex];

        var r = await sb.from('investment_entries').delete().eq('id', entry.id);
        if (r.error) { console.error(r.error); return; }

        accounts[activeIndex].history = accounts[activeIndex].history.filter(function (e) { return e.id !== entry.id; });
        saveCache(accounts);
        renderEntryHistory();
        updateUI();
    };

    document.getElementById('close-entry-modal').onclick = function () { entryModal.style.display = 'none'; };

    // ─── Portfolio verwijderen ────────────────────────────

    window.openDeleteModal = function (index) { window.indexToDelete = index; deleteModal.style.display = 'flex'; };

    document.getElementById('confirm-delete').onclick = async function () {
        if (window.indexToDelete === undefined) return;
        var acc = accounts[window.indexToDelete];

        var r = await sb.from('investment_accounts').delete().eq('id', acc.id);
        if (r.error) { console.error(r.error); return; }

        accounts.splice(window.indexToDelete, 1);
        saveCache(accounts);
        updateUI();
        deleteModal.style.display = 'none';
    };

    document.getElementById('cancel-delete').onclick = function () { deleteModal.style.display = 'none'; };

    // ─── Start ────────────────────────────────────────────
    await loadData();
});