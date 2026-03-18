document.addEventListener('DOMContentLoaded', async function () {
    const savingsDisplay      = document.getElementById('dashboard-savings-amount');
    const investmentDisplay   = document.getElementById('dashboard-investment-amount');
    const totalBalanceDisplay = document.getElementById('total-combined-balance');
    const portfolioCanvas     = document.getElementById('portfolioSpreadChart');
    const netWorthCanvas      = document.getElementById('netWorthChart');
    const transList           = document.getElementById('transactions-list');

    // ─── Show dashboard cache immediately ────────────────
    const localUid = getLocalUserId();
    if (localUid) {
        try {
            const dc = JSON.parse(localStorage.getItem('cache_dashboard_' + localUid));
            if (dc) {
                const fmt = function (n) { return '\u20ac ' + (parseFloat(n) || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
                if (savingsDisplay)      savingsDisplay.innerText      = fmt(dc.totalSavings     || 0);
                if (investmentDisplay)   investmentDisplay.innerText   = fmt(dc.totalInvestments || 0);
                if (totalBalanceDisplay) totalBalanceDisplay.innerText = fmt(dc.combinedTotal    || 0);
            }
        } catch (e) {}
    }

    const sb   = getSupabase();
    const user = await requireAuth();
    if (!user) return;

    const CACHE_KEY = 'cache_dashboard_' + user.id;

    function saveCache(data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {}
    }

    const fmt = function (n) {
        return '\u20ac ' + (parseFloat(n) || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    function fmtDate(iso) {
        if (!iso) return '';
        const p = iso.split('-');
        return p[2] + '-' + p[1] + '-' + p[0];
    }

    function getLatestBalance(acc) {
        if (!acc.history || acc.history.length === 0) return 0;
        const sorted = acc.history.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
        return parseFloat(sorted[sorted.length - 1].balance) || 0;
    }

    // ─── Load all data in parallel ────────────────────────

    const results = await Promise.all([
        sb.from('savings_accounts').select('id, name').order('created_at'),
        sb.from('savings_entries').select('account_id, date, balance').order('date'),
        sb.from('investment_accounts').select('id, name').order('created_at'),
        sb.from('investment_entries').select('account_id, date, balance').order('date'),
        sb.from('transactions').select('id, category, amount, date, note')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(10)
    ]);

    const savAccs = results[0].data || [];
    const savEnts = results[1].data || [];
    const invAccs = results[2].data || [];
    const invEnts = results[3].data || [];
    const txns    = results[4].data || [];

    // Build account objects with history
    const savingsData = savAccs.map(function (acc) {
        return {
            id: acc.id, name: acc.name,
            history: savEnts.filter(function (e) { return e.account_id === acc.id; })
                            .map(function (e) { return { date: e.date, balance: parseFloat(e.balance) }; })
        };
    });

    const investmentData = invAccs.map(function (acc) {
        return {
            id: acc.id, name: acc.name,
            history: invEnts.filter(function (e) { return e.account_id === acc.id; })
                            .map(function (e) { return { date: e.date, balance: parseFloat(e.balance) }; })
        };
    });

    // ─── Totals ───────────────────────────────────────────

    const totalSavings     = savingsData.reduce(function (s, a) { return s + getLatestBalance(a); }, 0);
    const totalInvestments = investmentData.reduce(function (s, a) { return s + getLatestBalance(a); }, 0);
    const combinedTotal    = totalSavings + totalInvestments;

    if (savingsDisplay)      savingsDisplay.innerText      = fmt(totalSavings);
    if (investmentDisplay)   investmentDisplay.innerText   = fmt(totalInvestments);
    if (totalBalanceDisplay) totalBalanceDisplay.innerText = fmt(combinedTotal);
    saveCache({ totalSavings, totalInvestments, combinedTotal });

    // ─── Recent transactions ──────────────────────────────

    if (transList) {
        if (txns.length === 0) {
            transList.innerHTML = '<p class="empty-state">No transactions yet.</p>';
        } else {
            txns.forEach(function (t, index) {
                const amount = parseFloat(t.amount) || 0;
                const isNeg  = amount < 0;
                const div    = document.createElement('div');
                div.className = 'account-item';
                div.innerHTML =
                    '<span class="category-display">' + escapeHtml(t.category) + '</span>' +
                    '<span class="date-display">' + escapeHtml(fmtDate(t.date)) + '</span>' +
                    '<span class="trans-right-side ' + (isNeg ? 'amount-negative' : 'amount-positive') + '">' +
                        (isNeg ? '-' : '+') + ' \u20ac ' +
                        Math.abs(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 }) +
                    '</span>';
                transList.appendChild(div);
                if (index < txns.length - 1) {
                    const hr = document.createElement('div');
                    hr.className = 'subtle-divider';
                    transList.appendChild(hr);
                }
            });
        }
    }

    // ─── Portfolio Spread (Doughnut) ──────────────────────

    if (portfolioCanvas) {
        const allAccounts  = savingsData.concat(investmentData);
        const labels       = allAccounts.map(function (a) { return a.name; });
        const dataValues   = allAccounts.map(function (a) { return getLatestBalance(a); });
        const colorPalette = ['#4facfe','#4ade80','#facc15','#f87171','#a78bfa','#fb923c','#2dd4bf','#e879f9','#94a3b8','#fb7185'];

        new Chart(portfolioCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ data: dataValues, backgroundColor: colorPalette.slice(0, allAccounts.length), borderColor: '#1a1d23', borderWidth: 2, hoverOffset: 15 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                layout: { padding: { right: 10, top: 24, bottom: 24, left: 10 } },
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#c0c0c8', padding: 20, font: { size: 13 }, usePointStyle: true, pointStyle: 'circle',
                            generateLabels: function (chart) {
                                const data  = chart.data;
                                const total = data.datasets[0].data.reduce(function (a, b) { return a + b; }, 0);
                                return data.labels.map(function (label, i) {
                                    const value = data.datasets[0].data[i] || 0;
                                    const pct   = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return { text: label + '  ' + pct + '%', fillStyle: colorPalette[i], strokeStyle: colorPalette[i], fontColor: '#c0c0c8', pointStyle: 'circle', hidden: false, index: i };
                                });
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                const val   = ctx.raw || 0;
                                const total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                                const pct   = total > 0 ? Math.round((val / total) * 100) : 0;
                                return ' ' + ctx.label + ': \u20ac' + val.toLocaleString('nl-NL') + ' (' + pct + '%)';
                            }
                        }
                    }
                },
                cutout: '62%'
            }
        });
    }

    // ─── Net Worth Growth (Line) ──────────────────────────

    if (netWorthCanvas) {
        const allDateMap = {};
        savingsData.concat(investmentData).forEach(function (acc) {
            (acc.history || []).forEach(function (e) { allDateMap[e.date] = true; });
        });

        if (Object.keys(allDateMap).length === 0) {
            allDateMap[new Date().toISOString().split('T')[0]] = true;
        }

        const sortedDates = Object.keys(allDateMap).sort();

        const netWorthPoints = sortedDates.map(function (date) {
            let sum = 0;
            savingsData.concat(investmentData).forEach(function (acc) {
                const hist = (acc.history || []).slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
                let last = 0;
                hist.forEach(function (e) { if (e.date <= date) last = parseFloat(e.balance) || 0; });
                sum += last;
            });
            return sum;
        });

        const netLabels = sortedDates.map(fmtDate);

        new Chart(netWorthCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: netLabels,
                datasets: [{ data: netWorthPoints, borderColor: '#ffffff', backgroundColor: 'rgba(255,255,255,0.08)', fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#ffffff', pointBorderColor: '#0b0e14', pointBorderWidth: 2, pointHoverRadius: 6 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: 'rgba(11,14,20,0.95)', titleColor: '#888891', bodyColor: '#ffffff', borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1, padding: 12, callbacks: { label: function (ctx) { return '  \u20ac ' + ctx.raw.toLocaleString('nl-NL', { minimumFractionDigits: 2 }); } } }
                },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888891', callback: function (v) { return '\u20ac ' + v.toLocaleString('nl-NL'); } } },
                    x: { grid: { display: false }, ticks: { color: '#888891', maxTicksLimit: 8 } }
                }
            }
        });
    }
});