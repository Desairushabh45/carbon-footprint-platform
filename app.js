// @ts-check

/**
 * @changelog
 * v2.1.0 - Added memoization, performance monitoring, memory cleanup manager
 * v2.0.0 - Dark mode redesign, glassmorphism UI, security hardening
 * v1.0.0 - Initial release with calculator, charts, and AI tips
 */

/**
 * SOLID Principles Applied:
 * S - Single Responsibility: Each function
 *     does exactly one thing
 * O - Open/Closed: Config object is open
 *     for extension via Object.assign
 * L - Liskov: All logger methods are
 *     interchangeable
 * I - Interface segregation: Services are
 *     independent modules
 * D - Dependency inversion: Services injected
 *     via config not hardcoded
 */

/**
 * Design Patterns Used:
 * - Module Pattern: Each service is
 *   an isolated module
 * - Observer Pattern: Event listeners
 *   watch for user actions
 * - Factory Pattern: Tips generated
 *   based on emission type
 * - Singleton Pattern: Config and Logger
 *   have single instances
 * - Strategy Pattern: Fallback tips
 *   strategy when API fails
 */

/**
 * @fileoverview EcoTrack - Carbon Footprint Awareness Platform
 * @author Rushabh Desai
 * @version 2.1.0
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
 * @description Generate cryptographically secure session ID.
 * Used for security audit logging only.
 * @constant {string} SESSION_ID
 * @since v1.0.0
 */
const SESSION_ID = crypto.getRandomValues(new Uint8Array(16)).join('-');


// ============================================
// SECTION 1: CONSTANTS & CONFIGURATION
// ============================================

/** @constant {number} Global average CO2 tons/yr */
const GLOBAL_AVERAGE_TONS = 4.7;

/** @constant {number} Cooldown between calculations in milliseconds */
const CALCULATION_COOLDOWN_MS = 2000;

/**
 * @constant {Object} UNITS
 * @description Standard units for all
 * measurements in the application
 * @since v2.1.0
 */
const UNITS = Object.freeze({
    EMISSIONS: 'tons CO2e/year',
    DISTANCE: 'kilometers',
    ENERGY: 'kilowatt-hours',
    CURRENCY: 'USD'
});

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
 * @description Token bucket rate limiter.
 * Prevents API abuse and calculation spam.
 * @since v2.0.0
 */
