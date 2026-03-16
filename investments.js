document.addEventListener('DOMContentLoaded', () => {
    const container    = document.getElementById('accounts-container');
    const totalDisplay = document.getElementById('total-investment-amount');
    const addBtn       = document.getElementById('add-account-btn');
    const modalInput   = document.getElementById('new-account-name');

    let accounts = JSON.parse(localStorage.getItem('investmentAccounts')) || [];

    // ─── Render ────────────────────────────────

    function updateUI() {
        container.innerHTML = '';
        let total = 0;

        accounts.forEach((acc, index) => {
            const balance          = parseFloat(acc.balance) || 0;
            const formattedBalance = balance.toLocaleString('nl-NL', { minimumFractionDigits: 2 });
            total += balance;

            const div = document.createElement('div');
            div.className = 'account-item';
            div.innerHTML = `
                <span>${acc.name}</span>
                <div class="account-item-controls">
                    <div class="currency-wrapper">
                        <span>€</span>
                        <input type="text" class="account-balance-input" value="${formattedBalance}"
                            onfocus="if(this.value === '0' || this.value === '0,00') { this.value = ''; } else { this.value = '${balance}'; }"
                            onblur="window.updateInvestmentBalance(${index}, this.value)">
                    </div>
                    <button onclick="window.openDeleteModal(${index})" class="delete-btn">✕</button>
                </div>
            `;
            container.appendChild(div);
        });

        totalDisplay.innerText = `€ ${total.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
        localStorage.setItem('investmentAccounts', JSON.stringify(accounts));

        if (window.investChart) {
            window.investChart.data.datasets[0].data[new Date().getMonth()] = total;
            window.investChart.update();
        }
    }

    // ─── Chart ─────────────────────────────────

    const chartElem = document.getElementById('yearlyInvestmentChart');
    if (chartElem) {
        window.investChart = new Chart(chartElem.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                datasets: [{
                    label: 'Investments',
                    data: new Array(12).fill(0),
                    borderColor: '#4ade80',
                    backgroundColor: 'rgba(74, 222, 128, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: '#4ade80'
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

        updateUI();
    }

    // ─── Events ────────────────────────────────

    addBtn.onclick = () => {
        document.getElementById('modal-overlay').style.display = 'flex';
        modalInput.focus();
    };

    document.getElementById('confirm-modal').onclick = () => {
        const name = modalInput.value.trim();
        if (!name) return;
        accounts.push({ name, balance: 0 });
        updateUI();
        document.getElementById('modal-overlay').style.display = 'none';
        modalInput.value = '';
    };

    document.getElementById('confirm-delete').onclick = () => {
        if (window.indexToDelete === undefined) return;
        accounts.splice(window.indexToDelete, 1);
        updateUI();
        document.getElementById('delete-modal-overlay').style.display = 'none';
    };

    document.querySelectorAll('.btn-secondary').forEach(btn => {
        btn.onclick = () => {
            document.getElementById('modal-overlay').style.display        = 'none';
            document.getElementById('delete-modal-overlay').style.display = 'none';
        };
    });

    // ─── Global Functions ──────────────────────

    window.updateInvestmentBalance = (index, val) => {
        accounts[index].balance = parseFloat(val.replace(',', '.')) || 0;
        updateUI();
    };

    window.openDeleteModal = (index) => {
        window.indexToDelete = index;
        const deleteText = document.getElementById('delete-modal-text');
        if (deleteText) deleteText.innerText = `Are you sure you want to delete "${accounts[index].name}"?`;
        document.getElementById('delete-modal-overlay').style.display = 'flex';
    };
});
