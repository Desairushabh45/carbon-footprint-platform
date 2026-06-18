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
/**
 * @constant {Object} FIREBASE_CONFIG
 * @description Demo Firebase configuration with valid-format credentials.
 * Replace with real project credentials for production use.
 * Using valid-format values prevents Firebase SDK initialization crashes.
 * @since v2.1.0
 */
const FIREBASE_CONFIG = Object.freeze({
    apiKey: "AIzaSyDemo-NotReal-ButValidFormat1",
    authDomain: "ecotrack-demo.firebaseapp.com",
    projectId: "ecotrack-demo",
    storageBucket: "ecotrack-demo.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abc123def456"
});

const GOOGLE_CONFIG = {
    /** 
     * @property {Object} firebaseConfig 
     * @description Credentials for Firebase initialization
     */
    firebaseConfig: FIREBASE_CONFIG,
    
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
        projectId: "ecotrack-demo",
        bigQueryEndpoint: "https://bigquery.googleapis.com/bigquery/v2/" + 
                          "projects/ecotrack-demo/datasets/" + 
                          "ecotrack_analytics/tables/user_calculations/" + 
                          "insertAll",
        loggingEndpoint: "https://logging.googleapis.com/v2/entries:write"
    }
};

// Deep freeze to prevent runtime mutation
Object.freeze(GOOGLE_CONFIG);
Object.freeze(GOOGLE_CONFIG.gcpConfig);

// Make available globally
window.AppConfig = GOOGLE_CONFIG;
window.IS_DEVELOPMENT = IS_DEVELOPMENT;
window.ERROR_CATALOG = ERROR_CATALOG;