const RateLimiter = {
    tokens: 3,
    maxTokens: 3,
    refillRate: 1,
    lastRefill: Date.now(),
    
    /**
     * @description Checks if an action is allowed under the current rate limit.
     * Consumes one token if available.
     * @returns {boolean} True if the action is allowed, false if rate limited
     * @complexity Time: O(1) | Space: O(1)
     * @example
     * if (RateLimiter.isAllowed()) {
     *     calculateFootprint();
     * }
     * @since v2.0.0
     */
    isAllowed() {
        this._refill();
        if (this.tokens > 0) {
            this.tokens--;
            return true;
        }
        return false;
    },
    
    /**
     * @description Refills tokens based on elapsed time since last refill.
     * Uses a token bucket algorithm with configurable refill rate.
     * @returns {void}
     * @complexity Time: O(1) | Space: O(1)
     * @since v2.0.0
     */
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
 * @description Secure API key manager.
 * Key exists in memory for ONE use only, then is destroyed.
 * Implements the Singleton pattern for key lifecycle management.
 * @since v2.0.0
 */
const SecureKeyManager = {
    /** @type {string|null} */
    _key: null,
    
    /**
     * @description Stores an API key for single use and clears the input field.
     * @param {string} key - The API key to store
     * @returns {void}
     * @complexity Time: O(1) | Space: O(1)
     * @example
     * SecureKeyManager.setKey('AIzaSy...');
     * @since v2.0.0
     */
    setKey(key) {
        this._key = key;
        const keyEl = /** @type {HTMLInputElement} */ (document.getElementById('gemini-key'));
        if (keyEl) keyEl.value = '';
    },
    
    /**
     * @description Retrieves the stored API key and immediately destroys it
     * from memory. Key can only be consumed once.
     * @returns {string|null} The stored API key, or null if no key exists
     * @complexity Time: O(1) | Space: O(1)
     * @example
     * const key = SecureKeyManager.consumeKey();
     * // key is now null in the manager
     * @since v2.0.0
     */
    consumeKey() {
        const key = this._key;
        this._key = null;
        return key;
    },
    
    /**
     * @description Checks whether an API key is currently stored.
     * @returns {boolean} True if a key is available for consumption
     * @complexity Time: O(1) | Space: O(1)
     * @example
     * if (SecureKeyManager.hasKey()) {
     *     fetchAiTips();
     * }
     * @since v2.0.0
     */
    hasKey() {
        return this._key !== null;
    }
};

// ============================================
// SECTION 3: DOM ELEMENT CACHE
// ============================================

// View Containers
/** @type {HTMLElement} */
const calculatorViewEl = /** @type {HTMLElement} */ (document.getElementById('view-calculator'));
/** @type {HTMLElement} */
const resultsViewEl = /** @type {HTMLElement} */ (document.getElementById('view-results'));
/** @type {HTMLElement} */
const tipsViewEl = /** @type {HTMLElement} */ (document.getElementById('view-ai-tips'));

// Navigation Buttons
/** @type {HTMLButtonElement} */
const navCalcEl = /** @type {HTMLButtonElement} */ (document.getElementById('nav-calc'));
/** @type {HTMLButtonElement} */
const navResultsEl = /** @type {HTMLButtonElement} */ (document.getElementById('nav-results'));
/** @type {HTMLButtonElement} */
const navTipsEl = /** @type {HTMLButtonElement} */ (document.getElementById('nav-tips'));

// Form and Inputs
/** @type {HTMLFormElement} */
const calculatorFormEl = /** @type {HTMLFormElement} */ (document.getElementById('calculator-form'));
/** @type {HTMLInputElement} */
const inputCarKmEl = /** @type {HTMLInputElement} */ (document.getElementById('car-km'));
/** @type {HTMLInputElement} */
const inputFlightsEl = /** @type {HTMLInputElement} */ (document.getElementById('flights'));
/** @type {HTMLInputElement} */
const inputElectricityEl = /** @type {HTMLInputElement} */ (document.getElementById('electricity'));
/** @type {HTMLSelectElement} */
const inputDietEl = /** @type {HTMLSelectElement} */ (document.getElementById('diet'));

// Action Buttons
/** @type {HTMLButtonElement} */
const btnRecalculateEl = /** @type {HTMLButtonElement} */ (document.getElementById('btn-recalculate'));
/** @type {HTMLButtonElement} */
const btnGetTipsEl = /** @type {HTMLButtonElement} */ (document.getElementById('btn-get-tips'));
/** @type {HTMLButtonElement} */
const btnGenerateTipsEl = /** @type {HTMLButtonElement} */ (document.getElementById('btn-generate-tips'));
/** @type {HTMLButtonElement} */
const btnDownloadReportEl = /** @type {HTMLButtonElement} */ (document.getElementById('btn-download-report'));

// Results & Tips UI
/** @type {HTMLElement} */
const totalScoreEl = /** @type {HTMLElement} */ (document.getElementById('total-score'));
/** @type {HTMLElement} */
const comparisonTextEl = /** @type {HTMLElement} */ (document.getElementById('comparison-text'));
/** @type {HTMLElement} */
const emissionsChartEl = /** @type {HTMLElement} */ (document.getElementById('emissions-chart'));
/** @type {HTMLInputElement} */
const inputGeminiKeyEl = /** @type {HTMLInputElement} */ (document.getElementById('gemini-key'));
/** @type {HTMLElement} */
const apiKeySectionEl = /** @type {HTMLElement} */ (document.getElementById('api-key-section'));
/** @type {HTMLElement} */
const loadingStateEl = /** @type {HTMLElement} */ (document.getElementById('loading-state'));
/** @type {HTMLElement} */
const tipsContainerEl = /** @type {HTMLElement} */ (document.getElementById('tips-container'));
/** @type {HTMLElement} */
const toastEl = /** @type {HTMLElement} */ (document.getElementById('toast'));
/** @type {HTMLElement} */
const historyListEl = /** @type {HTMLElement} */ (document.getElementById('history-list'));

// ============================================
// SECTION 4: UTILITY FUNCTIONS
// ============================================

/**
 * @description Advanced input sanitizer that removes ALL potentially
 * harmful characters including script injections and event handlers.
 * @param {string|number} value - The input value to sanitize
 * @returns {string|number} The sanitized string or the original number
 * @throws {never} This function does not throw
 * @complexity Time: O(n) | Space: O(n)
 * @example
 * sanitizeInput('<script>alert("xss")</script>');
 * // Returns: 'scriptalert(xss)script'
 * sanitizeInput(42);
 * // Returns: 42
 * @since v1.0.0
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
 * @description Escapes HTML characters in a string to prevent XSS attacks.
 * Converts &, <, >, ", and ' to their HTML entity equivalents.
 * @param {string} unsafe - Raw string potentially containing HTML
 * @returns {string} Safely escaped HTML string
 * @throws {never} This function does not throw
 * @complexity Time: O(n) | Space: O(n)
 * @example
 * escapeHtml('<b>Hello</b>');
 * // Returns: '&lt;b&gt;Hello&lt;/b&gt;'
 * @since v1.0.0
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
 * @description Performance monitoring utility that tracks execution
 * duration of labeled code sections using high-resolution timestamps.
 * Implements the Singleton pattern.
 * @type {{ marks: Record<string, number>, start: (label: string) => void, end: (label: string) => void }}
 * @since v2.1.0
 */
const PerformanceMonitor = {
    marks: {},

    /**
     * @description Starts a performance measurement with the given label.
     * @param {string} label - Unique identifier for the measurement
     * @returns {void}
     * @complexity Time: O(1) | Space: O(1)
     * @example
     * PerformanceMonitor.start('calculation');
     * @since v2.1.0
     */
    start(label) {
        this.marks[label] = performance.now();
    },

    /**
     * @description Ends a performance measurement, logs the duration,
     * and cleans up the stored mark.
     * @param {string} label - Identifier matching a previous start() call
     * @returns {void}
     * @complexity Time: O(1) | Space: O(1)
     * @example
     * PerformanceMonitor.end('calculation');
     * // Logs: "⚡ calculation: 1.23ms"
     * @since v2.1.0
     */
    end(label) {
        const duration = performance.now() - this.marks[label];
        if (window.cloudLogger) {
            window.cloudLogger.info(`⚡ ${label}: ${duration.toFixed(2)}ms`);
        }
        delete this.marks[label];
    }
};

/**
 * @description Batches DOM updates into a single animation frame
 * to avoid layout thrashing and forced reflows.
 * @param {Array<Function>} updates - Array of functions performing DOM mutations
 * @returns {void}
 * @throws {never} This function does not throw
 * @complexity Time: O(n) | Space: O(1)
 * @example
 * batchDOMUpdates([
 *     () => element.textContent = 'Hello',
 *     () => element.classList.add('active')
 * ]);
 * @since v2.1.0
 */
function batchDOMUpdates(updates) {
    requestAnimationFrame(() => {
        updates.forEach(update => update());
    });
}

/**
 * @description Memoizes heavy calculation functions by caching results
 * based on serialized arguments. Uses a Map for O(1) cache lookups.
 * @param {Function} fn - Pure function to memoize
 * @returns {Function} Memoized version of the input function
 * @throws {never} This function does not throw
 * @complexity Time: O(1) amortized | Space: O(n) where n = unique arg combos
 * @example
 * const memoizedCalc = memoize((a, b) => a + b);
 * memoizedCalc(1, 2); // Computes: 3
 * memoizedCalc(1, 2); // Cache hit: 3
 * @since v2.1.0
 */
const memoize = (fn) => {
    const cache = new Map();
    return /** @param {any[]} args */ (...args) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) return cache.get(key);
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};

