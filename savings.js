document.addEventListener('DOMContentLoaded', () => {
    const container    = document.getElementById('accounts-container');
    const totalDisplay = document.getElementById('total-savings-amount');
    const addBtn       = document.getElementById('add-account-btn');
    const modalInput   = document.getElementById('new-account-name');
    const modalOverlay = document.getElementById('modal-overlay');
    const deleteModal  = document.getElementById('delete-modal-overlay');

    let accounts = JSON.parse(localStorage.getItem('savingsAccounts')) || [];

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
                            onfocus="if(this.value === '0' || this.value === '0,00') this.value = '';"
                            onblur="window.updateSavingsBalance(${index}, this.value)">
                    </div>
                    <button onclick="window.openDeleteModal(${index})" class="delete-btn">✕</button>
                </div>
            `;
            container.appendChild(div);
        });

        totalDisplay.innerText = `€ ${total.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
        localStorage.setItem('savingsAccounts', JSON.stringify(accounts));

        if (window.savingsChart) {
            window.savingsChart.data.datasets[0].data[new Date().getMonth()] = total;
            window.savingsChart.update();
        }
    }

    // ─── Chart ─────────────────────────────────

    const chartElem = document.getElementById('yearlySavingsChart');
    if (chartElem) {
        window.savingsChart = new Chart(chartElem.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                datasets: [{
                    label: 'Savings',
                    data: new Array(12).fill(0),
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79, 172, 254, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    // ─── Events ────────────────────────────────

    addBtn.onclick = () => {
        modalOverlay.style.display = 'flex';
        modalInput.focus();
    };

    document.getElementById('confirm-modal').onclick = () => {
        const name = modalInput.value.trim();
        if (!name) return;
        accounts.push({ name, balance: 0 });
        updateUI();
        modalOverlay.style.display = 'none';
        modalInput.value = '';
    };

    document.getElementById('confirm-delete').onclick = () => {
        if (window.indexToDelete === undefined) return;
        accounts.splice(window.indexToDelete, 1);
        updateUI();
        deleteModal.style.display = 'none';
    };

    document.querySelectorAll('#cancel-modal, #cancel-delete').forEach(btn => {
        btn.onclick = () => {
            modalOverlay.style.display = 'none';
            deleteModal.style.display  = 'none';
        };
    });

    // ─── Global Functions ──────────────────────

    window.updateSavingsBalance = (index, val) => {
        accounts[index].balance = parseFloat(val.replace(',', '.')) || 0;
        updateUI();
    };

    window.openDeleteModal = (index) => {
        window.indexToDelete = index;
        deleteModal.style.display = 'flex';
    };

    updateUI();
});
