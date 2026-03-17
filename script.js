document.addEventListener('DOMContentLoaded', async function () {
    var savingsDisplay      = document.getElementById('dashboard-savings-amount');
    var investmentDisplay   = document.getElementById('dashboard-investment-amount');
    var totalBalanceDisplay = document.getElementById('total-combined-balance');
    var portfolioCanvas     = document.getElementById('portfolioSpreadChart');
    var netWorthCanvas      = document.getElementById('netWorthChart');
    var transList           = document.getElementById('transactions-list');

    var sb   = getSupabase();
    var user = await requireAuth();
    if (!user) return;

    var CACHE_KEY = 'cache_dashboard_' + user.id;

    function saveCache(data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch(e) {}
    }

    function loadCacheDash() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch(e) { return null; }
    }

    var fmt = function (n) {
        return '\u20ac ' + (parseFloat(n) || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    function fmtDate(iso) {
        if (!iso) return '';
        var p = iso.split('-');
        return p[2] + '-' + p[1] + '-' + p[0];
    }

    function getLatestBalance(acc) {
        if (!acc.history || acc.history.length === 0) return 0;
        var sorted = acc.history.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
        return parseFloat(sorted[sorted.length - 1].balance) || 0;
    }

    // Show cached data instantly
    var dashCache = loadCacheDash();
    if (dashCache) {
        if (savingsDisplay)      savingsDisplay.innerText      = fmt(dashCache.totalSavings || 0);
        if (investmentDisplay)   investmentDisplay.innerText   = fmt(dashCache.totalInvestments || 0);
        if (totalBalanceDisplay) totalBalanceDisplay.innerText = fmt(dashCache.combinedTotal || 0);
    }

    // ─── Laad alle data parallel ──────────────────────────

    var results = await Promise.all([
        sb.from('savings_accounts').select('id, name').order('created_at'),
        sb.from('savings_entries').select('account_id, date, balance').order('date'),
        sb.from('investment_accounts').select('id, name').order('created_at'),
        sb.from('investment_entries').select('account_id, date, balance').order('date'),
        sb.from('transactions').select('id, category, amount, date, note').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(10)
    ]);

    var savAccs  = results[0].data || [];
    var savEnts  = results[1].data || [];
    var invAccs  = results[2].data || [];
    var invEnts  = results[3].data || [];
    var txns     = results[4].data || [];

    // Bouw account-objecten met history
    var savingsData = savAccs.map(function (acc) {
        return {
            id: acc.id, name: acc.name,
            history: savEnts.filter(function (e) { return e.account_id === acc.id; })
                            .map(function (e) { return { date: e.date, balance: parseFloat(e.balance) }; })
        };
    });

    var investmentData = invAccs.map(function (acc) {
        return {
            id: acc.id, name: acc.name,
            history: invEnts.filter(function (e) { return e.account_id === acc.id; })
                            .map(function (e) { return { date: e.date, balance: parseFloat(e.balance) }; })
        };
    });

    // ─── Totalen ──────────────────────────────────────────

    var totalSavings     = savingsData.reduce(function (s, a) { return s + getLatestBalance(a); }, 0);
    var totalInvestments = investmentData.reduce(function (s, a) { return s + getLatestBalance(a); }, 0);
    var combinedTotal    = totalSavings + totalInvestments;

    if (savingsDisplay)      savingsDisplay.innerText      = fmt(totalSavings);
    if (investmentDisplay)   investmentDisplay.innerText   = fmt(totalInvestments);
    if (totalBalanceDisplay) totalBalanceDisplay.innerText = fmt(combinedTotal);
    saveCache({ totalSavings: totalSavings, totalInvestments: totalInvestments, combinedTotal: combinedTotal });

    // ─── Recente transacties ──────────────────────────────

    if (transList) {
        if (txns.length === 0) {
            transList.innerHTML = '<p class="empty-state">Nog geen transacties.</p>';
        } else {
            txns.forEach(function (t, index) {
                var amount = parseFloat(t.amount) || 0;
                var isNeg  = amount < 0;
                var div    = document.createElement('div');
                div.className = 'account-item';
                div.innerHTML =
                    '<span class="category-display">' + t.category + '</span>' +
                    '<span class="date-display">' + fmtDate(t.date) + '</span>' +
                    '<span class="trans-right-side ' + (isNeg ? 'amount-negative' : 'amount-positive') + '">' +
                        (isNeg ? '-' : '+') + ' \u20ac ' +
                        Math.abs(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 }) +
                    '</span>';
                transList.appendChild(div);
                if (index < txns.length - 1) {
                    var hr = document.createElement('div');
                    hr.className = 'subtle-divider';
                    transList.appendChild(hr);
                }
            });
        }
    }

    // ─── Portfolio Spread (Doughnut) ──────────────────────

    if (portfolioCanvas) {
        var allAccounts  = savingsData.concat(investmentData);
        var labels       = allAccounts.map(function (a) { return a.name; });
        var dataValues   = allAccounts.map(function (a) { return getLatestBalance(a); });
        var colorPalette = ['#4facfe','#4ade80','#facc15','#f87171','#a78bfa','#fb923c','#2dd4bf','#e879f9','#94a3b8','#fb7185'];

        new Chart(portfolioCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ data: dataValues, backgroundColor: colorPalette.slice(0, allAccounts.length), borderColor: '#1a1d23', borderWidth: 2, hoverOffset: 15 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                layout: { padding: { right: 10 } },
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#c0c0c8', padding: 20, font: { size: 13 }, usePointStyle: true, pointStyle: 'circle',
                            generateLabels: function (chart) {
                                var data  = chart.data;
                                var total = data.datasets[0].data.reduce(function (a, b) { return a + b; }, 0);
                                return data.labels.map(function (label, i) {
                                    var value = data.datasets[0].data[i] || 0;
                                    var pct   = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return { text: label + '  ' + pct + '%', fillStyle: colorPalette[i], strokeStyle: colorPalette[i], fontColor: '#c0c0c8', pointStyle: 'circle', hidden: false, index: i };
                                });
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                var val   = ctx.raw || 0;
                                var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                                var pct   = total > 0 ? Math.round((val / total) * 100) : 0;
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
        var allDateMap = {};
        savingsData.concat(investmentData).forEach(function (acc) {
            (acc.history || []).forEach(function (e) { allDateMap[e.date] = true; });
        });

        if (Object.keys(allDateMap).length === 0) {
            allDateMap[new Date().toISOString().split('T')[0]] = true;
        }

        var sortedDates = Object.keys(allDateMap).sort();

        var netWorthPoints = sortedDates.map(function (date) {
            var sum = 0;
            savingsData.concat(investmentData).forEach(function (acc) {
                var hist = (acc.history || []).slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
                var last = 0;
                hist.forEach(function (e) { if (e.date <= date) last = parseFloat(e.balance) || 0; });
                sum += last;
            });
            return sum;
        });

        var netLabels = sortedDates.map(fmtDate);

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