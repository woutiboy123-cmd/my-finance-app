document.addEventListener('DOMContentLoaded', async function () {
    const mainAddBtn    = document.getElementById('main-add-btn');
    const modalOverlay  = document.getElementById('add-modal-overlay');
    const cancelBtn     = document.getElementById('cancel-add-modal');
    const confirmBtn    = document.getElementById('confirm-add-trans');
    const transList     = document.getElementById('transactions-list');
    const pagination    = document.getElementById('pagination');
    const dateInput     = document.getElementById('trans-date');
    const noteInput     = document.getElementById('trans-note');
    const amountInput   = document.getElementById('trans-amount');
    const categoryInput = document.getElementById('trans-category');
    const typeSwitch    = document.getElementById('trans-type-switch');
    const typeToggle    = document.getElementById('trans-type-toggle');

    const deleteOverlay = document.getElementById('delete-trans-overlay');
    const deleteText    = document.getElementById('delete-trans-text');
    const cancelDelete  = document.getElementById('cancel-delete-trans');
    const confirmDelete = document.getElementById('confirm-delete-trans');
    let pendingDelete   = null;

    // In-memory list: [{ id, category, amount, date, note }]
    // Declared first so the cache block below can safely reference it.
    let transactions = [];
    let currentPage  = 1;
    const PAGE_SIZE  = 15;

    // ─── Show cache immediately (before requireAuth waits) ───
    const localUid = getLocalUserId();
    if (localUid) {
        try {
            const cached = JSON.parse(localStorage.getItem('cache_transactions_' + localUid));
            if (Array.isArray(cached) && cached.length > 0) {
                transactions = cached;
                currentPage  = 1;
                updateUI();
            }
        } catch (e) {}
    }

    const sb   = getSupabase();
    const user = await requireAuth();
    if (!user) return;

    const CACHE_KEY = 'cache_transactions_' + user.id;
    const today     = new Date().toISOString().split('T')[0];

    function saveCache(data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data.slice(0, 50))); } catch (e) {}
    }

    function loadCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || []; } catch (e) { return []; }
    }

    // ─── Load data from Supabase ──────────────────────────

    async function loadData() {
        const cached = loadCache();
        if (cached.length > 0 && transactions.length === 0) { transactions = cached; currentPage = 1; updateUI(); }

        const { data, error } = await sb.from('transactions')
            .select('id, category, amount, date, note')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) { console.error(error); return; }

        transactions = (data || []).map(function (t) {
            return { id: t.id, category: t.category, amount: parseFloat(t.amount), date: t.date, note: t.note || '' };
        });

        saveCache(transactions);
        currentPage = 1;
        updateUI();
    }

    // ─── Helpers ──────────────────────────────────────────

    function fmtDate(iso) {
        if (!iso) return '';
        const p = iso.split('-');
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
        const sorted     = getSorted();
        const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1)          currentPage = 1;

        const start = (currentPage - 1) * PAGE_SIZE;
        const slice = sorted.slice(start, start + PAGE_SIZE);

        if (slice.length === 0) {
            transList.innerHTML = '<p class="empty-state">No transactions yet.</p>';
        } else {
            slice.forEach(function (t, index) {
                const amount = parseFloat(t.amount) || 0;
                const isNeg  = amount < 0;

                const div = document.createElement('div');
                div.className = 'account-item';
                div.innerHTML =
                    '<span class="category-display">' + escapeHtml(t.category) + '</span>' +
                    '<span class="date-display">' + escapeHtml(fmtDate(t.date)) + '</span>' +
                    '<div class="note-amount-wrapper">' +
                        '<span class="note-display">' + escapeHtml(t.note || '') + '</span>' +
                        '<div class="trans-right-side-wrapper">' +
                            '<span class="trans-right-side ' + (isNeg ? 'amount-negative' : 'amount-positive') + '">' +
                                (isNeg ? '-' : '+') + ' \u20ac ' +
                                Math.abs(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 }) +
                            '</span>' +
                            '<button class="delete-trans-btn" data-id="' + escapeHtml(t.id) + '">\u2715</button>' +
                        '</div>' +
                    '</div>';
                transList.appendChild(div);

                if (index < slice.length - 1) {
                    const hr = document.createElement('div');
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

        const prev = document.createElement('button');
        prev.className = 'page-btn' + (currentPage === 1 ? ' page-btn-disabled' : '');
        prev.innerHTML = '&lsaquo;';
        prev.disabled  = currentPage === 1;
        prev.addEventListener('click', function () { currentPage--; updateUI(); });
        pagination.appendChild(prev);

        for (let i = 1; i <= totalPages; i++) {
            (function (page) {
                const btn = document.createElement('button');
                btn.className = 'page-btn' + (page === currentPage ? ' page-btn-active' : '');
                btn.innerText = page;
                btn.addEventListener('click', function () { currentPage = page; updateUI(); });
                pagination.appendChild(btn);
            })(i);
        }

        const next = document.createElement('button');
        next.className = 'page-btn' + (currentPage === totalPages ? ' page-btn-disabled' : '');
        next.innerHTML = '&rsaquo;';
        next.disabled  = currentPage === totalPages;
        next.addEventListener('click', function () { currentPage++; updateUI(); });
        pagination.appendChild(next);
    }

    // ─── Delete modal ─────────────────────────────────────

    // Use event delegation on transList to avoid inline onclick with IDs
    transList.addEventListener('click', function (e) {
        const btn = e.target.closest('.delete-trans-btn');
        if (!btn) return;
        const id = btn.dataset.id;
        openDeleteModal(id);
    });

    function openDeleteModal(id) {
        const t = transactions.find(function (x) { return x.id === id; });
        if (!t) return;
        pendingDelete = id;
        const amount = Math.abs(parseFloat(t.amount) || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 });
        deleteText.innerText = 'Delete "' + t.category + '" (\u20ac ' + amount + ') on ' + fmtDate(t.date) + '?';
        deleteOverlay.style.display = 'flex';
    }

    confirmDelete.addEventListener('click', async function () {
        if (!pendingDelete) return;
        const id  = pendingDelete;
        pendingDelete = null;
        deleteOverlay.style.display = 'none';

        const { error } = await sb.from('transactions').delete().eq('id', id);
        if (error) { console.error(error); return; }

        transactions = transactions.filter(function (t) { return t.id !== id; });
        saveCache(transactions);
        updateUI();
    });

    cancelDelete.addEventListener('click', function () {
        pendingDelete = null;
        deleteOverlay.style.display = 'none';
    });

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

    mainAddBtn.addEventListener('click', function () {
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
    });

    cancelBtn.addEventListener('click', function () { modalOverlay.style.display = 'none'; });

    categoryInput.addEventListener('change', function () {
        if (categoryInput.value) {
            categoryInput.classList.remove('unselected');
            categoryInput.classList.add('selected');
        }
    });

    // Close modals when clicking the backdrop (use addEventListener, not window.onclick)
    document.addEventListener('click', function (e) {
        if (e.target === modalOverlay) modalOverlay.style.display = 'none';
        if (e.target === deleteOverlay) { pendingDelete = null; deleteOverlay.style.display = 'none'; }
    });

    // ─── Add transaction ──────────────────────────────────

    confirmBtn.addEventListener('click', async function () {
        const amount   = amountInput.value;
        const category = categoryInput.value;
        const date     = dateInput.value;

        if (!amount || !category || !date) { showCustomAlert(); return; }
        if (date > today) { alert('Date cannot be in the future.'); return; }

        const signedAmount = typeSwitch.checked
            ? -Math.abs(parseFloat(amount))
            :  Math.abs(parseFloat(amount));

        const { data, error } = await sb.from('transactions')
            .insert({
                user_id:  user.id,
                category: category,
                amount:   signedAmount,
                date:     date,
                note:     noteInput.value.trim()
            })
            .select('id, category, amount, date, note')
            .single();

        if (error) { console.error(error); return; }

        transactions.unshift({
            id:       data.id,
            category: data.category,
            amount:   parseFloat(data.amount),
            date:     data.date,
            note:     data.note || ''
        });

        saveCache(transactions);
        currentPage = 1;
        updateUI();

        modalOverlay.style.display = 'none';
        amountInput.value           = '';
        noteInput.value             = '';
        categoryInput.selectedIndex = 0;
        categoryInput.classList.add('unselected');
        categoryInput.classList.remove('selected');
    });

    // ─── Custom alert ─────────────────────────────────────

    function showCustomAlert() {
        const alertBox = document.getElementById('custom-alert');
        alertBox.style.display = 'flex';
        document.getElementById('close-alert').onclick = function () {
            alertBox.style.display = 'none';
        };
    }

    // ─── Start ────────────────────────────────────────────
    await loadData();
});