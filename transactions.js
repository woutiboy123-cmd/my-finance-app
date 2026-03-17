document.addEventListener('DOMContentLoaded', async function () {
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

    var deleteOverlay = document.getElementById('delete-trans-overlay');
    var deleteText    = document.getElementById('delete-trans-text');
    var cancelDelete  = document.getElementById('cancel-delete-trans');
    var confirmDelete = document.getElementById('confirm-delete-trans');
    var pendingDelete = null; // { id, index } van de te verwijderen transactie

    var sb   = getSupabase();
    var user = await requireAuth();
    if (!user) return;

    // In-memory lijst: [{ id, category, amount, date, note }]
    var transactions = [];

    var CACHE_KEY = 'cache_transactions_' + user.id;

    function saveCache(data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data.slice(0, 50))); } catch(e) {}
    }

    function loadCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || []; } catch(e) { return []; }
    }

    var today        = new Date().toISOString().split('T')[0];
    var currentPage  = 1;
    var PAGE_SIZE    = 15;

    // ─── Laad data van Supabase ───────────────────────────

    async function loadData() {
        var cached = loadCache();
        if (cached.length > 0) { transactions = cached; currentPage = 1; updateUI(); }

        var r = await sb.from('transactions')
            .select('id, category, amount, date, note')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (r.error) { console.error(r.error); return; }

        transactions = (r.data || []).map(function (t) {
            return { id: t.id, category: t.category, amount: parseFloat(t.amount), date: t.date, note: t.note || '' };
        });

        saveCache(transactions);
        currentPage = 1;
        updateUI();
    }

    // ─── Helpers ──────────────────────────────────────────

    // Zet yyyy-mm-dd om naar dd-mm-yyyy voor weergave
    function fmtDate(iso) {
        if (!iso) return '';
        var p = iso.split('-');
        return p[2] + '-' + p[1] + '-' + p[0];
    }

    function getSorted() {
        return transactions.slice().sort(function (a, b) {
            return b.date.localeCompare(a.date);
        });
    }

    // ─── Render ───────────────────────────────────────────

    function updateUI() {
        transList.innerHTML = '';
        var sorted     = getSorted();
        var totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1)          currentPage = 1;

        var start = (currentPage - 1) * PAGE_SIZE;
        var slice = sorted.slice(start, start + PAGE_SIZE);

        if (slice.length === 0) {
            transList.innerHTML = '<p class="empty-state">Nog geen transacties.</p>';
        } else {
            slice.forEach(function (t, index) {
                var amount = parseFloat(t.amount) || 0;
                var isNeg  = amount < 0;

                var div = document.createElement('div');
                div.className = 'account-item';
                div.innerHTML =
                    '<span class="category-display">' + t.category + '</span>' +
                    '<span class="date-display">' + fmtDate(t.date) + '</span>' +
                    '<div class="note-amount-wrapper">' +
                        '<span class="note-display">' + (t.note || '') + '</span>' +
                        '<div class="trans-right-side-wrapper">' +
                            '<span class="trans-right-side ' + (isNeg ? 'amount-negative' : 'amount-positive') + '">' +
                                (isNeg ? '-' : '+') + ' \u20ac ' +
                                Math.abs(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 }) +
                            '</span>' +
                            '<button class="delete-trans-btn" onclick="openDeleteModal(\'' + t.id + '\')">\u2715</button>' +
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
    }

    // ─── Pagination ───────────────────────────────────────

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
        prev.onclick   = function () { currentPage--; updateUI(); };
        pagination.appendChild(prev);

        for (var i = 1; i <= totalPages; i++) {
            (function (page) {
                var btn = document.createElement('button');
                btn.className = 'page-btn' + (page === currentPage ? ' page-btn-active' : '');
                btn.innerText = page;
                btn.onclick   = function () { currentPage = page; updateUI(); };
                pagination.appendChild(btn);
            })(i);
        }

        var next = document.createElement('button');
        next.className = 'page-btn' + (currentPage === totalPages ? ' page-btn-disabled' : '');
        next.innerHTML = '&rsaquo;';
        next.disabled  = currentPage === totalPages;
        next.onclick   = function () { currentPage++; updateUI(); };
        pagination.appendChild(next);
    }

    // ─── Delete modal ─────────────────────────────────────

    // id is nu een UUID string (niet meer een array-index)
    window.openDeleteModal = function (id) {
        var t = transactions.find(function (x) { return x.id === id; });
        if (!t) return;
        pendingDelete = id;
        var amount = Math.abs(parseFloat(t.amount) || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 });
        deleteText.innerText = 'Verwijder "' + t.category + '" (\u20ac ' + amount + ') op ' + fmtDate(t.date) + '?';
        deleteOverlay.style.display = 'flex';
    };

    confirmDelete.onclick = async function () {
        if (!pendingDelete) return;
        var id = pendingDelete;
        pendingDelete = null;
        deleteOverlay.style.display = 'none';

        var r = await sb.from('transactions').delete().eq('id', id);
        if (r.error) { console.error(r.error); return; }

        transactions = transactions.filter(function (t) { return t.id !== id; });
        saveCache(transactions);
        updateUI();
    };

    cancelDelete.onclick = function () { pendingDelete = null; deleteOverlay.style.display = 'none'; };

    // ─── Type toggle (expense / income) ──────────────────

    function updateToggleUI() {
        if (typeSwitch.checked) {
            typeToggle.classList.remove('is-income');
        } else {
            typeToggle.classList.add('is-income');
        }
    }

    typeSwitch.addEventListener('change', updateToggleUI);
    updateToggleUI();

    // ─── Add modal ─────────────────────────────────────────

    mainAddBtn.onclick = function () {
        dateInput.value    = today;
        dateInput.max      = today;
        typeSwitch.checked = true;
        updateToggleUI();
        categoryInput.selectedIndex = 0;
        categoryInput.classList.add('unselected');
        categoryInput.classList.remove('selected');
        amountInput.value = '';
        noteInput.value   = '';
        modalOverlay.style.display = 'flex';
    };

    cancelBtn.onclick = function () { modalOverlay.style.display = 'none'; };

    categoryInput.addEventListener('change', function () {
        if (categoryInput.value) {
            categoryInput.classList.remove('unselected');
            categoryInput.classList.add('selected');
        }
    });

    window.onclick = function (e) {
        if (e.target === modalOverlay) modalOverlay.style.display = 'none';
        if (e.target === deleteOverlay) { pendingDelete = null; deleteOverlay.style.display = 'none'; }
    };

    // ─── Transactie toevoegen ─────────────────────────────

    confirmBtn.onclick = async function () {
        var amount   = amountInput.value;
        var category = categoryInput.value;
        var date     = dateInput.value;

        if (!amount || !category || !date) { showCustomAlert(); return; }
        if (date > today) { alert('Datum mag niet in de toekomst liggen.'); return; }

        var signedAmount = typeSwitch.checked
            ? -Math.abs(parseFloat(amount))
            :  Math.abs(parseFloat(amount));

        var r = await sb.from('transactions')
            .insert({
                user_id:  user.id,
                category: category,
                amount:   signedAmount,
                date:     date,          // yyyy-mm-dd (native van date-input)
                note:     noteInput.value.trim()
            })
            .select('id, category, amount, date, note')
            .single();

        if (r.error) { console.error(r.error); return; }

        transactions.unshift({
            id:       r.data.id,
            category: r.data.category,
            amount:   parseFloat(r.data.amount),
            date:     r.data.date,
            note:     r.data.note || ''
        });

        saveCache(transactions);
        currentPage = 1;
        updateUI();

        modalOverlay.style.display = 'none';
        amountInput.value          = '';
        noteInput.value            = '';
        categoryInput.selectedIndex = 0;
        categoryInput.classList.add('unselected');
        categoryInput.classList.remove('selected');
    };

    // ─── Custom alert ─────────────────────────────────────

    function showCustomAlert() {
        var alertBox = document.getElementById('custom-alert');
        alertBox.style.display = 'flex';
        document.getElementById('close-alert').onclick = function () {
            alertBox.style.display = 'none';
        };
    }

    // ─── Start ────────────────────────────────────────────
    await loadData();
});