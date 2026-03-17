document.addEventListener('DOMContentLoaded', () => {
    const savingsDisplay      = document.getElementById('dashboard-savings-amount');
    const investmentDisplay   = document.getElementById('dashboard-investment-amount');
    const totalBalanceDisplay = document.getElementById('total-combined-balance');
    const portfolioCanvas     = document.getElementById('portfolioSpreadChart');
    const netWorthCanvas      = document.getElementById('netWorthChart');
    const transList           = document.getElementById('transactions-list');

    const savingsData    = JSON.parse(localStorage.getItem('savingsAccounts'))    || [];
    const investmentData = JSON.parse(localStorage.getItem('investmentAccounts')) || [];
    const transactions   = JSON.parse(localStorage.getItem('transactions'))       || [];

    // Read latest balance from history format (or fall back to old balance field)
    function getLatestBalance(acc) {
        if (acc.history && acc.history.length > 0) {
            var sorted = acc.history.slice().sort(function(a,b){ return a.date.localeCompare(b.date); });
            return parseFloat(sorted[sorted.length - 1].balance) || 0;
        }
        return parseFloat(acc.balance) || 0;
    }

    const totalSavings     = savingsData.reduce((sum, acc)    => sum + getLatestBalance(acc), 0);
    const totalInvestments = investmentData.reduce((sum, acc) => sum + getLatestBalance(acc), 0);
    const combinedTotal    = totalSavings + totalInvestments;

    const fmt = (n) => '€ ' + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (savingsDisplay)      savingsDisplay.innerText      = fmt(totalSavings);
    if (investmentDisplay)   investmentDisplay.innerText   = fmt(totalInvestments);
    if (totalBalanceDisplay) totalBalanceDisplay.innerText = fmt(combinedTotal);

    // ─── Recent Transactions ───────────────────

    if (transList) {
        if (transactions.length === 0) {
            transList.innerHTML = '<p class="empty-state">No recent transactions found.</p>';
        } else {
            function parseDateStr(str) {
                if (!str) return '';
                var p = str.split('-');
                if (p.length !== 3) return str;
                if (p[0].length === 4) return str;
                return p[2] + '-' + p[1] + '-' + p[0];
            }

            const recent = transactions
                .slice()
                .sort(function(a, b) { return parseDateStr(b.date).localeCompare(parseDateStr(a.date)); })
                .slice(0, 10);
            recent.forEach((t, index) => {
                const amount = parseFloat(t.amount) || 0;
                const isNeg  = amount < 0;
                const div    = document.createElement('div');
                div.className = 'account-item';
                div.innerHTML =
                    '<span class="category-display">' + t.category + '</span>' +
                    '<span class="date-display">' + t.date + '</span>' +
                    '<span class="trans-right-side ' + (isNeg ? 'amount-negative' : 'amount-positive') + '">' +
                        (isNeg ? '-' : '+') + ' \u20ac ' +
                        Math.abs(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 }) +
                    '</span>';
                transList.appendChild(div);
                if (index < recent.length - 1) {
                    var hr = document.createElement('div');
                    hr.className = 'subtle-divider';
                    transList.appendChild(hr);
                }
            });
        }
    }

    // ─── Portfolio Spread (Doughnut) ───────────

    if (portfolioCanvas) {
        const allAccounts  = savingsData.concat(investmentData);
        const labels       = allAccounts.map(function(acc) { return acc.name; });
        const dataValues   = allAccounts.map(function(acc) { return getLatestBalance(acc); });
        const colorPalette = ['#4facfe','#4ade80','#facc15','#f87171','#a78bfa','#fb923c','#2dd4bf','#e879f9','#94a3b8','#fb7185'];

        new Chart(portfolioCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: colorPalette.slice(0, allAccounts.length),
                    borderColor: '#1a1d23',
                    borderWidth: 2,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { right: 10 } },
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#c0c0c8',
                            padding: 20,
                            font: { size: 13 },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            generateLabels: function(chart) {
                                var data  = chart.data;
                                var total = data.datasets[0].data.reduce(function(a, b) { return a + b; }, 0);
                                return data.labels.map(function(label, i) {
                                    var value = data.datasets[0].data[i] || 0;
                                    var pct   = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return {
                                        text:        label + '  ' + pct + '%',
                                        fillStyle:   colorPalette[i],
                                        strokeStyle: colorPalette[i],
                                        fontColor:   '#c0c0c8',
                                        pointStyle:  'circle',
                                        hidden:      false,
                                        index:       i
                                    };
                                });
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                var val   = context.raw || 0;
                                var total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                                var pct   = total > 0 ? Math.round((val / total) * 100) : 0;
                                return ' ' + context.label + ': \u20ac' + val.toLocaleString('nl-NL') + ' (' + pct + '%)';
                            }
                        }
                    }
                },
                cutout: '62%'
            }
        });
    }

    // ─── Net Worth Growth (Line) ───────────────

    if (netWorthCanvas) {
        // Collect all unique dates from savings + investments history
        var allDateMap = {};
        savingsData.concat(investmentData).forEach(function(acc) {
            (acc.history || []).forEach(function(e) { allDateMap[e.date] = true; });
        });

        if (Object.keys(allDateMap).length === 0) {
            allDateMap[new Date().toISOString().split('T')[0]] = true;
        }

        var sortedDates = Object.keys(allDateMap).sort();

        var netWorthPoints = sortedDates.map(function(date) {
            var sum = 0;
            savingsData.concat(investmentData).forEach(function(acc) {
                var hist = (acc.history || []).slice().sort(function(a,b){ return a.date.localeCompare(b.date); });
                var last = parseFloat(acc.balance) || 0;
                hist.forEach(function(e) { if (e.date <= date) last = parseFloat(e.balance) || 0; });
                sum += last;
            });
            return sum;
        });

        var netLabels = sortedDates.map(function(d) {
            var p = d.split('-'); return p[2] + '-' + p[1] + '-' + p[0];
        });

        new Chart(netWorthCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: netLabels,
                datasets: [{
                    data: netWorthPoints,
                    borderColor: '#ffffff',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    fill: true, tension: 0.4, borderWidth: 2.5,
                    pointRadius: 4, pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#0b0e14', pointBorderWidth: 2, pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(11,14,20,0.95)',
                        titleColor: '#888891', bodyColor: '#ffffff',
                        borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1, padding: 12,
                        callbacks: { label: function(ctx) { return '  \u20ac ' + ctx.raw.toLocaleString('nl-NL', { minimumFractionDigits: 2 }); } }
                    }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#888891', callback: function(v) { return '\u20ac ' + v.toLocaleString('nl-NL'); } }
                    },
                    x: { grid: { display: false }, ticks: { color: '#888891', maxTicksLimit: 8 } }
                }
            }
        });
    }
});