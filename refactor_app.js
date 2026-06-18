const fs = require('fs');

let content = fs.readFileSync('app.js', 'utf8');

// Header
content = content.replace(
  /@version 2\.1\.0/,
  `@module app.js\n * @author Rushabh Desai\n * @license MIT\n * @version 2.1.0`
);

// Add missing constants
const constantsStr = `
const ANIMATION = Object.freeze({
  SCORE_INTERVAL_MS: 20,
  SCORE_STEPS: 50,
  BAR_DELAY_MS: 100
});

const IMPACT_FACTORS = Object.freeze({
  TREES_PER_TON: 45,
  KM_PER_TON: 6000,
  SMARTPHONES_PER_TON: 121000,
  COST_PER_TON_USD: 15
});

const BENCHMARKS = Object.freeze({
  INDIA_AVERAGE: 1.9,
  GLOBAL_AVERAGE: 4.7,
  PARIS_TARGET: 2.0,
  USA_AVERAGE: 14.2
});

const PLEDGE_FACTORS = Object.freeze({
  CAR_REDUCTION: 0.20,
  ENERGY_REDUCTION: 0.80
});

const VIEWS = Object.freeze({
  CALCULATOR: 'calculator',
  RESULTS: 'results',
  AI_TIPS: 'aiTips'
});

const DB_COLLECTIONS = Object.freeze({
  CALCULATIONS: 'calculations'
});

const PDF_STRINGS = Object.freeze({
  TITLE: 'EcoTrack Carbon Report',
  SUBTITLE: 'Your Personal Carbon Footprint'
});

const CONFETTI = Object.freeze({
  PARTICLE_COUNT: 100,
  SPREAD: 70,
  ORIGIN_Y: 0.6
});

const DIET_TYPES = Object.freeze({
  VEGAN: 'vegan',
  VEGETARIAN: 'vegetarian',
  MEAT_EATER: 'meat-eater'
});
`;
content = content.replace(/\/\/ ============================================\n\/\/ SECTION 1: CONSTANTS & CONFIGURATION/, `// ============================================\n// SECTION 1: CONSTANTS & CONFIGURATION\n// ============================================\n${constantsStr}`);

// Replace specific dictionary keys first
content = content.replace(/vegan: 1\.5/g, '[DIET_TYPES.VEGAN]: 1.5');
content = content.replace(/vegetarian: 1\.7/g, '[DIET_TYPES.VEGETARIAN]: 1.7');
content = content.replace(/'meat-eater': 3\.3/g, '[DIET_TYPES.MEAT_EATER]: 3.3');
content = content.replace(/"meat-eater": 3\.3/g, '[DIET_TYPES.MEAT_EATER]: 3.3');

// Replace all magic numbers & strings
content = content.replace(/\b45\b/g, 'IMPACT_FACTORS.TREES_PER_TON');
content = content.replace(/\b6000\b/g, 'IMPACT_FACTORS.KM_PER_TON');
content = content.replace(/\b121000\b/g, 'IMPACT_FACTORS.SMARTPHONES_PER_TON');
content = content.replace(/\b15\b/g, 'IMPACT_FACTORS.COST_PER_TON_USD');
content = content.replace(/\b1\.9\b/g, 'BENCHMARKS.INDIA_AVERAGE');
content = content.replace(/\b4\.7\b/g, 'BENCHMARKS.GLOBAL_AVERAGE');
content = content.replace(/\b2\.0\b/g, 'BENCHMARKS.PARIS_TARGET');
content = content.replace(/\b14\.2\b/g, 'BENCHMARKS.USA_AVERAGE');
content = content.replace(/\b0\.20\b/g, 'PLEDGE_FACTORS.CAR_REDUCTION');
content = content.replace(/\b0\.80\b/g, 'PLEDGE_FACTORS.ENERGY_REDUCTION');

content = content.replace(/\b50\b/g, 'ANIMATION.SCORE_STEPS');
content = content.replace(/\b20\b/g, 'ANIMATION.SCORE_INTERVAL_MS');
content = content.replace(/particleCount: 100/g, 'particleCount: CONFETTI.PARTICLE_COUNT');
content = content.replace(/\b70\b/g, 'CONFETTI.SPREAD');
content = content.replace(/\b0\.6\b/g, 'CONFETTI.ORIGIN_Y');

