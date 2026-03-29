document.addEventListener("DOMContentLoaded", () => {
    // 1. Scroll Animations
    const appearOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
    const appearOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("appear");
            observer.unobserve(entry.target);
        });
    }, appearOptions);

    const faders = document.querySelectorAll('.fade-in, .fade-in-up');
    faders.forEach(fader => appearOnScroll.observe(fader));

    // 2. Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if(window.scrollY > 50) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
        });
    }

    // --- BOOKING LOGIC ---
    const wizardSteps = document.querySelectorAll('.wizard-step');
    const tabs = document.querySelectorAll('.wizard-tabs .tab');
    const displayTotal = document.getElementById('estimated-total');
    const nextBtn = document.getElementById('next-step-btn');
    
    // UI elements to update in Reservation details
    const resDateVal = document.querySelector('.res-item:nth-child(2) .val'); // Check structure
    const resLocVal = document.querySelector('.res-item:nth-child(3) .val');

    let currentStep = 0; // 0=Property, 1=Schedule, 2=Addons
    let basePrice = 0;
    let customQuote = false;
    let addonTotal = 0;

    let selectedProperty = null;
    let selectedDate = null;
    let selectedAddress = null;
    let selectedAddons = new Set();
    
    function setStep(index) {
        if(index < 0 || index >= wizardSteps.length) return;
        currentStep = index;
        
        wizardSteps.forEach(s => s.classList.remove('active'));
        tabs.forEach(t => { t.classList.remove('active'); t.style.color = 'var(--text-muted)'; });
        
        wizardSteps[currentStep].classList.add('active');
        tabs[currentStep].classList.add('active');
        tabs[currentStep].style.color = 'var(--primary)';
        
        document.querySelector('.step.active').textContent = `Step ${currentStep + 1} of 3`;
        
        if (currentStep === 1) { setTimeout(() => map.invalidateSize(), 100); }
        
        updateButtonStatus();
    }

    function updateTotal() {
        if(customQuote) {
            displayTotal.textContent = "Custom Quote";
            return;
        }
        if (basePrice === 0) { displayTotal.textContent = "—"; return; }
        const grandTotal = basePrice + addonTotal;
        displayTotal.textContent = `$${grandTotal.toFixed(2)}`;
    }

    function updateButtonStatus() {
        if(!nextBtn) return;
        let canProceed = false;
        
        if (currentStep === 0 && selectedProperty !== null) canProceed = true;
        if (currentStep === 1 && selectedDate !== null && selectedAddress !== null) canProceed = true;
        if (currentStep === 2) { 
            canProceed = true; 
            nextBtn.textContent = "FINALIZE BOOKING";
        } else {
            nextBtn.textContent = "NEXT STEP";
        }

        if(canProceed) {
            nextBtn.classList.remove('disabled');
            nextBtn.removeAttribute('disabled');
        } else {
            nextBtn.classList.add('disabled');
            nextBtn.setAttribute('disabled', 'true');
        }
    }

    // Step 1: Properties
    const propertyCards = document.querySelectorAll('.property-card');
    propertyCards.forEach(card => {
        card.addEventListener('click', () => {
            propertyCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            selectedProperty = card.getAttribute('data-name');
            const pVal = card.getAttribute('data-price');
            if (pVal.includes("Custom")) {
                customQuote = true;
                basePrice = 0;
            } else {
                customQuote = false;
                basePrice = parseFloat(pVal.replace(/[^0-9.]/g, ''));
            }
            updateTotal();
            updateButtonStatus();
        });
    });

    // Step 2: Calendar & Map
    let map;
    let marker;
    const MIAMI_HQ = [25.8082, -80.2223];
    
    if (document.getElementById('map')) {
        map = L.map('map').setView(MIAMI_HQ, 10);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(map);

        const hqMarker = L.marker(MIAMI_HQ).addTo(map).bindPopup("<b>Sanctum Clean HQ</b><br>1455 NW 35th St").openPopup();
        
        // Mocking address verification (In real scenario, geocode this)
        const addrBtn = document.getElementById('verify-address-btn');
        const addrInput = document.getElementById('address-input');
        const locStatus = document.getElementById('location-status');
        
        addrBtn.addEventListener('click', () => {
            const val = addrInput.value.trim();
            if(val.length < 5) return;
            
            // Just simulate a random nearby point around Miami for the demo
            const latOffset = (Math.random() - 0.5) * 0.4;
            const lngOffset = (Math.random() - 0.5) * 0.4;
            const newPos = [MIAMI_HQ[0] + latOffset, MIAMI_HQ[1] + lngOffset];
            
            if(marker) map.removeLayer(marker);
            marker = L.marker(newPos).addTo(map);
            map.flyTo(newPos, 12);
            
            locStatus.textContent = "Address within service range!";
            locStatus.className = "status-msg success";
            selectedAddress = val;
            
            if(resLocVal) {
                 resLocVal.textContent = val.substring(0, 20) + "...";
            }
            updateButtonStatus();
        });
    }

    // Very simple calendar generator
    const calGrid = document.getElementById('calendar-grid');
    if (calGrid) {
        // Generate current dates
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMon = new Date(year, month + 1, 0).getDate();
        
        for(let i=0; i<firstDay; i++) {
            const empty = document.createElement('div');
            calGrid.appendChild(empty);
        }
        
        const today = date.getDate();
        for(let d=1; d<=daysInMon; d++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'cal-day';
            dayEl.textContent = d;
            
            // Disable past dates
            if (d < today) {
                dayEl.classList.add('disabled');
            } else {
                dayEl.addEventListener('click', () => {
                    document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
                    dayEl.classList.add('selected');
                    selectedDate = `${month+1}/${d}/${year}`;
                    const timeWindow = document.getElementById('time-window').value;
                    if(resDateVal) resDateVal.textContent = `${selectedDate} - ${timeWindow.split(' ')[0]}`;
                    updateButtonStatus();
                });
            }
            calGrid.appendChild(dayEl);
        }
        
        const timeWindowEl = document.getElementById('time-window');
        if(timeWindowEl) {
             timeWindowEl.addEventListener('change', () => {
                 if(selectedDate && resDateVal) {
                     resDateVal.textContent = `${selectedDate} - ${timeWindowEl.value.split(' ')[0]}`;
                 }
             });
        }
    }

    // Step 3: Add-ons
    const addOnCards = document.querySelectorAll('.addon-card');
    addOnCards.forEach(card => {
        const btn = card.querySelector('.add-btn');
        const price = parseFloat(card.getAttribute('data-addon-price'));
        const name = card.getAttribute('data-addon-name');
        
        btn.addEventListener('click', () => {
            if (selectedAddons.has(name)) { // Remove it
                selectedAddons.delete(name);
                addonTotal -= price;
                card.classList.remove('selected');
                btn.textContent = "Add to Service";
            } else { // Add it
                selectedAddons.add(name);
                addonTotal += price;
                card.classList.add('selected');
                btn.textContent = "Added ✓";
            }
            updateTotal();
        });
    });

    // Next Button Controller
    if(nextBtn) {
        nextBtn.addEventListener('click', () => {
            if(nextBtn.classList.contains('disabled')) return;
            
            if (currentStep < 2) {
                setStep(currentStep + 1);
            } else {
                alert("Processing Payment for Grand Total: $" + (basePrice+addonTotal).toFixed(2));
                // End of flow
            }
        });
    }

    // Allow user to click back explicitly
    tabs.forEach((tab, idx) => {
        tab.style.cursor = "pointer";
        tab.addEventListener('click', () => {
            // Only allow backwards navigation or if valid
            if (idx <= currentStep) {
                 setStep(idx);
            }
        });
    });

    setStep(0); // Init
});
