/**
 * Sends calculation data to Google BigQuery.
 * 
 * Note: In a production environment, this should be done securely 
 * via a backend service to protect service account keys or OAuth tokens. 
 * This frontend implementation attempts the REST call as specified.
 * 
 * @param {Object} emissionsData The user's emission calculations
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
