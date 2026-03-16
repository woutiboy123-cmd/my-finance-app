document.addEventListener('DOMContentLoaded', () => {
    // 1. Elementen ophalen
    const mainAddBtn = document.getElementById('main-add-btn');
    const modalOverlay = document.getElementById('add-modal-overlay');
    const cancelBtn = document.getElementById('cancel-add-modal');
    const confirmBtn = document.getElementById('confirm-add-trans');
    const transList = document.getElementById('transactions-list');
    const dateInput = document.getElementById('trans-date');
    const noteInput = document.getElementById('trans-note');
    const amountInput = document.getElementById('trans-amount');
    const categoryInput = document.getElementById('trans-category');

    // 2. Data laden
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

    // 3. Toekomst blokkeren in de kalender
    const today = new Date().toISOString().split('T')[0];
    if (dateInput) {
        dateInput.max = today; // Je kunt geen datum na vandaag kiezen
        dateInput.value = today; // Standaard op vandaag zetten
    }

    // 4. De UI Update Functie
    function updateUI() {
        if (!transList) return;
        transList.innerHTML = '';
        
        // Draai de lijst om: nieuwste boven
        const reversedTrans = transactions.map((t, i) => ({...t, originalIndex: i})).reverse();

        reversedTrans.forEach((t, index) => {
            const amount = parseFloat(t.amount) || 0;
            const isNeg = amount < 0;
            
            const div = document.createElement('div');
            div.className = 'account-item';

            div.innerHTML = `
                <span class="category-display">${t.category}</span>
                <span class="date-display">${t.date}</span>
                <div class="note-amount-wrapper">
                    <span class="note-display">${t.note || ''}</span>
                    <div class="trans-right-side-wrapper">
                        <span class="trans-right-side ${isNeg ? 'amount-negative' : 'amount-positive'}">
                            ${isNeg ? '-' : '+'} € ${Math.abs(amount).toLocaleString('nl-NL', {minimumFractionDigits:2})}
                        </span>
                        <button class="delete-trans-btn" onclick="deleteTransaction(${t.originalIndex})">✕</button>
                    </div>
                </div>
            `;
            
            transList.appendChild(div);

            if (index < reversedTrans.length - 1) {
                const hr = document.createElement('div');
                hr.className = 'subtle-divider';
                transList.appendChild(hr);
            }
        });
        
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    // 5. Verwijder functie (moet op window staan voor de onclick in de HTML)
    window.deleteTransaction = (index) => {
        if (confirm("Wil je deze transactie verwijderen?")) {
            transactions.splice(index, 1);
            updateUI();
        }
    };

    // 6. Modal acties
    if (mainAddBtn) {
        mainAddBtn.onclick = () => {
            modalOverlay.style.display = 'flex';
            dateInput.value = today; // Reset naar vandaag bij openen
        };
    }

    if (cancelBtn) {
        cancelBtn.onclick = () => {
            modalOverlay.style.display = 'none';
        };
    }

    window.onclick = (event) => {
        if (event.target === modalOverlay) {
            modalOverlay.style.display = 'none';
        }
    };

    // 7. Transactie TOEVOEGEN
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            const amount = amountInput.value;
            const category = categoryInput.value;
            const selectedDate = dateInput.value;

            // Extra check op datum
            if (selectedDate > today) {
                alert("Datum kan niet in de toekomst liggen.");
                return;
            }

            if (amount && category && selectedDate) {
                // Zet browser-datum (YYYY-MM-DD) om naar NL-datum (DD-MM-YYYY)
                const [year, month, day] = selectedDate.split('-');
                const formattedDate = `${day}-${month}-${year}`;

                transactions.push({
                    category: category,
                    amount: amount,
                    date: formattedDate,
                    note: noteInput.value
                });

                updateUI();
                
                // Sluit en reset
                modalOverlay.style.display = 'none';
                amountInput.value = ''; 
                categoryInput.selectedIndex = 0;
                noteInput.value = '';
            } else {
                showCustomAlert(); // Toon je eigen popup
            }
        };
    }

    // Functie voor de custom alert
    function showCustomAlert() {
        const alertBox = document.getElementById('custom-alert');
        if (alertBox) {
            alertBox.style.display = 'flex';
            document.getElementById('close-alert').onclick = () => {
                alertBox.style.display = 'none';
            };
        } else {
            alert("Vul aub alle velden in.");
        }
    }

    // Start de weergave
    updateUI();
});