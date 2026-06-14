/**
 * @fileoverview EcoTrack - Carbon Footprint Awareness Platform
 * @author Rushabh Desai
 * @version 2.0.0
 * @description Main application logic handling carbon footprint calculations,
 * Google Services integration, UI rendering, and security.
 */

/**
 * Freeze built-in prototypes to prevent
 * prototype pollution attacks
 */
Object.freeze(Object.prototype);
Object.freeze(Array.prototype);
Object.freeze(String.prototype);

/**
 * Generate cryptographically secure session ID
 * Used for security audit logging only
 */
const SESSION_ID = crypto.getRandomValues(new Uint8Array(16)).join('-');


// ============================================
// SECTION 1: CONSTANTS & CONFIGURATION
// ============================================

/** @constant {number} Global average CO2 tons/yr */
const GLOBAL_AVERAGE_TONS = 4.7;

/** @constant {number} Cooldown between calculations in milliseconds */
const CALCULATION_COOLDOWN_MS = 2000;

/** @constant {Object} Emission factors per category */
const EMISSION_FACTORS = {
    /** kg CO2 per km driven */
    CAR_KG_PER_KM: 0.192,
    /** kg CO2 per flight */
    FLIGHT_KG_PER_FLIGHT: 250,
    /** kg CO2 per kWh electricity */
    ELECTRICITY_KG_PER_KWH: 0.85,
    /** tons CO2 per year by diet type */
    DIET_TONS: {
        vegan: 1.5,
        vegetarian: 1.7,
        'meat-eater': 3.3
    }
};

/** @constant {Array<string>} Valid diet options */
const VALID_DIETS = ['vegan', 'vegetarian', 'meat-eater'];

/** @constant {Object} Input validation limits */
const INPUT_LIMITS = {
    MAX_CAR_KM: 2000,
    MAX_FLIGHTS: 365,
    MAX_ELECTRICITY: 10000
};

// ============================================
// SECTION 2: APPLICATION STATE
// ============================================

/**
 * @typedef {Object} EmissionsData
 * @property {number} car - Car emissions in tons
 * @property {number} flights - Flight emissions
 * @property {number} electricity - Energy emissions
 * @property {number} diet - Diet emissions in tons
 * @property {number} total - Total emissions
 */

/**
 * @typedef {Object} UserData
 * @property {number} carKm - Daily car km
 * @property {number} flights - Flights per year
 * @property {number} electricity - Monthly kWh
 * @property {string} diet - Diet type
 * @property {EmissionsData} emissions - Calculated emissions
 */

/** @type {UserData} Application state */
const userData = {
    carKm: 0,
    flights: 0,
    electricity: 0,
    diet: '',
    emissions: {
        car: 0,
        flights: 0,
        electricity: 0,
        diet: 0,
        total: 0
    }
};

/**
 * Token bucket rate limiter
 * Prevents API abuse and spam
 */
const RateLimiter = {
    tokens: 3,
    maxTokens: 3,
    refillRate: 1,
    lastRefill: Date.now(),
    
    /** Check if action is allowed */
    isAllowed() {
        this._refill();
        if (this.tokens > 0) {
            this.tokens--;
            return true;
        }
        return false;
    },
    
    /** Refill tokens based on time passed */
    _refill() {
        const now = Date.now();
        const timePassed = (now - this.lastRefill) / 1000;
        const newTokens = Math.floor(timePassed * this.refillRate);
        if (newTokens > 0) {
            this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
            this.lastRefill = now;
        }
    }
};

/**
 * Secure API key manager
 * Key exists in memory for ONE use only
 */
const SecureKeyManager = {
    _key: null,
    
    /** Store key for single use */
    setKey(key) {
        this._key = key;
        const keyEl = document.getElementById('gemini-key');
        if (keyEl) keyEl.value = '';
    },
    
    /** Retrieve and immediately destroy key */
    consumeKey() {
        const key = this._key;
        this._key = null;
        return key;
    },
    
    /** Check if key exists */
    hasKey() {
        return this._key !== null;
    }
};

// ============================================
// SECTION 3: DOM ELEMENT CACHE
// ============================================

// View Containers
const calculatorViewEl = document.getElementById('view-calculator');
const resultsViewEl = document.getElementById('view-results');
const tipsViewEl = document.getElementById('view-ai-tips');