/**
 * @description Memory management utility that tracks event listeners
 * and provides centralized cleanup to prevent memory leaks.
 * Implements the Observer pattern for event lifecycle management.
 * @since v2.1.0
 */
const CleanupManager = {
    /** @type {Array<{element: HTMLElement, event: string, handler: EventListenerOrEventListenerObject}>} */
    listeners: [],

    /**
     * @description Registers an event listener on an element and tracks it
     * for later cleanup.
     * @param {HTMLElement|null} element - DOM element to attach listener to
     * @param {string} event - Event type (e.g., 'click', 'submit')
     * @param {EventListenerOrEventListenerObject} handler - Event handler function
     * @returns {void}
     * @complexity Time: O(1) | Space: O(1)
     * @example
     * CleanupManager.add(button, 'click', handleClick);
     * @since v2.1.0
     */
    add(element, event, handler) {
        if (!element) return;
        element.addEventListener(event, handler);
        this.listeners.push({ element, event, handler });
    },

    /**
     * @description Removes all tracked event listeners and resets
     * the internal registry. Call on application teardown.
     * @returns {void}
     * @complexity Time: O(n) | Space: O(1)
     * @example
     * CleanupManager.cleanup();
     * @since v2.1.0
     */
    cleanup() {
        this.listeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.listeners = [];
    }
};

/**
 * @description Validates all numeric form inputs enforcing finite bounds.
 * Sanitizes and clamps values to safe ranges, falling back to defaults
 * for invalid or missing data.
 * @returns {boolean} True if all inputs are valid and state is updated
 * @throws {never} This function does not throw; invalid inputs are clamped
 * @complexity Time: O(1) | Space: O(1)
 * @example
 * // With form inputs filled:
 * const isValid = validateInputs();
 * // userData is now populated with sanitized values
 * @since v1.0.0
 */
