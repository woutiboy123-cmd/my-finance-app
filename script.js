document.addEventListener('DOMContentLoaded', () => {
    const savingsDisplay     = document.getElementById('dashboard-savings-amount');
    const investmentDisplay  = document.getElementById('dashboard-investment-amount');
    const totalBalanceDisplay = document.getElementById('total-combined-balance');
    const portfolioCanvas    = document.getElementById('portfolioSpreadChart');
    const netWorthCanvas     = document.getElementById('netWorthChart');
    const transList          = document.getElementById('transactions-list');

    const savingsData    = JSON.parse(localStorage.getItem('savingsAccounts'))    || [];
    const investmentData = JSON.parse(localStorage.getItem('investmentAccounts')) || [];
    const transactions   = JSON.parse(localStorage.getItem('transactions'))       || [];

    const totalSavings     = savingsData.reduce((sum, acc)    => sum + (parseFloat(acc.balance) || 0), 0);
    const totalInvestments = investmentData.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
    const combinedTotal    = totalSavings + totalInvestments;

    const formatCurrency = (amount) =>
        `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (savingsDisplay)      savingsDisplay.innerText     = formatCurrency(totalSavings);
    if (investmentDisplay)   investmentDisplay.innerText  = formatCurrency(totalInvestments);
    if (totalBalanceDisplay) totalBalanceDisplay.innerText = formatCurrency(combinedTotal);

    // ─── Recent Transactions ───────────────────

    if (transList) {
        if (transactions.length === 0) {
            transList.innerHTML = '<p class="empty-state">No recent transactions found.</p>';
        } else {
            const recent = transactions.slice().reverse().slice(0, 10);

            recent.forEach((t, index) => {
                const amount = parseFloat(t.amount) || 0;
                const isNeg  = amount < 0;

                const div = document.createElement('div');
                div.className = 'account-item';
                div.innerHTML = `
                    <span class="category-display">${t.category}</span>
                    <span class="date-display">${t.date}</span>
                    <span class="trans-right-side ${isNeg ? 'amount-negative' : 'amount-positive'}">
                        ${isNeg ? '-' : '+'} € ${Math.abs(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                    </span>
                `;
                transList.appendChild(div);

                if (index < recent.length - 1) {
                    const hr = document.createElement('div');
                    hr.className = 'subtle-divider';
                    transList.appendChild(hr);
                }
            });
        }
    }

    // ─── Portfolio Spread Chart ────────────────

    if (portfolioCanvas) {
        const allAccounts  = [...savingsData, ...investmentData];
        const colorPalette = ['#4facfe','#4ade80','#facc15','#f87171','#a78bfa','#fb923c','#2dd4bf','#e879f9','#94a3b8','#fb7185'];

        new Chart(portfolioCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: allAccounts.map(acc => acc.name),
                datasets: [{
                    data: allAccounts.map(acc => parseFloat(acc.balance) || 0),
                    backgroundColor: colorPalette.slice(0, allAccounts.length),
                    borderColor: '#1a1d23',
                    borderWidth: 2,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#888', padding: 15, font: { size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                const val   = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct   = Math.round((val / total) * 100);
                                return ` ${context.label}: €${val.toLocaleString('nl-NL')} (${pct}%)`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }

    // ─── Net Worth Growth Chart ────────────────

    if (netWorthCanvas) {
        const history = new Array(12).fill(0);
        history[new Date().getMonth()] = combinedTotal;

        new Chart(netWorthCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                datasets: [{
                    data: history,
                    borderColor: '#ffffff',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
