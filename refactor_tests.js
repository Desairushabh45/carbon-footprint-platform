const fs = require('fs');

let content = fs.readFileSync('tests.js', 'utf8');

// 1. Add standard header tags
content = content.replace(
  /@version 2\.1\.0/,
  `@module tests.js\n * @author Rushabh Desai\n * @license MIT\n * @version 2.1.0`
);

// 2. Add CONSTANTS
const constants = `
const TEST_EMISSION_FACTORS = Object.freeze({
  CAR_KG_PER_KM: 0.192,
  DAYS_PER_YEAR: 365,
  KG_PER_TON: 1000,
  FLIGHT_KG: 250,
  ELECTRICITY_MONTHS: 12,
  ELECTRICITY_KG_PER_KWH: 0.85
});

const TEST_PLEDGE_FACTORS = Object.freeze({
  CAR_REDUCTION: 0.20,
  ENERGY_REDUCTION: 0.80
});

const TEST_IMPACT_FACTORS = Object.freeze({
  TREES_PER_TON: 45,
  KM_PER_TON: 6000,
  SMARTPHONES_PER_TON: 121000,
  COST_PER_TON: 15
});

const TEST_BENCHMARKS = Object.freeze({
  INDIA: 1.9,
  GLOBAL: 4.7,
  PARIS: 2.0,
  USA: 14.2
});
`;
content = content.replace(/let passedTestCount = 0;/, constants + '\nlet passedTestCount = 0;');

// 3. Fix Naming Inconsistencies
content = content.replace(/elecVal/g, 'electricityVal');
content = content.replace(/originalElec/g, 'originalElectricity');

// 4. Replace magic numbers in tests
content = content.replace(/\(val \* 365 \* 0\.192\) \/ 1000/g, '(val * TEST_EMISSION_FACTORS.DAYS_PER_YEAR * TEST_EMISSION_FACTORS.CAR_KG_PER_KM) / TEST_EMISSION_FACTORS.KG_PER_TON');
content = content.replace(/\(val \* 250\) \/ 1000/g, '(val * TEST_EMISSION_FACTORS.FLIGHT_KG) / TEST_EMISSION_FACTORS.KG_PER_TON');
content = content.replace(/\(val \* 12 \* 0\.85\) \/ 1000/g, '(val * TEST_EMISSION_FACTORS.ELECTRICITY_MONTHS * TEST_EMISSION_FACTORS.ELECTRICITY_KG_PER_KWH) / TEST_EMISSION_FACTORS.KG_PER_TON');

content = content.replace(/Math\.round\(6\.0 \* 45\)/g, 'Math.round(6.0 * TEST_IMPACT_FACTORS.TREES_PER_TON)');
content = content.replace(/Math\.round\(6\.0 \* 6000\)/g, 'Math.round(6.0 * TEST_IMPACT_FACTORS.KM_PER_TON)');
content = content.replace(/Math\.round\(6\.0 \* 121000\)/g, 'Math.round(6.0 * TEST_IMPACT_FACTORS.SMARTPHONES_PER_TON)');
content = content.replace(/\(6\.0 \* 15\)\.toFixed\(2\)/g, '(6.0 * TEST_IMPACT_FACTORS.COST_PER_TON).toFixed(2)');

content = content.replace(/\(2\.0 \* 0\.20\)\.toFixed\(2\)/g, '(2.0 * TEST_PLEDGE_FACTORS.CAR_REDUCTION).toFixed(2)');
content = content.replace(/\(2\.0 \* 0\.80\)\.toFixed\(2\)/g, '(2.0 * TEST_PLEDGE_FACTORS.ENERGY_REDUCTION).toFixed(2)');

content = content.replace(/mockComparisonCheck\(4\.7\)/g, 'mockComparisonCheck(TEST_BENCHMARKS.GLOBAL)');

content = content.replace(/'vegan'/g, 'DIET_TYPES.VEGAN');
content = content.replace(/'vegetarian'/g, 'DIET_TYPES.VEGETARIAN');
content = content.replace(/'meat-eater'/g, 'DIET_TYPES.MEAT_EATER');

// 5. Replace repeated test setup pattern
content = content.replace(/\/\/ 1\. CALCULATION TESTS[\s\S]*?\/\/ 2\. DIET TESTS/, 
`// 1. CALCULATION TESTS (22 tests)
    /**
     * Runs array of value tests for one category
     * @param {string} testName - Category name
     * @param {Array<number>} values - Test values
     * @param {Function} calculator - Calc function
     * @param {Function} expected - Expected fn
     * @returns {void}
     * @complexity Time: O(n) | Space: O(1)
     */
    function runValueTests(testName, values, calculator, expected) {
        values.forEach(val => {
            validateTestCase(
                \`\${testName} for \${val}\`,
                calculator(val),
                expected(val)
            );
        });
    }

    runValueTests(
        'Car emissions',
        [0, 5, 10, 20, 50, 100, 200, 500, 1000, 2000],
        val => getSimulatedEmissions(val, 0, 0, '').car,
        val => (val * TEST_EMISSION_FACTORS.DAYS_PER_YEAR * TEST_EMISSION_FACTORS.CAR_KG_PER_KM) / TEST_EMISSION_FACTORS.KG_PER_TON
    );

    runValueTests(
        'Flight emissions',
        [0, 1, 2, 5, 10, 20],
        val => getSimulatedEmissions(0, val, 0, '').flights,
        val => (val * TEST_EMISSION_FACTORS.FLIGHT_KG) / TEST_EMISSION_FACTORS.KG_PER_TON
    );

    runValueTests(
        'Electricity emissions',
        [0, 50, 100, 150, 200, 500],
        val => getSimulatedEmissions(0, 0, val, '').electricity,
        val => (val * TEST_EMISSION_FACTORS.ELECTRICITY_MONTHS * TEST_EMISSION_FACTORS.ELECTRICITY_KG_PER_KWH) / TEST_EMISSION_FACTORS.KG_PER_TON
    );

    // 2. DIET TESTS`);

// 6. Wrap executeAllTests
const match = content.match(/function executeAllTests\(\) \{([\s\S]*?)\n\}\n\n\/\*\*/);
if (match) {
    let inner = match[1];
    let topPart = inner.split('// Restore DOM')[0];
    let bottomPart = '// Restore DOM' + inner.split('// Restore DOM')[1];
    
    let newExecute = `function executeAllTests() {
    try {${topPart}    } catch (error) {
        console.error('Test suite crashed:', error.message);
        // Fallback update if crashed
        const listElement = document.getElementById('test-results-list');
        if (listElement) listElement.innerHTML = '<div class="test-row fail">Suite crashed</div>';
    } finally {
        ${bottomPart}
    }`;
    content = content.replace(/function executeAllTests\(\) \{[\s\S]*?\n\}\n\n\/\*\*/, newExecute + '\n\n/**');
}

// 7. Cleanup console.logs
content = content.replace(/console\.log\(/g, 'window.cloudLogger.info(');

fs.writeFileSync('tests.js', content, 'utf8');
console.log('tests.js refactored successfully.');
