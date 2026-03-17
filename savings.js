document.addEventListener('DOMContentLoaded', function() {
    var container    = document.getElementById('accounts-container');
    var totalDisplay = document.getElementById('total-savings-amount');
    var addBtn       = document.getElementById('add-account-btn');
    var modalInput   = document.getElementById('new-account-name');
    var modalOverlay = document.getElementById('modal-overlay');
    var deleteModal  = document.getElementById('delete-modal-overlay');

    var accounts = JSON.parse(localStorage.getItem('savingsAccounts')) || [];

    function updateUI() {
        container.innerHTML = '';
        var total = 0;

        accounts.forEach(function(acc, index) {
            var balance          = parseFloat(acc.balance) || 0;
            var formattedBalance = balance.toLocaleString('nl-NL', { minimumFractionDigits: 2 });
            total += balance;

            var div = document.createElement('div');
            div.className = 'account-item';
            div.innerHTML =
                '<span>' + acc.name + '</span>' +
                '<div class="account-item-controls">' +
                    '<div class="currency-wrapper">' +
                        '<span>\u20ac</span>' +
                        '<input type="text" class="account-balance-input" value="' + formattedBalance + '"' +
                            ' onfocus="if(this.value===\'0\'||this.value===\'0,00\')this.value=\'\';"' +
                            ' onblur="window.updateSavingsBalance(' + index + ',this.value)">' +
                    '</div>' +
                    '<button onclick="window.openDeleteModal(' + index + ')" class="delete-btn">\u2715</button>' +
                '</div>';
            container.appendChild(div);
        });

        totalDisplay.innerText = '\u20ac ' + total.toLocaleString('nl-NL', { minimumFractionDigits: 2 });
        localStorage.setItem('savingsAccounts', JSON.stringify(accounts));

        if (window.savingsChart) {
            window.savingsChart.data.datasets[0].data[new Date().getMonth()] = total;
            window.savingsChart.update();
        }
    }

    // ─── Chart ─────────────────────────────────

    var chartElem = document.getElementById('yearlySavingsChart');
    if (chartElem) {
        window.savingsChart = new Chart(chartElem.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                datasets: [{
                    label: 'Savings',
                    data: new Array(12).fill(0),
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79,172,254,0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3
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

    // ─── Events ────────────────────────────────

    addBtn.onclick = function() {
        modalOverlay.style.display = 'flex';
        modalInput.focus();
    };

    document.getElementById('confirm-modal').onclick = function() {
        var name = modalInput.value.trim();
        if (!name) return;
        accounts.push({ name: name, balance: 0 });
        updateUI();
        modalOverlay.style.display = 'none';
        modalInput.value = '';
    };

    document.getElementById('confirm-delete').onclick = function() {
        if (window.indexToDelete === undefined) return;
        accounts.splice(window.indexToDelete, 1);
        updateUI();
        deleteModal.style.display = 'none';
    };

    document.getElementById('cancel-modal').onclick = function() { modalOverlay.style.display = 'none'; };
    document.getElementById('cancel-delete').onclick = function() { deleteModal.style.display  = 'none'; };

    // ─── Global ────────────────────────────────

    window.updateSavingsBalance = function(index, val) {
        accounts[index].balance = parseFloat(val.replace(',', '.')) || 0;
        updateUI();
    };

    window.openDeleteModal = function(index) {
        window.indexToDelete = index;
        deleteModal.style.display = 'flex';
    };

    updateUI();
});