content = content.replace(/'calculator'/g, 'VIEWS.CALCULATOR');
content = content.replace(/'results'/g, 'VIEWS.RESULTS');
content = content.replace(/'aiTips'/g, 'VIEWS.AI_TIPS');
content = content.replace(/"calculations"/g, 'DB_COLLECTIONS.CALCULATIONS');
content = content.replace(/"EcoTrack Carbon Report"/g, 'PDF_STRINGS.TITLE');

content = content.replace(/'meat-eater'/g, 'DIET_TYPES.MEAT_EATER');
content = content.replace(/'vegan'/g, 'DIET_TYPES.VEGAN');
content = content.replace(/'vegetarian'/g, 'DIET_TYPES.VEGETARIAN');
content = content.replace(/"meat-eater"/g, 'DIET_TYPES.MEAT_EATER');
content = content.replace(/"vegan"/g, 'DIET_TYPES.VEGAN');
content = content.replace(/"vegetarian"/g, 'DIET_TYPES.VEGETARIAN');

// Fix VALID_DIETS to not have string quotes around constants
content = content.replace(/\['DIET_TYPES\.VEGAN', 'DIET_TYPES\.VEGETARIAN', 'DIET_TYPES\.MEAT_EATER'\]/g, '[DIET_TYPES.VEGAN, DIET_TYPES.VEGETARIAN, DIET_TYPES.MEAT_EATER]');

// Replace inputCarKmEl -> inputCarEl
content = content.replace(/inputCarKmEl/g, 'inputCarEl');
// Replace pieChart -> emissionsChartEl
content = content.replace(/const pieChart/g, 'const emissionsChartEl_shadow');
content = content.replace(/pieChart\.draw/g, 'emissionsChartEl_shadow.draw');

// DRY: getFirestoreInstance
content = content.replace(/function sanitizeInput/g, 
`/**
 * Gets Firestore instance safely
 * @returns {Object|null} Firestore instance
 * @complexity Time: O(1) | Space: O(1)
 */
function getFirestoreInstance() {
  if (typeof firebase === 'undefined') {
    window.cloudLogger && window.cloudLogger.warn('Firestore', 'Firebase not initialized');
    return null;
  }
  return firebase.firestore();
}

function sanitizeInput`);
content = content.replace(/typeof firebase !== 'undefined' \? firebase\.firestore\(\) : null/g, 'getFirestoreInstance()');

// DRY: validateNumericField
content = content.replace(/function validateInputs/g, 
`/**
 * Validates single numeric input field
 * @param {HTMLElement} inputEl - Input element
 * @param {HTMLElement} errEl - Error element
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Field label
 * @returns {boolean} Whether input is valid
 * @complexity Time: O(1) | Space: O(1)
 */
function validateNumericField(inputEl, errEl, min, max, fieldName) {
  const value = Math.max(0, parseFloat(sanitizeInput(inputEl.value)) || 0);
  const isValid = Number.isFinite(value) && value >= min && value <= max;
  inputEl.classList.toggle('input-error', !isValid);
  if (errEl) {
      errEl.classList.toggle('visible', !isValid);
      if (!isValid) errEl.textContent = \`⚠️ \${fieldName} must be between \${min} and \${max}\`;
  }
  return isValid;
}

function validateInputs`);

