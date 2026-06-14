/**
 * @fileoverview Centralized Configuration for EcoTrack
 * @description Manages all API keys, endpoints, and environment variables.
 * @version 1.0.0
 */

/** @constant {boolean} IS_DEVELOPMENT Check if running locally */
const IS_DEVELOPMENT = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';

/**
 * @constant {Object} GOOGLE_CONFIG
 * @description Centralized configuration object for all Google Services
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
