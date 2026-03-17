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

    const totalSavings     = savingsData.reduce((sum, acc)    => sum + (parseFloat(acc.balance) || 0), 0);
    const totalInvestments = investmentData.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
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
            const recent = transactions.slice().reverse().slice(0, 10);
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
        const dataValues   = allAccounts.map(function(acc) { return parseFloat(acc.balance) || 0; });
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
        var history = new Array(12).fill(0);
        history[new Date().getMonth()] = combinedTotal;

        new Chart(netWorthCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                datasets: [{
                    data: history,
                    borderColor: '#ffffff',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
                    x: { grid: { display: false },                  ticks: { color: '#888' } }
                }
            }
        });
    }
});