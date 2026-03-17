document.addEventListener('DOMContentLoaded', function() {
    var mainAddBtn    = document.getElementById('main-add-btn');
    var modalOverlay  = document.getElementById('add-modal-overlay');
    var cancelBtn     = document.getElementById('cancel-add-modal');
    var confirmBtn    = document.getElementById('confirm-add-trans');
    var transList     = document.getElementById('transactions-list');
    var pagination    = document.getElementById('pagination');
    var dateInput     = document.getElementById('trans-date');
    var noteInput     = document.getElementById('trans-note');
    var amountInput   = document.getElementById('trans-amount');
    var categoryInput = document.getElementById('trans-category');
    var typeSwitch    = document.getElementById('trans-type-switch');
    var typeToggle    = document.getElementById('trans-type-toggle');

    // Delete modal elements
    var deleteOverlay  = document.getElementById('delete-trans-overlay');
    var deleteText     = document.getElementById('delete-trans-text');
    var cancelDelete   = document.getElementById('cancel-delete-trans');
    var confirmDelete  = document.getElementById('confirm-delete-trans');
    var pendingDelete  = null;

    var transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    var today        = new Date().toISOString().split('T')[0];
    var currentPage  = 1;
    var PAGE_SIZE    = 15;

    dateInput.max   = today;
    dateInput.value = today;

    // ─── Category placeholder state ────────────

    categoryInput.addEventListener('change', function() {
        if (categoryInput.value) {
            categoryInput.classList.remove('unselected');
            categoryInput.classList.add('selected');
        }
    });

    // ─── Sort helpers ──────────────────────────

    function parseDateStr(str) {
        if (!str) return '';
        var p = str.split('-');
        if (p.length !== 3) return str;
        if (p[0].length === 4) return str;
        return p[2] + '-' + p[1] + '-' + p[0];
    }

    function getSorted() {
        return transactions
            .map(function(t, i) { return Object.assign({}, t, { originalIndex: i }); })
            .sort(function(a, b) {
                return parseDateStr(b.date).localeCompare(parseDateStr(a.date));
            });
    }

    // ─── Render ────────────────────────────────

    function updateUI() {
        transList.innerHTML = '';
        var sorted     = getSorted();
        var totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1)          currentPage = 1;

        var start = (currentPage - 1) * PAGE_SIZE;
        var slice = sorted.slice(start, start + PAGE_SIZE);

        if (slice.length === 0) {
            transList.innerHTML = '<p class="empty-state">No transactions yet.</p>';
        } else {
            slice.forEach(function(t, index) {
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
                            '<button class="delete-trans-btn" onclick="openDeleteModal(' + t.originalIndex + ')">\u2715</button>' +
                        '</div>' +
                    '</div>';
                transList.appendChild(div);

                if (index < slice.length - 1) {
                    var hr = document.createElement('div');
                    hr.className = 'subtle-divider';
                    transList.appendChild(hr);
                }
            });
        }

        renderPagination(totalPages);
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    // ─── Pagination ────────────────────────────

    function renderPagination(totalPages) {
        pagination.innerHTML = '';
        pagination.style.marginTop  = '';
        pagination.style.paddingTop = '';
        pagination.style.borderTop  = '';
        if (totalPages <= 1) return;

        pagination.style.marginTop  = '0';
        pagination.style.paddingTop = '16px';
        pagination.style.borderTop  = '1px solid rgba(255,255,255,0.08)';

        var prev = document.createElement('button');
        prev.className = 'page-btn' + (currentPage === 1 ? ' page-btn-disabled' : '');
        prev.innerHTML = '&lsaquo;';
        prev.disabled  = currentPage === 1;
        prev.onclick   = function() { currentPage--; updateUI(); };
        pagination.appendChild(prev);

        for (var i = 1; i <= totalPages; i++) {
            (function(page) {
                var btn = document.createElement('button');
                btn.className = 'page-btn' + (page === currentPage ? ' page-btn-active' : '');
                btn.innerText = page;
                btn.onclick   = function() { currentPage = page; updateUI(); };
                pagination.appendChild(btn);
            })(i);
        }

        var next = document.createElement('button');
        next.className = 'page-btn' + (currentPage === totalPages ? ' page-btn-disabled' : '');
        next.innerHTML = '&rsaquo;';
        next.disabled  = currentPage === totalPages;
        next.onclick   = function() { currentPage++; updateUI(); };
        pagination.appendChild(next);
    }

    // ─── Delete modal ──────────────────────────

    window.openDeleteModal = function(index) {
        pendingDelete = index;
        var t = transactions[index];
        var amount = Math.abs(parseFloat(t.amount) || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 });
        deleteText.innerText = 'Delete "' + t.category + '" (\u20ac ' + amount + ') on ' + t.date + '?';
        deleteOverlay.style.display = 'flex';
    };

    confirmDelete.onclick = function() {
        if (pendingDelete === null) return;
        transactions.splice(pendingDelete, 1);
        pendingDelete = null;
        deleteOverlay.style.display = 'none';
        updateUI();
    };

    cancelDelete.onclick = function() {
        pendingDelete = null;
        deleteOverlay.style.display = 'none';
    };

    // ─── Add modal ─────────────────────────────

    function updateToggleUI() {
        if (typeSwitch.checked) {
            typeToggle.classList.remove('is-income');
        } else {
            typeToggle.classList.add('is-income');
        }
    }

    typeSwitch.addEventListener('change', updateToggleUI);
    updateToggleUI();

    mainAddBtn.onclick = function() {
        dateInput.value    = today;
        typeSwitch.checked = true;
        updateToggleUI();
        categoryInput.selectedIndex = 0;
        categoryInput.classList.add('unselected');
        categoryInput.classList.remove('selected');
        amountInput.value = '';
        noteInput.value   = '';
        modalOverlay.style.display = 'flex';
    };

    cancelBtn.onclick = function() { modalOverlay.style.display = 'none'; };

    window.onclick = function(e) {
        if (e.target === modalOverlay) modalOverlay.style.display = 'none';
        if (e.target === deleteOverlay) { pendingDelete = null; deleteOverlay.style.display = 'none'; }
    };

    // ─── Add Transaction ───────────────────────

    confirmBtn.onclick = function() {
        var amount   = amountInput.value;
        var category = categoryInput.value;
        var date     = dateInput.value;

        if (!amount || !category || !date) { showCustomAlert(); return; }
        if (date > today) { alert('Date cannot be in the future.'); return; }

        var signedAmount = typeSwitch.checked
            ? -Math.abs(parseFloat(amount))
            :  Math.abs(parseFloat(amount));

        var p = date.split('-');
        transactions.push({
            category: category,
            amount:   signedAmount,
            date:     p[2] + '-' + p[1] + '-' + p[0],
            note:     noteInput.value.trim()
        });

        currentPage = 1;
        updateUI();

        modalOverlay.style.display = 'none';
        amountInput.value          = '';
        noteInput.value            = '';
        categoryInput.selectedIndex = 0;
        categoryInput.classList.add('unselected');
        categoryInput.classList.remove('selected');
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