// validateInputs refactor
const newValidateInputs = `function validateInputs() {
    let isValid = true;
    
    const carErrEl = document.getElementById('error-car-km');
    const flightsErrEl = document.getElementById('error-flights');
    const electricityErrEl = document.getElementById('error-electricity');

    isValid = validateNumericField(inputCarEl, carErrEl, INPUT_LIMITS.MIN_VALUE || 0, INPUT_LIMITS.MAX_CAR_KM, 'Car km') && isValid;
    isValid = validateNumericField(inputFlightsEl, flightsErrEl, INPUT_LIMITS.MIN_VALUE || 0, INPUT_LIMITS.MAX_FLIGHTS, 'Flights') && isValid;
    isValid = validateNumericField(inputElectricityEl, electricityErrEl, INPUT_LIMITS.MIN_VALUE || 0, INPUT_LIMITS.MAX_ELECTRICITY, 'Electricity') && isValid;

    return isValid;
}

function updateUserDataFromForm() {
    let carInput = Math.max(0, parseFloat(sanitizeInput(inputCarEl.value)) || 0);
    let flightInput = Math.max(0, parseFloat(sanitizeInput(inputFlightsEl.value)) || 0);
    let elecInput = Math.max(0, parseFloat(sanitizeInput(inputElectricityEl.value)) || 0);
    let dietValue = String(sanitizeInput(inputDietEl.value));
    if (!VALID_DIETS.includes(dietValue)) dietValue = DIET_TYPES.MEAT_EATER;

    userData.carKm = carInput;
    userData.flights = flightInput;
    userData.electricity = elecInput;
    userData.diet = dietValue;
}`;
content = content.replace(/function validateInputs\(\) \{[\s\S]*?return true;\n\}/, newValidateInputs);

content = content.replace(/if \(\!validateInputs\(\)\) \{\n        return;\n    \}/, `if (!validateInputs()) {
        return;
    }
    updateUserDataFromForm();`);

// Split saveToFirestore
const newSaveToFirestore = `function buildFirestoreDocument() {
    return {
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        totalEmissions: userData.emissions.total,
        carEmissions: userData.emissions.car,
        flightEmissions: userData.emissions.flights,
        electricityEmissions: userData.emissions.electricity,
        dietEmissions: userData.emissions.diet,
        diet: userData.diet
    };
}

function showSaveSuccessToast() {
    toastEl.classList.remove('hidden');
    setTimeout(() => toastEl.classList.add('hidden'), 3000);
}

async function saveToFirestore(doc) {
    const firestoreDb = getFirestoreInstance();
    if (!firestoreDb) return;

    try {
        await firestoreDb.collection(DB_COLLECTIONS.CALCULATIONS).add(doc || buildFirestoreDocument());
        showSaveSuccessToast();
        if (window.cloudLogger) window.cloudLogger.info("Saved to Firestore successfully");
    } catch (error) {
        if (window.cloudLogger) window.cloudLogger.error("Firestore error: ", error.message);
    }
}`;
content = content.replace(/async function saveToFirestore\(\) \{[\s\S]*?\}\n\}/, newSaveToFirestore);


// Split fetchAiTips
const newFetchAiTips = `function prepareAiTipsUI() {
    apiKeySectionEl.classList.add('hidden');
    loadingStateEl.classList.remove('hidden');
    tipsContainerEl.classList.add('hidden');
    tipsContainerEl.innerHTML = '';
    btnGenerateTipsEl.disabled = true;
}

function buildGeminiPrompt() {
    return \`
    I am a user with a carbon footprint of \${userData.emissions.total.toFixed(1)} tons of CO2 per year. 
    Here is the breakdown:
    - Car travel: \${userData.emissions.car.toFixed(1)} tons
    - Flights: \${userData.emissions.flights.toFixed(1)} tons
    - Home electricity: \${userData.emissions.electricity.toFixed(1)} tons
    - Diet (\${userData.diet}): \${userData.emissions.diet.toFixed(1)} tons

    Provide exactly 3 actionable, highly personalized tips.
    Return ONLY a valid JSON string with this structure:
    [
        { "title": "Tip title", "description": "Detailed explanation..." }
    ]
    \`;
}

function parseGeminiResponse(responseData) {
    let aiResponseText = responseData.candidates[0].content.parts[0].text;
    aiResponseText = aiResponseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    return JSON.parse(aiResponseText);
}

function handleAiTipsError(error) {
    if (window.cloudLogger) window.cloudLogger.error("Error generating tips:", error.message);
    const fallbackTipsData = [
        { title: "Energy Efficiency", description: "Turn off lights when not in use." },
        { title: "Reduce Travel", description: "Combine errands to save gas." },
        { title: "Plant Based Meals", description: "Try meatless Mondays." }
    ];
    renderTips(fallbackTipsData);
}

async function fetchAiTips() {
    const providedKey = String(sanitizeInput(inputGeminiKeyEl.value.trim()));
    if (providedKey) SecureKeyManager.setKey(providedKey);

    if (!SecureKeyManager.hasKey()) {
        if (window.cloudLogger) window.cloudLogger.warn("No API key provided for tips generation");
        alert("Please provide a Gemini API key first.");
        return;
    }
    
    const activeKey = SecureKeyManager.consumeKey();
    prepareAiTipsUI();

    try {
        const fetchResponse = await fetch(
            \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${activeKey}\`, 
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: buildGeminiPrompt() }] }],
                    generationConfig: { temperature: 0.7 }
                })
            }
        );

        if (!fetchResponse.ok) throw new Error(\`API Request failed: \${fetchResponse.status}\`);
        
        const responseData = await fetchResponse.json();
        const tipsArray = parseGeminiResponse(responseData);
        renderTips(tipsArray);
    } catch (error) {
        handleAiTipsError(error);
    } finally {
        btnGenerateTipsEl.disabled = false;
    }
}`;
content = content.replace(/async function fetchAiTips\(\) \{[\s\S]*?\}\n\}/, newFetchAiTips);

