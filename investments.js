document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('accounts-container');
    const totalDisplay = document.getElementById('total-investment-amount');
    const addBtn = document.getElementById('add-account-btn');
    const modalInput = document.getElementById('new-account-name');

    let accounts = JSON.parse(localStorage.getItem('investmentAccounts')) || [];

    function updateUI() {
        if (!container) return;
        container.innerHTML = '';
        let total = 0;

        accounts.forEach((acc, index) => {
            const balance = parseFloat(acc.balance) || 0;
            total += balance;
            
            const formattedBalance = balance.toLocaleString('nl-NL', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

            const div = document.createElement('div');
            div.className = 'account-item';
            div.innerHTML = `
                <span>${acc.name}</span>
                <div style="display: flex; align-items: center; gap: 10px;">
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

        if (totalDisplay) {
            totalDisplay.innerText = `€ ${total.toLocaleString('nl-NL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
        
        localStorage.setItem('investmentAccounts', JSON.stringify(accounts));
        
        if (window.investChart) {
            const currentMonth = new Date().getMonth(); 
            window.investChart.data.datasets[0].data[currentMonth] = total;
            window.investChart.update();
        }
    }

    // --- CHART INITIALISATIE ---
    const chartElem = document.getElementById('yearlyInvestmentChart');
    if (chartElem) {
        window.investChart = new Chart(chartElem.getContext('2d'), {
            type: 'line', // Veranderd van 'bar' naar 'line'
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'],
                datasets: [{ 
                    label: 'Investments',
                    data: new Array(12).fill(0), 
                    borderColor: '#4ade80', // Groene kleur voor investments
                    backgroundColor: 'rgba(74, 222, 128, 0.1)', 
                    fill: true,
                    tension: 0.4, // Vloeiende lijn
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
                    y: { 
                        grid: { color: 'rgba(255,255,255,0.05)' }, 
                        ticks: { color: '#888' } 
                    },
                    x: { 
                        grid: { display: false }, 
                        ticks: { color: '#888' } 
                    }
                }
            }
        });
        updateUI();
    }

    // --- GLOBALE FUNCTIES & HANDLERS ---
    window.updateInvestmentBalance = (index, val) => {
        let cleanVal = val.replace(',', '.');
        accounts[index].balance = parseFloat(cleanVal) || 0;
        updateUI(); 
    };

    window.openDeleteModal = (index) => {
        window.indexToDelete = index;
        const deleteModal = document.getElementById('delete-modal-overlay');
        const deleteText = document.getElementById('delete-modal-text');
        if (deleteText) deleteText.innerText = `Weet je zeker dat je "${accounts[index].name}" wilt verwijderen?`;
        if (deleteModal) deleteModal.style.display = 'flex';
    };

    document.getElementById('confirm-modal').onclick = () => {
        const name = modalInput.value.trim();
        if (name) {
            accounts.push({ name: name, balance: 0 });
            updateUI();
            document.getElementById('modal-overlay').style.display = 'none';
            modalInput.value = '';
        }
    };

    document.getElementById('confirm-delete').onclick = () => {
        if (window.indexToDelete !== undefined) {
            accounts.splice(window.indexToDelete, 1);
            updateUI();
            document.getElementById('delete-modal-overlay').style.display = 'none';
        }
    };

    if (addBtn) addBtn.onclick = () => {
        document.getElementById('modal-overlay').style.display = 'flex';
        modalInput.focus();
    };

    document.querySelectorAll('.btn-secondary').forEach(btn => {
        btn.onclick = () => {
            document.getElementById('modal-overlay').style.display = 'none';
            document.getElementById('delete-modal-overlay').style.display = 'none';
        };
    });
});