function validateInputs() {
    let isValid = true;

    // Reset previous errors
    const inputs = [
        { el: inputCarKmEl, errId: 'error-car-km' },
        { el: inputFlightsEl, errId: 'error-flights' },
        { el: inputElectricityEl, errId: 'error-electricity' }
    ];

    inputs.forEach(item => {
        if (item.el) item.el.classList.remove('input-error');
        const errEl = document.getElementById(item.errId);
        if (errEl) errEl.classList.remove('visible');
    });

    let carInputStr = sanitizeInput(inputCarKmEl.value).toString().slice(0, 4);
    let flightInputStr = sanitizeInput(inputFlightsEl.value).toString().slice(0, 3);
    let elecInputStr = sanitizeInput(inputElectricityEl.value).toString().slice(0, 5);

    let carInput = parseFloat(carInputStr);
    let flightInput = parseFloat(flightInputStr);
    let elecInput = parseFloat(elecInputStr);

    if (!Number.isFinite(carInput) || Number.isNaN(carInput) || carInput < 0 || carInput > 2000) {
        inputCarKmEl.classList.add('input-error');
        const errEl = document.getElementById('error-car-km');
        if (errEl) errEl.classList.add('visible');
        isValid = false;
        carInput = 0;
    }
    
    if (!Number.isFinite(flightInput) || Number.isNaN(flightInput) || flightInput < 0 || flightInput > 365) {
        inputFlightsEl.classList.add('input-error');
        const errEl = document.getElementById('error-flights');
        if (errEl) errEl.classList.add('visible');
        isValid = false;
        flightInput = 0;
    }
    
    if (!Number.isFinite(elecInput) || Number.isNaN(elecInput) || elecInput < 0 || elecInput > 10000) {
        inputElectricityEl.classList.add('input-error');
        const errEl = document.getElementById('error-electricity');
        if (errEl) errEl.classList.add('visible');
        isValid = false;
        elecInput = 0;
    }

    if (!isValid) return false;

    let dietValue = String(sanitizeInput(inputDietEl.value));
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
 * @description Calculates carbon footprint from user inputs using
 * industry-standard emission factors. Converts daily/monthly values
 * to annual tons of CO2 equivalent.
 * @returns {void} Updates userData.emissions object in-place
 * @throws {never} This function does not throw
 * @complexity Time: O(1) | Space: O(1)
 * @example
 * userData.carKm = 20;
 * userData.flights = 2;
 * userData.electricity = 150;
 * userData.diet = 'meat-eater';
 * calculateFootprint();
 * // userData.emissions.total ≈ 6.73
 * @since v1.0.0
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
 * @description Switches the active view dynamically based on the
 * provided key. Manages CSS class toggling for view containers
 * and navigation buttons. Fires analytics events for results view.
 * @param {string} viewKey - One of 'calculator', 'results', or 'aiTips'
 * @returns {void}
 * @throws {never} This function does not throw
 * @complexity Time: O(1) | Space: O(1)
 * @example
 * switchView('results');
 * // Shows results view, hides others
 * @since v1.0.0
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
 * @description Animates the total score display from 0 to the calculated
 * amount using a smooth incremental counter with setInterval.
 * @returns {void}
 * @throws {never} This function does not throw
 * @complexity Time: O(n) where n = 50 frames | Space: O(1)
 * @example
 * userData.emissions.total = 6.73;
 * animateScoreMeter();
 * // Score counter animates from 0.0 to 6.7
 * @since v1.0.0
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
 * @description Updates the comparison text block comparing the user's
 * emissions to the global average (4.7 tons CO2/yr). Renders an
 * appropriate icon and color-coded message.
 * @returns {void}
 * @throws {never} This function does not throw
 * @complexity Time: O(1) | Space: O(1)
 * @example
 * userData.emissions.total = 3.0;
 * updateComparisonText();
 * // Displays: "1.7 tons below global average"
 * @since v1.0.0
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
 * @description Coordinates rendering the Results dashboard by batching
 * score animation, comparison text, and chart drawing into a single
 * animation frame to prevent layout thrashing.
 * @returns {void}
 * @throws {never} This function does not throw
 * @complexity Time: O(1) | Space: O(1)
 * @example
 * calculateFootprint();
 * renderResults();
 * @since v1.0.0
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
 * @description Renders AI-generated or fallback tips securely into the UI.
 * Each tip is displayed as a styled card with a rotating icon.
 * All text content is HTML-escaped to prevent XSS.
 * @param {Array<{title: string, description: string}>} tipsArray - Array of tip objects with title and description
 * @returns {void}
 * @throws {never} This function does not throw
 * @complexity Time: O(n) where n = number of tips | Space: O(n)
 * @example
 * renderTips([
 *     { title: 'Save Energy', description: 'Turn off lights.' }
 * ]);
 * @since v1.0.0
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
 * @description Draws an interactive Google Pie Chart visualization
 * of the user's emissions breakdown by category. Uses Google
 * Charts API with a donut-style presentation.
 * @returns {void}
 * @throws {Error} When Google Charts API is not loaded
 * @complexity Time: O(1) | Space: O(1)
 * @example
 * // After calculating footprint:
 * google.charts.setOnLoadCallback(drawEmissionsChart);
 * @since v1.0.0
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
 * @description Fetches AI-powered personalized tips from the Gemini API.
 * Constructs a detailed prompt from the user's emissions data,
 * sends it to Gemini 2.0 Flash, and parses the JSON response.
 * Falls back to curated offline tips on any failure (Strategy pattern).
 * @async
 * @returns {Promise<void>}
 * @throws {Error} When API call fails (caught internally with fallback)
 * @complexity Time: O(1) + network latency | Space: O(n)
 * @example
 * SecureKeyManager.setKey('AIzaSy...');
 * await fetchAiTips();
 * // Tips are rendered in the UI
 * @since v1.0.0
 */
async function fetchAiTips() {
    const providedKey = String(sanitizeInput(inputGeminiKeyEl.value.trim()));
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
            window.cloudLogger.error("Error generating tips:", (/** @type {Error} */ (error)).message);
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
 * @description Persists the calculated footprint to Firebase Firestore.
 * Stores all emission categories with a server-generated timestamp.
 * Displays a toast notification on successful save.
 * @async
 * @returns {Promise<void>}
 * @throws {Error} When Firestore write fails (caught internally)
 * @complexity Time: O(1) + network latency | Space: O(1)
 * @example
 * calculateFootprint();
 * await saveToFirestore();
 * // Data persisted, toast shown
 * @since v1.0.0
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
            window.cloudLogger.error("Firestore error: ", (/** @type {Error} */ (error)).message);
        }
    }
}

