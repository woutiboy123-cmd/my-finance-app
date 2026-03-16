document.addEventListener('DOMContentLoaded', () => {
    // 1. Elementen ophalen
    const savingsDisplay = document.getElementById('dashboard-savings-amount');
    const investmentDisplay = document.getElementById('dashboard-investment-amount');
    const totalBalanceDisplay = document.getElementById('total-combined-balance');
    const portfolioCanvas = document.getElementById('portfolioSpreadChart');
    const netWorthCanvas = document.getElementById('netWorthChart');
    const transList = document.getElementById('transactions-list'); // Nieuw voor transacties

    // 2. Data ophalen uit LocalStorage
    const savingsData = JSON.parse(localStorage.getItem('savingsAccounts')) || [];
    const investmentData = JSON.parse(localStorage.getItem('investmentAccounts')) || [];
    const transactions = JSON.parse(localStorage.getItem('transactions')) || []; // Nieuw

    // 3. Bereken de totalen
    const totalSavings = savingsData.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
    const totalInvestments = investmentData.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
    const combinedTotal = totalSavings + totalInvestments;

    // Formatterings-hulpje
    const formatCurrency = (amount) => {
        return `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Update tekstbedragen bovenin
    if (savingsDisplay) savingsDisplay.innerText = formatCurrency(totalSavings);
    if (investmentDisplay) investmentDisplay.innerText = formatCurrency(totalInvestments);
    if (totalBalanceDisplay) totalBalanceDisplay.innerText = formatCurrency(combinedTotal);

    // --- RECENTE TRANSACTIES LOGICA (NIEUW) ---
    function updateRecentTransactions() {
        if (!transList) return;
        
        // Als er geen transacties zijn
        if (transactions.length === 0) {
            transList.innerHTML = '<p style="color: #777; text-align: center; padding: 20px;">Geen recente transacties gevonden.</p>';
            return;
        }

        transList.innerHTML = '';

        // Pak de laatste 10 transacties (omkeren en slicen)
        const recentTrans = transactions.slice().reverse().slice(0, 10);

        recentTrans.forEach((t, index) => {
            const amount = parseFloat(t.amount) || 0;
            const isNeg = amount < 0;
            
            const div = document.createElement('div');
            div.className = 'account-item';

            // Exact dezelfde grid-stijl als op de transactiepagina
            div.innerHTML = `
                <span class="category-display">${t.category}</span>
                <span class="date-display">${t.date}</span>
                <span class="trans-right-side ${isNeg ? 'amount-negative' : 'amount-positive'}">
                    ${isNeg ? '-' : '+'} € ${Math.abs(amount).toLocaleString('nl-NL', {minimumFractionDigits:2})}
                </span>
            `;
            
            transList.appendChild(div);

            // Voeg het lijntje toe tussen de items
            if (index < recentTrans.length - 1) {
                const hr = document.createElement('div');
                hr.className = 'subtle-divider';
                transList.appendChild(hr);
            }
        });
    }

    // Voer de transactie update uit
    updateRecentTransactions();

    // --- PORTFOLIO SPREAD (Bestaande Taartdiagram) ---
    if (portfolioCanvas) {
        const allAccounts = [...savingsData, ...investmentData];
        const labels = allAccounts.map(acc => acc.name);
        const dataValues = allAccounts.map(acc => parseFloat(acc.balance) || 0);

        const colorPalette = ['#4facfe', '#4ade80', '#facc15', '#f87171', '#a78bfa', '#fb923c', '#2dd4bf', '#e879f9', '#94a3b8', '#fb7185'];

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
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#888', padding: 15, font: { size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let val = context.raw || 0;
                                let total = context.dataset.data.reduce((a, b) => a + b, 0);
                                let percentage = Math.round((val / total) * 100);
                                return ` ${context.label}: €${val.toLocaleString('nl-NL')} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }

    // --- NET WORTH GROWTH (Bestaande Lijndiagram) ---
    if (netWorthCanvas) {
        const currentMonth = new Date().getMonth();
        const history = new Array(12).fill(0);
        history[currentMonth] = combinedTotal;

        new Chart(netWorthCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'],
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
                    y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#888' } },
                    x: { grid: { display: false }, ticks: { color: '#888' } }
                }
            }
        });
    }
});