document.addEventListener('DOMContentLoaded', function() {
    var mainAddBtn   = document.getElementById('main-add-btn');
    var modalOverlay = document.getElementById('add-modal-overlay');
    var cancelBtn    = document.getElementById('cancel-add-modal');
    var confirmBtn   = document.getElementById('confirm-add-trans');
    var transList    = document.getElementById('transactions-list');
    var dateInput    = document.getElementById('trans-date');
    var noteInput    = document.getElementById('trans-note');
    var amountInput  = document.getElementById('trans-amount');
    var categoryInput = document.getElementById('trans-category');

    var transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    var today = new Date().toISOString().split('T')[0];
    dateInput.max   = today;
    dateInput.value = today;

    // ─── Render ────────────────────────────────

    function updateUI() {
        transList.innerHTML = '';
        var reversed = transactions.map(function(t, i) { return Object.assign({}, t, { originalIndex: i }); }).reverse();

        reversed.forEach(function(t, index) {
            var amount = parseFloat(t.amount) || 0;
            var isNeg  = amount < 0;

            var div = document.createElement('div');
            div.className = 'account-item';
            div.innerHTML =
                '<span class="category-display">' + t.category + '</span>' +
                '<span class="date-display">' + t.date + '</span>' +
                '<div class="note-amount-wrapper">' +
                    '<span class="note-display">' + (t.note || '') + '</span>' +
                    '<div class="trans-right-side-wrapper">' +
                        '<span class="trans-right-side ' + (isNeg ? 'amount-negative' : 'amount-positive') + '">' +
                            (isNeg ? '-' : '+') + ' \u20ac ' +
                            Math.abs(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 }) +
                        '</span>' +
                        '<button class="delete-trans-btn" onclick="deleteTransaction(' + t.originalIndex + ')">\u2715</button>' +
                    '</div>' +
                '</div>';
            transList.appendChild(div);

            if (index < reversed.length - 1) {
                var hr = document.createElement('div');
                hr.className = 'subtle-divider';
                transList.appendChild(hr);
            }
        });

        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    // ─── Delete ────────────────────────────────

    window.deleteTransaction = function(index) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            transactions.splice(index, 1);
            updateUI();
        }
    };

    // ─── Modal ─────────────────────────────────

    mainAddBtn.onclick = function() {
        dateInput.value = today;
        modalOverlay.style.display = 'flex';
    };

    cancelBtn.onclick = function() { modalOverlay.style.display = 'none'; };

    window.onclick = function(e) {
        if (e.target === modalOverlay) modalOverlay.style.display = 'none';
    };

    // ─── Add Transaction ───────────────────────

    confirmBtn.onclick = function() {
        var amount   = amountInput.value;
        var category = categoryInput.value;
        var date     = dateInput.value;

        if (!amount || !category || !date) { showCustomAlert(); return; }
        if (date > today)                  { alert('Date cannot be in the future.'); return; }

        var parts = date.split('-');
        transactions.push({
            category: category,
            amount:   amount,
            date:     parts[2] + '-' + parts[1] + '-' + parts[0],
            note:     noteInput.value.trim()
        });

        updateUI();
        modalOverlay.style.display  = 'none';
        amountInput.value           = '';
        categoryInput.selectedIndex = 0;
        noteInput.value             = '';
    };

    // ─── Custom Alert ──────────────────────────

    function showCustomAlert() {
        var alertBox = document.getElementById('custom-alert');
        alertBox.style.display = 'flex';
        document.getElementById('close-alert').onclick = function() {
            alertBox.style.display = 'none';
        };
    }

    updateUI();
});