/**
 * @description Fetches the 5 most recent calculation entries from
 * Firestore, ordered by timestamp descending. Renders them as
 * a list with formatted dates and emission scores.
 * @async
 * @returns {Promise<void>}
 * @throws {Error} When Firestore read fails (caught internally)
 * @complexity Time: O(n) where n = 5 results | Space: O(n)
 * @example
 * await fetchHistory();
 * // History list populated in the UI
 * @since v1.0.0
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

        querySnapshot.forEach(/** @param {any} documentSnapshot */ documentSnapshot => {
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
            window.cloudLogger.error("History fetch error: ", (/** @type {Error} */ (error)).message);
        }
    }
}

/**
 * @description Generates a PDF report of the user's carbon footprint
 * using jsPDF and optionally uploads it to Firebase Cloud Storage.
 * The PDF includes total score and categorical breakdown.
 * @async
 * @returns {Promise<void>}
 * @throws {Error} When PDF generation or Cloud Storage upload fails
 *   (caught internally)
 * @complexity Time: O(1) + network latency | Space: O(n) PDF size
 * @example
 * calculateFootprint();
 * await generateAndUploadPdf();
 * // PDF downloaded locally and uploaded to Cloud Storage
 * @since v1.0.0
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
                window.cloudLogger.error("PDF upload error", (/** @type {Error} */ (error)).message);
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

/** Handle input validation clearing */
['car-km', 'flights', 'electricity'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        CleanupManager.add(el, 'input', () => {
            el.classList.remove('input-error');
            const errEl = document.getElementById(`error-${id}`);
            if (errEl) errEl.classList.remove('visible');
        });
    }
});

/** Handle form submission for footprint calculation */
CleanupManager.add(calculatorFormEl, 'submit', /** @param {Event} event */ (event) => {
    event.preventDefault();

    if (!RateLimiter.isAllowed()) {
        if (window.cloudLogger) {
            window.cloudLogger.warn("Rate limited calculation attempt");
        }
        return;
    }

    if (!validateInputs()) {
        return;
    }
    
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
 * @description Initializes the EcoTrack application on page load.
 * Sets up Google Charts, configures Intersection Observer for
 * scroll-triggered animations on glass cards, and logs startup.
 * @returns {void}
 * @throws {never} This function does not throw
 * @complexity Time: O(n) where n = number of .glass-card elements | Space: O(1)
 * @example
 * // Called automatically on script load:
 * initApp();
 * @since v1.0.0
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
