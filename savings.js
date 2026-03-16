document.addEventListener('DOMContentLoaded', () => {
    // Elementen ophalen
    const container = document.getElementById('accounts-container');
    const totalDisplay = document.getElementById('total-savings-amount');
    const addBtn = document.getElementById('add-account-btn');
    const modalInput = document.getElementById('new-account-name');
    const modalOverlay = document.getElementById('modal-overlay');
    const deleteModal = document.getElementById('delete-modal-overlay');

    let accounts = JSON.parse(localStorage.getItem('savingsAccounts')) || [];

    // --- 1. UI UPDATE FUNCTIE ---
    function updateUI() {
        if (!container) return;
        container.innerHTML = '';
        let total = 0;

        accounts.forEach((acc, index) => {
            const balance = parseFloat(acc.balance) || 0;
            total += balance;
            const formattedBalance = balance.toLocaleString('nl-NL', { minimumFractionDigits: 2 });

            const div = document.createElement('div');
            div.className = 'account-item';
            div.innerHTML = `
                <span>${acc.name}</span>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="currency-wrapper">
                        <span>€</span>
                        <input type="text" class="account-balance-input" value="${formattedBalance}" 
                            onfocus="if(this.value === '0' || this.value === '0,00') this.value = '';" 
                            onblur="window.updateSavingsBalance(${index}, this.value)">
                    </div>
                    <button onclick="window.openDeleteModal(${index})" class="delete-btn">✕</button>
                </div>`;
            container.appendChild(div);
        });

        if (totalDisplay) totalDisplay.innerText = `€ ${total.toLocaleString('nl-NL', {minimumFractionDigits: 2})}`;
        localStorage.setItem('savingsAccounts', JSON.stringify(accounts));
        
        // Grafiek updaten
        if (window.savingsChart) {
            const currentMonth = new Date().getMonth(); 
            window.savingsChart.data.datasets[0].data[currentMonth] = total;
            window.savingsChart.update();
        }
    }

    // --- 2. CHART INITIALISATIE ---
    const chartElem = document.getElementById('yearlySavingsChart');
    if (chartElem) {
        try {
            window.savingsChart = new Chart(chartElem.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'],
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
        } catch (error) {
            console.error("Chart kon niet laden:", error);
        }
    }

    // --- 3. EVENT LISTENERS (Plusje & Knoppen) ---
    if (addBtn) {
        addBtn.onclick = () => {
            modalOverlay.style.display = 'flex';
            modalInput.focus();
        };
    }

    // Sluit modals als je op cancel klikt
    document.querySelectorAll('.btn-secondary, #cancel-delete, #cancel-modal').forEach(btn => {
        btn.onclick = () => {
            modalOverlay.style.display = 'none';
            deleteModal.style.display = 'none';
        };
    });

    // Bevestig toevoegen
    document.getElementById('confirm-modal').onclick = () => {
        const name = modalInput.value.trim();
        if (name) {
            accounts.push({ name: name, balance: 0 });
            updateUI();
            modalOverlay.style.display = 'none';
            modalInput.value = '';
        }
    };

    // Bevestig verwijderen
    document.getElementById('confirm-delete').onclick = () => {
        if (window.indexToDelete !== undefined) {
            accounts.splice(window.indexToDelete, 1);
            updateUI();
            deleteModal.style.display = 'none';
        }
    };

    // Globale functies (voor onclick in HTML)
    window.updateSavingsBalance = (index, val) => {
        let cleanVal = val.replace(',', '.');
        accounts[index].balance = parseFloat(cleanVal) || 0;
        updateUI(); 
    };

    window.openDeleteModal = (index) => {
        window.indexToDelete = index;
        deleteModal.style.display = 'flex';
    };

    // Start de boel
    updateUI();
});