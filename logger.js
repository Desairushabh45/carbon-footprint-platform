class CloudLogger {
    constructor() {
        // Backup original console methods
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info
        };
    }

    _sendToCloudLogging(severity, message, metadata = {}) {
        if (!window.AppConfig || !window.AppConfig.gcpConfig) {
            this.originalConsole.warn("AppConfig not found. Cloud Logging skipped.");
            return;
        }

        const endpoint = window.AppConfig.gcpConfig.loggingEndpoint;
        
        // Payload structure for Google Cloud Logging API (entries:write)
        const payload = {
            entries: [
                {
                    logName: `projects/${window.AppConfig.gcpConfig.projectId}/logs/ecotrack-frontend`,
                    resource: {
                        type: "global"
                    },
                    severity: severity,
                    jsonPayload: {
                        message: message,
                        ...metadata,
                        timestamp: new Date().toISOString()
                    }
                }
            ]
        };

        // Note: Direct REST calls to this endpoint from the browser require authorization
        // (e.g., Bearer token or API key if supported). For this frontend-only 
        // implementation, we attempt the fetch but catch auth failures silently 
        // to avoid spamming the user console.
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).catch(err => {
            // Silently fail network/auth errors to prevent infinite loops 
            // since we are overriding console methods.
        });
    }

    log(message, ...args) {
        this.originalConsole.log(message, ...args);
        this._sendToCloudLogging('INFO', message, { args });
    }

    info(message, ...args) {
        this.originalConsole.info(message, ...args);
        this._sendToCloudLogging('INFO', message, { args });
    }

    warn(message, ...args) {
        this.originalConsole.warn(message, ...args);
        this._sendToCloudLogging('WARNING', message, { args });
    }

    error(message, ...args) {
        this.originalConsole.error(message, ...args);
        this._sendToCloudLogging('ERROR', message, { args });
    }

    // Specific tracking events
    trackEvent(eventName, eventData = {}) {
        this.originalConsole.log(`[Event Tracked]: ${eventName}`, eventData);
        this._sendToCloudLogging('INFO', `Event: ${eventName}`, { eventData });
    }
}

// Instantiate and replace global console
window.cloudLogger = new CloudLogger();

// Automatically override global console (useful for catching all errors)
console.log = (...args) => window.cloudLogger.log(...args);
console.info = (...args) => window.cloudLogger.info(...args);
console.warn = (...args) => window.cloudLogger.warn(...args);
console.error = (...args) => window.cloudLogger.error(...args);