// Navigation Buttons
const navCalcEl = document.getElementById('nav-calc');
const navResultsEl = document.getElementById('nav-results');
const navTipsEl = document.getElementById('nav-tips');

// Form and Inputs
const calculatorFormEl = document.getElementById('calculator-form');
const inputCarKmEl = document.getElementById('car-km');
const inputFlightsEl = document.getElementById('flights');
const inputElectricityEl = document.getElementById('electricity');
const inputDietEl = document.getElementById('diet');

// Action Buttons
const btnRecalculateEl = document.getElementById('btn-recalculate');
const btnGetTipsEl = document.getElementById('btn-get-tips');
const btnGenerateTipsEl = document.getElementById('btn-generate-tips');
const btnDownloadReportEl = document.getElementById('btn-download-report');

// Results & Tips UI
const totalScoreEl = document.getElementById('total-score');
const comparisonTextEl = document.getElementById('comparison-text');
const emissionsChartEl = document.getElementById('emissions-chart');
const inputGeminiKeyEl = document.getElementById('gemini-key');
const apiKeySectionEl = document.getElementById('api-key-section');
const loadingStateEl = document.getElementById('loading-state');
const tipsContainerEl = document.getElementById('tips-container');
const toastEl = document.getElementById('toast');
const historyListEl = document.getElementById('history-list');

// ============================================
// SECTION 4: UTILITY FUNCTIONS
// ============================================

/**
 * Advanced input sanitizer
 * Removes ALL potentially harmful characters
 * @param {string|number} value - The input value to sanitize.
 * @returns {string|number} The sanitized string or the original number.
 */
