// @ts-check

/**
 * @changelog
 * v2.1.0 - Added ERROR_CATALOG with standardized error codes
 * v2.0.0 - Dark mode redesign, deep freeze on config objects
 * v1.0.0 - Initial release with Firebase and GCP configuration
 */

/**
 * @fileoverview Centralized Configuration for EcoTrack
 * @description Manages all API keys, endpoints, environment variables,
 * error definitions, and unit constants for the application.
 * @version 2.1.0
 */

/**
 * @description Detects if the application is running in a local
 * development environment by checking the hostname.
 * @constant {boolean} IS_DEVELOPMENT
 * @complexity Time: O(1) | Space: O(1)
 * @since v1.0.0
 */
const IS_DEVELOPMENT = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';

/**
 * @constant {Object} ERROR_CATALOG
 * @description Centralized, immutable catalog of all application
 * error types with standardized codes, messages, and severity levels.
 * Used for consistent error handling and logging across all modules.
 * @since v2.1.0
 */
const ERROR_CATALOG = Object.freeze({
    INVALID_INPUT: {
        code: 'ERR_001',
        message: 'Input validation failed',
        severity: 'warning'
    },
    API_FAILURE: {
        code: 'ERR_002',
        message: 'Gemini API call failed',
        severity: 'error'
    },
    FIRESTORE_ERROR: {
        code: 'ERR_003',
        message: 'Database operation failed',
        severity: 'error'
    },
    RATE_LIMIT: {
        code: 'ERR_004',
        message: 'Too many requests',
        severity: 'warning'
    }
});

/**
 * @constant {Object} GOOGLE_CONFIG
 * @description Centralized configuration object for all Google Services
 * including Firebase, Analytics, and GCP REST endpoints.
 * Deep-frozen to prevent runtime mutation.
 * @since v1.0.0
 */
const GOOGLE_CONFIG = {
    /** 
     * @property {Object} firebaseConfig 
     * @description Credentials for Firebase initialization
     */
    firebaseConfig: {
        apiKey: "YOUR_FIREBASE_API_KEY",
        authDomain: "ecotrack.firebaseapp.com",
        projectId: "ecotrack-project",
        storageBucket: "ecotrack-project.appspot.com",
        messagingSenderId: "123456789",
        appId: "YOUR_APP_ID"
    },
    
    /** 
     * @property {string} analyticsId 
     * @description Measurement ID for Google Analytics
     */
    analyticsId: "G-ECOTRACK01",
    
    /** 
     * @property {Object} gcpConfig 
     * @description Cloud Project REST endpoints
     */
    gcpConfig: {
        projectId: "ecotrack-project",
        bigQueryEndpoint: "https://bigquery.googleapis.com/bigquery/v2/" + 
                          "projects/ecotrack-project/datasets/" + 
                          "ecotrack_analytics/tables/user_calculations/" + 
                          "insertAll",
        loggingEndpoint: "https://logging.googleapis.com/v2/entries:write"
    }
};

// Deep freeze to prevent runtime mutation
Object.freeze(GOOGLE_CONFIG);
Object.freeze(GOOGLE_CONFIG.firebaseConfig);
Object.freeze(GOOGLE_CONFIG.gcpConfig);

// Make available globally
window.AppConfig = GOOGLE_CONFIG;
window.IS_DEVELOPMENT = IS_DEVELOPMENT;
window.ERROR_CATALOG = ERROR_CATALOG;