// Missing Error Boundaries
const genPdfMatch = content.match(/async function generateAndUploadPdf\(\) \{([\s\S]*?)\n\}\n\n\/\/ =================/);
if (genPdfMatch) {
    const newGenerateAndUploadPdf = `async function generateAndUploadPdf() {
    try {${genPdfMatch[1]}
    } catch (error) {
        if (window.cloudLogger) window.cloudLogger.error('PDF', \`Generation failed: \${error.message}\`);
        alert('Could not generate PDF. Please try again.');
    } finally {
        // Reset any loading states
    }
}`;
    content = content.replace(/async function generateAndUploadPdf\(\) \{[\s\S]*?\n\}\n\n\/\/ =================/, newGenerateAndUploadPdf + '\n\n// =================');
}

const switchMatch = content.match(/function switchView\(viewKey\) \{([\s\S]*?)\n\}\n/);
if (switchMatch) {
    const newSwitchView = `function switchView(viewKey) {
    try {
        if (!VIEWS[viewKey.toUpperCase().replace(/([A-Z])/g, '_$1').trim()]) {
            throw new Error(\`Invalid view: \${viewKey}\`);
        }
        ${switchMatch[1]}
    } catch (error) {
        if (window.cloudLogger) window.cloudLogger.error('Navigation', error.message);
    }
}`;
    content = content.replace(/function switchView\(viewKey\) \{[\s\S]*?\n\}\n/, newSwitchView + '\n');
}

// Cleanup remaining console.logs
content = content.replace(/console\.log\(/g, 'window.cloudLogger.info(');

// Ensure template literals instead of concatenation
content = content.replace(/'<span class="comparison good">' \+\n\s*'<i class="fa-solid fa-arrow-down"><\/i> ' \+\n\s*`\$\{difference\} tons below<\/span> global average`/g, "`<span class=\"comparison good\"><i class=\"fa-solid fa-arrow-down\"></i> ${difference} tons below</span> global average`");
content = content.replace(/'<span class="comparison bad">' \+\n\s*'<i class="fa-solid fa-arrow-up"><\/i> ' \+\n\s*`\$\{difference\} tons above<\/span> global average`/g, "`<span class=\"comparison bad\"><i class=\"fa-solid fa-arrow-up\"></i> ${difference} tons above</span> global average`");
content = content.replace(/'<span class="comparison average">' \+\n\s*'<i class="fa-solid fa-equals"><\/i> ' \+\n\s*`Equal to<\/span> global average`/g, "`<span class=\"comparison average\"><i class=\"fa-solid fa-equals\"></i> Equal to</span> global average`");

content = content.replace(/'<h4><i class="fa-solid \$\{iconClass\}"><\/i> ' \+\n\s*`\$\{escapeHtml\(tipObject\.title\)\}<\/h4>`/g, "`<h4><i class=\"fa-solid ${iconClass}\"></i> ${escapeHtml(tipObject.title)}</h4>`");

fs.writeFileSync('app.js', content, 'utf8');
console.log('app.js refactored successfully.');