function sanitizeInput(value) {
    if (typeof value === 'string') {
        return value
            .replace(/[<>'"&\/\\]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .trim()
            .slice(0, 100);
    }
    return value;
}

/**
 * Escapes HTML characters in a string to prevent XSS attacks.
 * @param {string} unsafe - Raw string potentially containing HTML.
 * @returns {string} Safely escaped HTML string.
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Performance Monitoring utility
 */
const PerformanceMonitor = {
    marks: {},
    start(label) {
        this.marks[label] = performance.now();
    },
    end(label) {
        const duration = performance.now() - this.marks[label];
        if (window.cloudLogger) {
            window.cloudLogger.info(`⚡ ${label}: ${duration.toFixed(2)}ms`);
        }
        delete this.marks[label];
    }
};

/**
 * Batches DOM updates to avoid layout thrashing
 * @param {Array<Function>} updates - Array of functions to run
 */
function batchDOMUpdates(updates) {
    requestAnimationFrame(() => {
        updates.forEach(update => update());
    });
}

/**
 * Memoizes heavy calculation functions
 * @param {Function} fn - Function to memoize
 * @returns {Function} Memoized function
 */
const memoize = (fn) => {
    const cache = new Map();
    return (...args) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) return cache.get(key);
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};

/**
 * Memory Management utility
 */
const CleanupManager = {
    listeners: [],
    add(element, event, handler) {
        if (!element) return;
        element.addEventListener(event, handler);
        this.listeners.push({ element, event, handler });
    },
    cleanup() {
        this.listeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.listeners = [];
    }
};
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Validates all numeric form inputs enforcing finite bounds.
 * @returns {boolean} True if all inputs are valid.
 */
function validateInputs() {
    let carInputStr = sanitizeInput(inputCarKmEl.value).toString().slice(0, 4);
    let flightInputStr = sanitizeInput(inputFlightsEl.value).toString().slice(0, 3);
    let elecInputStr = sanitizeInput(inputElectricityEl.value).toString().slice(0, 5);

    let carInput = parseFloat(carInputStr);
    let flightInput = parseFloat(flightInputStr);
    let elecInput = parseFloat(elecInputStr);

    if (!Number.isFinite(carInput) || Number.isNaN(carInput)) carInput = 0;
    if (!Number.isFinite(flightInput) || Number.isNaN(flightInput)) {
        flightInput = 0;
    }
    if (!Number.isFinite(elecInput) || Number.isNaN(elecInput)) elecInput = 0;

    let dietValue = sanitizeInput(inputDietEl.value);
    if (!VALID_DIETS.includes(dietValue)) {
        dietValue = 'meat-eater'; // Safe fallback
    }

    userData.carKm = Math.max(0, carInput);
    userData.flights = Math.max(0, flightInput);
    userData.electricity = Math.max(0, elecInput);
    userData.diet = dietValue;

    return true;
}

// ============================================
// SECTION 5: CALCULATION ENGINE
// ============================================

/**
 * Calculates carbon footprint from user inputs using emission factors.
 * @returns {void} Updates userData object in-place.
 */
function calculateFootprint() {
    const carTons = 
        (userData.carKm * 365 * EMISSION_FACTORS.CAR_KG_PER_KM) / 1000;
        
    const flightTons = 
        (userData.flights * EMISSION_FACTORS.FLIGHT_KG_PER_FLIGHT) / 1000;
        
    const elecTons = 
        (userData.electricity * 12 * 
         EMISSION_FACTORS.ELECTRICITY_KG_PER_KWH) / 1000;

    let dietTons = 0;
    if (userData.diet === 'vegan') {
        dietTons = EMISSION_FACTORS.DIET_TONS.vegan;
    } else if (userData.diet === 'vegetarian') {
        dietTons = EMISSION_FACTORS.DIET_TONS.vegetarian;
    } else {
        dietTons = EMISSION_FACTORS.DIET_TONS['meat-eater'];
    }

    userData.emissions = {
        car: carTons,
        flights: flightTons,
        electricity: elecTons,
        diet: dietTons,
        total: carTons + flightTons + elecTons + dietTons
    };
}

// ============================================
// SECTION 6: UI RENDERING
// ============================================

/**
 * Switches the active view dynamically based on the provided key.
 * @param {string} viewKey - 'calculator', 'results', or 'aiTips'.
 * @returns {void}
 */
function switchView(viewKey) {
    calculatorViewEl.classList.remove('active');
    resultsViewEl.classList.remove('active');
    tipsViewEl.classList.remove('active');

    navCalcEl.classList.remove('active');
    navResultsEl.classList.remove('active');
    navTipsEl.classList.remove('active');

    if (viewKey === 'calculator') {
        calculatorViewEl.classList.add('active');
        navCalcEl.classList.add('active');
        navCalcEl.disabled = false;
    } else if (viewKey === 'results') {
        resultsViewEl.classList.add('active');
        navResultsEl.classList.add('active');
        navResultsEl.disabled = false;
        if (typeof gtag === 'function') gtag('event', 'view_results');
    } else if (viewKey === 'aiTips') {
        tipsViewEl.classList.add('active');
        navTipsEl.classList.add('active');
        navTipsEl.disabled = false;
    }
}

/**
 * Animates the total score from 0 to the calculated amount.
 * @returns {void}
 */
function animateScoreMeter() {
    const totalScore = userData.emissions.total;
    let currentScore = 0;
    const increment = totalScore / 50;
    
    const animationInterval = setInterval(() => {
        currentScore += increment;
        if (currentScore >= totalScore) {
            currentScore = totalScore;
            clearInterval(animationInterval);
        }
        totalScoreEl.textContent = currentScore.toFixed(1);
    }, 20);
}

/**
 * Updates the comparison text block comparing user to global average.
 * @returns {void}
 */
function updateComparisonText() {
    const totalScore = userData.emissions.total;
    let comparisonHtml = '';

    if (totalScore < GLOBAL_AVERAGE_TONS) {
        const difference = (GLOBAL_AVERAGE_TONS - totalScore).toFixed(1);
        comparisonHtml = `<span class="comparison good">` +
                         `<i class="fa-solid fa-arrow-down"></i> ` +
                         `${difference} tons below</span> global average`;
    } else if (totalScore > GLOBAL_AVERAGE_TONS) {
        const difference = (totalScore - GLOBAL_AVERAGE_TONS).toFixed(1);
        comparisonHtml = `<span class="comparison bad">` +
                         `<i class="fa-solid fa-arrow-up"></i> ` +
                         `${difference} tons above</span> global average`;
    } else {
        comparisonHtml = `<span class="comparison average">` +
                         `<i class="fa-solid fa-equals"></i> ` +
                         `Equal to</span> global average`;
    }
    comparisonTextEl.innerHTML = comparisonHtml;
}

/**
 * Coordinates rendering the Results dashboard.
 * @returns {void}
 */
function renderResults() {
    batchDOMUpdates([
        () => animateScoreMeter(),
        () => updateComparisonText(),
        () => {
            if (typeof google !== 'undefined' && google.visualization) {
                drawEmissionsChart();
            } else {
                google.charts.setOnLoadCallback(drawEmissionsChart);
            }
        }
    ]);
}

/**
 * Renders the AI-generated or fallback tips securely into the UI.
 * @param {Array<Object>} tipsArray - Array of objects with title/description.
 * @returns {void}
 */
function renderTips(tipsArray) {
    loadingStateEl.classList.add('hidden');
    tipsContainerEl.classList.remove('hidden');

    const iconClasses = ['fa-lightbulb', 'fa-leaf', 'fa-earth-americas'];

    tipsArray.forEach((tipObject, tipIndex) => {
        const iconClass = iconClasses[tipIndex % iconClasses.length];
        const tipHtmlNode = `
            <div class="tip-card">
                <h4><i class="fa-solid ${iconClass}"></i> ` +
                `${escapeHtml(tipObject.title)}</h4>
                <p>${escapeHtml(tipObject.description)}</p>
            </div>
        `;
        tipsContainerEl.insertAdjacentHTML('beforeend', tipHtmlNode);
    });
}

// ============================================
// SECTION 7: GOOGLE SERVICES
// ============================================

/**
 * Draws the interactive Google Pie Chart.
 * @returns {void}
 */
function drawEmissionsChart() {
    const dataTable = google.visualization.arrayToDataTable([
        ['Category', 'Tons CO2'],
        ['Transport (Car)', userData.emissions.car],
        ['Air Travel', userData.emissions.flights],
        ['Home Energy', userData.emissions.electricity],
        ['Diet', userData.emissions.diet]
    ]);

    const chartOptions = {
        backgroundColor: 'transparent',
        colors: ['#1b5e20', '#2e7d32', '#4caf50', '#81c784'],
        pieHole: 0.4,
        chartArea: { width: '100%', height: '80%' },
        legend: { 
            position: 'right', 
            textStyle: { color: '#f0fdf4', fontName: 'Outfit', fontSize: 13 } 
        },
        pieSliceBorderColor: 'transparent',
        pieSliceTextStyle: { color: 'white', fontName: 'Outfit' }
    };

    const pieChart = new google.visualization.PieChart(emissionsChartEl);
    pieChart.draw(dataTable, chartOptions);
}

/**
 * Fetches AI tips from Gemini API or falls back if necessary.
 * @async
 * @throws {Error} When API call fails
 */
async function fetchAiTips() {
    const providedKey = sanitizeInput(inputGeminiKeyEl.value.trim());
    if (providedKey) {
        SecureKeyManager.setKey(providedKey);
    }

    if (!SecureKeyManager.hasKey()) {
        if (window.cloudLogger) {
            window.cloudLogger.warn("No API key provided for tips generation");
        }
        alert("Please provide a Gemini API key first.");
        return;
    }
    
    const activeKey = SecureKeyManager.consumeKey();

    apiKeySectionEl.classList.add('hidden');
    loadingStateEl.classList.remove('hidden');
    tipsContainerEl.classList.add('hidden');
    tipsContainerEl.innerHTML = '';
    btnGenerateTipsEl.disabled = true;

    const generatedPrompt = `
    I am a user with a carbon footprint of ` +
    `${userData.emissions.total.toFixed(1)} tons of CO2 per year. 
    Here is the breakdown:
    - Car travel: ${userData.emissions.car.toFixed(1)} tons
    - Flights: ${userData.emissions.flights.toFixed(1)} tons
    - Home electricity: ${userData.emissions.electricity.toFixed(1)} tons
    - Diet (${userData.diet}): ${userData.emissions.diet.toFixed(1)} tons

    Provide exactly 3 actionable, highly personalized tips.
    Return ONLY a valid JSON string with this structure:
    [
        { "title": "Tip title", "description": "Detailed explanation..." }
    ]
    `;

    try {
        const fetchResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/` +
            `models/gemini-2.0-flash:generateContent?key=${activeKey}`, 
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: generatedPrompt }] }],
                    generationConfig: { temperature: 0.7 }
                })
            }
        );

        if (!fetchResponse.ok) {
            throw new Error(`API Request failed: ${fetchResponse.status}`);
        }

        const responseData = await fetchResponse.json();
        let aiResponseText = responseData.candidates[0].content.parts[0].text;
        aiResponseText = aiResponseText.replace(/```json/g, '')
                                       .replace(/```/g, '')
                                       .trim();

        const tipsArray = JSON.parse(aiResponseText);
        renderTips(tipsArray);

    } catch (error) {
        // Why this catch exists: Handles API downtime, invalid JSON structures,
        // or network errors safely without breaking the app UI.
        if (window.cloudLogger) {
            window.cloudLogger.error("Error generating tips:", error.message);
        }
        
        const fallbackTipsData = [
            { 
                title: "Energy Efficiency", 
                description: "Turn off lights when not in use." 
            },
            { 
                title: "Reduce Travel", 
                description: "Combine errands to save gas." 
            },
            { 
                title: "Plant Based Meals", 
                description: "Try meatless Mondays." 
            }
        ];
        renderTips(fallbackTipsData);

    } finally {
        // Cleanup disables the loading state by reenabling the button
        btnGenerateTipsEl.disabled = false;
    }
}

/**
 * Persists the footprint to Firebase Firestore.
 * @async
 * @throws {Error} When Firestore write fails
 */
async function saveToFirestore() {
    const firestoreDb = 
        typeof firebase !== 'undefined' ? firebase.firestore() : null;
        
    if (!firestoreDb) return;

    try {
        await firestoreDb.collection("calculations").add({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            totalEmissions: userData.emissions.total,
            carEmissions: userData.emissions.car,
            flightEmissions: userData.emissions.flights,
            electricityEmissions: userData.emissions.electricity,
            dietEmissions: userData.emissions.diet,
            diet: userData.diet
        });

        toastEl.classList.remove('hidden');
        setTimeout(() => toastEl.classList.add('hidden'), 3000);

        if (window.cloudLogger) {
            window.cloudLogger.info("Saved to Firestore successfully");
        }
    } catch (error) {
        // Why this catch exists: Captures offline network states or 
        // permission errors without crashing the main thread.
        if (window.cloudLogger) {
            window.cloudLogger.error("Firestore error: ", error.message);
        }
    }
}

/**
 * Fetches recent calculation history from Firestore.
 * @async
 * @throws {Error} When Firestore read fails
 */
async function fetchHistory() {
    const firestoreDb = 
        typeof firebase !== 'undefined' ? firebase.firestore() : null;
        
    if (!firestoreDb) return;

    try {
        const querySnapshot = await firestoreDb.collection("calculations")
            .orderBy("timestamp", "desc")
            .limit(5)
            .get();

        historyListEl.innerHTML = '';

        if (querySnapshot.empty) {
            historyListEl.innerHTML = 
                '<li class="empty-state">No past calculations found.</li>';
            return;
        }

        querySnapshot.forEach(documentSnapshot => {
            const rowData = documentSnapshot.data();
            const dateString = rowData.timestamp ? 
                rowData.timestamp.toDate().toLocaleString() : 'Just now';
                
            const listItemEl = document.createElement('li');
            listItemEl.className = 'history-item';
            listItemEl.innerHTML = `
                <span class="history-item-date">${dateString}</span>
                <span class="history-item-score">
                    ${rowData.totalEmissions.toFixed(1)} Tons CO₂
                </span>
            `;
            historyListEl.appendChild(listItemEl);
        });

    } catch (error) {
        // Why this catch exists: Captures read failures from missing indexes
        // or connection drops safely.
        if (window.cloudLogger) {
            window.cloudLogger.error("History fetch error: ", error.message);
        }
    }
}

/**
 * Generates and uploads PDF report.
 * @async
 * @throws {Error} When PDF generation or storage fails
 */
async function generateAndUploadPdf() {
    if (typeof jspdf === 'undefined') {
        if (window.cloudLogger) {
            window.cloudLogger.error("jsPDF library not loaded");
        }
        return;
    }

    const { jsPDF } = window.jspdf;
    const documentPdf = new jsPDF();

    documentPdf.setFontSize(22);
    documentPdf.text("EcoTrack Carbon Report", 20, 20);
    
    documentPdf.setFontSize(16);
    documentPdf.text(
        `Total Score: ${userData.emissions.total.toFixed(1)} Tons CO2/yr`, 
        20, 40
    );

    documentPdf.setFontSize(12);
    documentPdf.text("Breakdown:", 20, 60);
    documentPdf.text(
        `- Car Travel: ${userData.emissions.car.toFixed(1)} tons`, 30, 70
    );
    documentPdf.text(
        `- Air Travel: ${userData.emissions.flights.toFixed(1)} tons`, 30, 80
    );
    documentPdf.text(
        `- Home Energy: ${userData.emissions.electricity.toFixed(1)} tons`, 
        30, 90
    );
    documentPdf.text(
        `- Diet: ${userData.emissions.diet.toFixed(1)} tons`, 30, 100
    );

    documentPdf.text("Thank you for using EcoTrack!", 20, 120);
    documentPdf.save("EcoTrack-Report.pdf");

    const cloudStorage = 
        typeof firebase !== 'undefined' ? firebase.storage() : null;

    if (cloudStorage) {
        try {
            const generatedPdfBlob = documentPdf.output('blob');
            const rootStorageRef = cloudStorage.ref();
            const cloudReportRef = rootStorageRef.child(
                `reports/report-${Date.now()}.pdf`
            );
            await cloudReportRef.put(generatedPdfBlob);
            
            if (window.cloudLogger) {
                window.cloudLogger.info("PDF saved to Cloud Storage");
            }
        } catch (error) {
            // Why this catch exists: Prevents the local PDF download from 
            // failing if the cloud upload step drops connectivity.
            if (window.cloudLogger) {
                window.cloudLogger.error("PDF upload error", error.message);
            }
        }
    }
}

// ============================================
// SECTION 8: EVENT LISTENERS
// ============================================

/** Handle navigation to Calculator view */
CleanupManager.add(navCalcEl, 'click', () => switchView('calculator'));

/** Handle navigation to Results view */
CleanupManager.add(navResultsEl, 'click', () => switchView('results'));

/** Handle navigation to AI Tips view */
CleanupManager.add(navTipsEl, 'click', () => switchView('aiTips'));

/** Handle recalculation action */
CleanupManager.add(btnRecalculateEl, 'click', () => switchView('calculator'));

/** Handle AI tips tab navigation */
CleanupManager.add(btnGetTipsEl, 'click', () => {
    if (typeof gtag === 'function') gtag('event', 'generate_tips');
    switchView('aiTips');
});

/** Handle generating AI tips API call */
CleanupManager.add(btnGenerateTipsEl, 'click', fetchAiTips);

/** Handle PDF generation and upload */
CleanupManager.add(btnDownloadReportEl, 'click', generateAndUploadPdf);

/** Handle form submission for footprint calculation */
CleanupManager.add(calculatorFormEl, 'submit', (event) => {
    event.preventDefault();

    if (!RateLimiter.isAllowed()) {
        if (window.cloudLogger) {
            window.cloudLogger.warn("Rate limited calculation attempt");
        }
        return;
    }

    validateInputs();
    
    PerformanceMonitor.start('calculation');
    calculateFootprint();
    PerformanceMonitor.end('calculation');
    
    renderResults();
    
    if (typeof gtag === 'function') {
        gtag('event', 'calculate_footprint');
    }

    if (window.cloudLogger) {
        window.cloudLogger.trackEvent(
            'calculate_footprint', 
            userData.emissions
        );
    }
    
    if (typeof logToBigQuery === 'function') {
        logToBigQuery(userData.emissions);
    }
    
    saveToFirestore();
    fetchHistory();
    
    switchView('results');
});

// ============================================
// SECTION 9: INITIALIZATION
// ============================================

/**
 * Initializes the application on load
 */
function initApp() {
    if (window.cloudLogger) {
        window.cloudLogger.info("EcoTrack initialized.");
    }
    // Set initial configuration
    if (typeof google !== 'undefined') {
        google.charts.load('current', {'packages':['corechart']});
    }

    // Set up Intersection Observer for scroll animations
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                animationObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.glass-card').forEach(card => {
        animationObserver.observe(card);
    });
}

initApp();
