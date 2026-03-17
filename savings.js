document.addEventListener('DOMContentLoaded', function() {
    var container    = document.getElementById('accounts-container');
    var totalDisplay = document.getElementById('total-savings-amount');
    var addBtn       = document.getElementById('add-account-btn');
    var modalInput   = document.getElementById('new-account-name');
    var modalOverlay = document.getElementById('modal-overlay');
    var deleteModal  = document.getElementById('delete-modal-overlay');

    // Migrate old format (balance) → new history format
    var accounts = JSON.parse(localStorage.getItem('savingsAccounts')) || [];
    accounts = accounts.map(function(acc) {
        if (!acc.history) {
            return { name: acc.name, history: parseFloat(acc.balance) > 0
                ? [{ date: new Date().toISOString().split('T')[0], balance: parseFloat(acc.balance) || 0 }]
                : [] };
        }
        return acc;
    });

    // ─── Helpers ─────────────────────────────────────────

    function getLatestBalance(acc) {
        if (!acc.history || acc.history.length === 0) return 0;
        var sorted = acc.history.slice().sort(function(a, b) { return a.date.localeCompare(b.date); });
        return parseFloat(sorted[sorted.length - 1].balance) || 0;
    }

    function getLatestDate(acc) {
        if (!acc.history || acc.history.length === 0) return null;
        var sorted = acc.history.slice().sort(function(a, b) { return a.date.localeCompare(b.date); });
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

    function save() { localStorage.setItem('savingsAccounts', JSON.stringify(accounts)); }

    // ─── Render ──────────────────────────────────────────

    function updateUI() {
        container.innerHTML = '';
        var total = 0;

        accounts.forEach(function(acc, index) {
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
                    '<button class="acc-edit-btn" onclick="window.openEntryModal(' + index + ')" title="Add / edit entries">&#9998;</button>' +
                    '<button class="delete-btn" onclick="window.openDeleteModal(' + index + ')">\u2715</button>' +
                '</div>';
            container.appendChild(div);
        });

        totalDisplay.innerText = fmtMoney(total);
        save();
        updateChart();
    }

    // ─── Chart ───────────────────────────────────────────

    var chartElem = document.getElementById('yearlySavingsChart');
    var savingsChart;

    function buildChartData() {
        var byDate = {};
        accounts.forEach(function(acc) {
            (acc.history || []).forEach(function(e) { byDate[e.date] = true; });
        });
        var dates = Object.keys(byDate).sort();
        if (dates.length === 0) return { labels: [], data: [] };

        var totals = dates.map(function(date) {
            var sum = 0;
            accounts.forEach(function(acc) {
                var sorted = (acc.history || []).slice().sort(function(a,b){ return a.date.localeCompare(b.date); });
                var last = 0;
                sorted.forEach(function(e) { if (e.date <= date) last = parseFloat(e.balance) || 0; });
                sum += last;
            });
            return sum;
        });

        return { labels: dates.map(fmtDate), data: totals };
    }

    function updateChart() {
        if (!chartElem) return;
        var cd = buildChartData();
        if (!savingsChart) {
            savingsChart = new Chart(chartElem.getContext('2d'), {
                type: 'line',
                data: {
                    labels: cd.labels,
                    datasets: [{
                        label: 'Savings',
                        data: cd.data,
                        borderColor: '#4facfe',
                        backgroundColor: 'rgba(79,172,254,0.08)',
                        fill: true, tension: 0.4, borderWidth: 2.5,
                        pointRadius: 5, pointBackgroundColor: '#4facfe',
                        pointBorderColor: '#0b0e14', pointBorderWidth: 2, pointHoverRadius: 7
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(11,14,20,0.95)',
                            titleColor: '#888891', bodyColor: '#fff',
                            borderColor: 'rgba(79,172,254,0.3)', borderWidth: 1, padding: 12,
                            callbacks: { label: function(c) { return '  \u20ac ' + c.raw.toLocaleString('nl-NL', { minimumFractionDigits: 2 }); } }
                        }
                    },
                    scales: {
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888891', callback: function(v) { return '\u20ac ' + v.toLocaleString('nl-NL'); } } },
                        x: { grid: { display: false }, ticks: { color: '#888891', maxTicksLimit: 8 } }
                    }
                }
            });
        } else {
            savingsChart.data.labels = cd.labels;
            savingsChart.data.datasets[0].data = cd.data;
            savingsChart.update();
        }
    }

    // ─── Add account (name only) ──────────────────────────

    addBtn.onclick = function() {
        modalOverlay.style.display = 'flex';
        modalInput.focus();
    };

    document.getElementById('confirm-modal').onclick = function() {
        var name = modalInput.value.trim();
        if (!name) return;
        accounts.push({ name: name, history: [] });
        updateUI();
        modalOverlay.style.display = 'none';
        modalInput.value = '';
    };

    document.getElementById('cancel-modal').onclick = function() { modalOverlay.style.display = 'none'; };

    // ─── Entry modal (add / view history) ────────────────

    var entryModal      = document.getElementById('entry-modal-overlay');
    var entryModalTitle = document.getElementById('entry-modal-title');
    var entryDateInp    = document.getElementById('entry-date');
    var entryAmtInp     = document.getElementById('entry-amount');
    var entryList       = document.getElementById('entry-history-list');
    var activeIndex     = null;

    window.openEntryModal = function(index) {
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
        var sorted = (accounts[activeIndex].history || []).slice().sort(function(a,b){ return b.date.localeCompare(a.date); });
        if (sorted.length === 0) {
            entryList.innerHTML = '<p class="entry-empty">No entries yet. Add one above.</p>';
            return;
        }
        sorted.forEach(function(e, i) {
            var row = document.createElement('div');
            row.className = 'entry-row';
            row.innerHTML =
                '<span class="entry-date">' + fmtDate(e.date) + '</span>' +
                '<span class="entry-bal">' + fmtMoney(e.balance) + '</span>' +
                '<button class="entry-delete-btn" onclick="window.deleteEntry(' + i + ')">\u2715</button>';
            entryList.appendChild(row);
        });
    }

    document.getElementById('confirm-entry').onclick = function() {
        var date    = entryDateInp.value;
        var balance = parseFloat(entryAmtInp.value.replace(',', '.'));
        if (!date || isNaN(balance)) return;

        // Replace if same date already exists, otherwise add
        var history = accounts[activeIndex].history || [];
        var existing = history.findIndex(function(e) { return e.date === date; });
        if (existing >= 0) {
            history[existing].balance = balance;
        } else {
            history.push({ date: date, balance: balance });
        }
        history.sort(function(a,b){ return a.date.localeCompare(b.date); });
        accounts[activeIndex].history = history;
        entryAmtInp.value = '';
        renderEntryHistory();
        updateUI();
    };

    window.deleteEntry = function(sortedIndex) {
        var sorted = (accounts[activeIndex].history || []).slice().sort(function(a,b){ return b.date.localeCompare(a.date); });
        var entryToDelete = sorted[sortedIndex];
        accounts[activeIndex].history = accounts[activeIndex].history.filter(function(e) {
            return !(e.date === entryToDelete.date && e.balance === entryToDelete.balance);
        });
        renderEntryHistory();
        updateUI();
    };

    document.getElementById('close-entry-modal').onclick = function() { entryModal.style.display = 'none'; };

    // ─── Delete account ───────────────────────────────────

    window.openDeleteModal = function(index) {
        window.indexToDelete = index;
        deleteModal.style.display = 'flex';
    };

    document.getElementById('confirm-delete').onclick = function() {
        if (window.indexToDelete === undefined) return;
        accounts.splice(window.indexToDelete, 1);
        updateUI();
        deleteModal.style.display = 'none';
    };

    document.getElementById('cancel-delete').onclick = function() { deleteModal.style.display = 'none'; };

    updateUI();
});