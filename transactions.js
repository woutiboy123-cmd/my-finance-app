document.addEventListener('DOMContentLoaded', () => {
    const mainAddBtn  = document.getElementById('main-add-btn');
    const modalOverlay = document.getElementById('add-modal-overlay');
    const cancelBtn   = document.getElementById('cancel-add-modal');
    const confirmBtn  = document.getElementById('confirm-add-trans');
    const transList   = document.getElementById('transactions-list');
    const dateInput   = document.getElementById('trans-date');
    const noteInput   = document.getElementById('trans-note');
    const amountInput = document.getElementById('trans-amount');
    const categoryInput = document.getElementById('trans-category');

    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

    const today = new Date().toISOString().split('T')[0];
    dateInput.max   = today;
    dateInput.value = today;

    // ─── Render ────────────────────────────────

    function updateUI() {
        transList.innerHTML = '';

        const reversed = transactions.map((t, i) => ({ ...t, originalIndex: i })).reverse();

        reversed.forEach((t, index) => {
            const amount = parseFloat(t.amount) || 0;
            const isNeg  = amount < 0;

            const div = document.createElement('div');
            div.className = 'account-item';
            div.innerHTML = `
                <span class="category-display">${t.category}</span>
                <span class="date-display">${t.date}</span>
                <div class="note-amount-wrapper">
                    <span class="note-display">${t.note || ''}</span>
                    <div class="trans-right-side-wrapper">
                        <span class="trans-right-side ${isNeg ? 'amount-negative' : 'amount-positive'}">
                            ${isNeg ? '-' : '+'} € ${Math.abs(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                        </span>
                        <button class="delete-trans-btn" onclick="deleteTransaction(${t.originalIndex})">✕</button>
                    </div>
                </div>
            `;
            transList.appendChild(div);

            if (index < reversed.length - 1) {
                const hr = document.createElement('div');
                hr.className = 'subtle-divider';
                transList.appendChild(hr);
            }
        });

        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    // ─── Delete ────────────────────────────────

    window.deleteTransaction = (index) => {
        if (confirm('Are you sure you want to delete this transaction?')) {
            transactions.splice(index, 1);
            updateUI();
        }
    };

    // ─── Modal ─────────────────────────────────

    mainAddBtn.onclick = () => {
        dateInput.value = today;
        modalOverlay.style.display = 'flex';
    };

    cancelBtn.onclick = () => {
        modalOverlay.style.display = 'none';
    };

    window.onclick = (e) => {
        if (e.target === modalOverlay) modalOverlay.style.display = 'none';
    };

    // ─── Add Transaction ───────────────────────

    confirmBtn.onclick = () => {
        const amount   = amountInput.value;
        const category = categoryInput.value;
        const date     = dateInput.value;

        if (!amount || !category || !date) {
            showCustomAlert();
            return;
        }

        if (date > today) {
            alert('Date cannot be in the future.');
            return;
        }

        const [year, month, day] = date.split('-');

        transactions.push({
            category,
            amount,
            date: `${day}-${month}-${year}`,
            note: noteInput.value.trim()
        });

        updateUI();
        modalOverlay.style.display = 'none';
        amountInput.value          = '';
        categoryInput.selectedIndex = 0;
        noteInput.value            = '';
    };

    // ─── Custom Alert ──────────────────────────

    function showCustomAlert() {
        const alertBox = document.getElementById('custom-alert');
        alertBox.style.display = 'flex';
        document.getElementById('close-alert').onclick = () => {
            alertBox.style.display = 'none';
        };
    }

    updateUI();
});
