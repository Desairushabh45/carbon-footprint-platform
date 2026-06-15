// @ts-check

/**
 * @changelog
 * v2.1.0 - Added comprehensive JSDoc and complexity annotations
 * v2.0.0 - Dark mode redesign
 * v1.0.0 - Initial release with BigQuery REST API integration
 */

/**
 * @fileoverview BigQuery Integration for EcoTrack
 * @description Handles streaming calculation data into Google BigQuery
 * analytics pipeline via REST API for macro-level emission insights.
 * @version 2.1.0
 */

/**
 * @description Sends calculation data to Google BigQuery via the
 * tabledata.insertAll REST API. Constructs a properly formatted
 * insert request with a unique insert ID to prevent duplicates.
 * 
 * Note: In a production environment, this should be done securely 
 * via a backend service to protect service account keys or OAuth tokens. 
 * This frontend implementation attempts the REST call as specified.
 * 
 * @async
 * @param {Object} emissionsData - The user's emission calculations
 * @param {number} emissionsData.total - Total emissions in tons CO2/yr
 * @param {number} emissionsData.car - Car emissions in tons CO2/yr
 * @param {number} emissionsData.flights - Flight emissions in tons CO2/yr
 * @param {number} emissionsData.electricity - Electricity emissions in tons CO2/yr
 * @param {number} emissionsData.diet - Diet emissions in tons CO2/yr
 * @returns {Promise<void>}
 * @throws {Error} When the BigQuery REST call fails (caught internally)
 * @complexity Time: O(1) + network latency | Space: O(1)
 * @example
 * await logToBigQuery({
 *     total: 6.73, car: 1.4, flights: 0.5,
 *     electricity: 1.53, diet: 3.3
 * });
 * @since v1.0.0
 */
async function logToBigQuery(emissionsData) {
    if (!window.AppConfig || !window.AppConfig.gcpConfig) {
        console.warn("AppConfig not found. BigQuery logging skipped.");
        return;
    }

    const endpoint = window.AppConfig.gcpConfig.bigQueryEndpoint;

    // The data format expected by BigQuery tabledata.insertAll
    const payload = {
        kind: "bigquery#tableDataInsertAllRequest",
        rows: [
            {
                insertId: new Date().getTime().toString() + Math.floor(Math.random() * 1000),
                json: {
                    timestamp: new Date().toISOString(),
                    total_emissions: emissionsData.total,
                    car_emissions: emissionsData.car,
                    flight_emissions: emissionsData.flights,
                    electricity_emissions: emissionsData.electricity,
                    diet_emissions: emissionsData.diet
                }
            }
        ]
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // Authorization: 'Bearer YOUR_OAUTH_TOKEN' would be required here in reality
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            // It will fail without a Bearer token, which is expected in this frontend demo
            console.warn(`BigQuery log attempt returned: ${response.status} ${response.statusText}`);
        } else {
            console.info("Successfully logged to BigQuery.");
        }
    } catch (error) {
        console.error("Error logging to BigQuery:", error);
    }
}

// Make it available globally
window.logToBigQuery = logToBigQuery;
