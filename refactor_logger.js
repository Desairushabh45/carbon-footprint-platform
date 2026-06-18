const fs = require('fs');

let content = fs.readFileSync('logger.js', 'utf8');

// 1. Add LOG_LEVELS
content = content.replace(
  /(\/\*\*[\s\S]*?@version 2\.1\.0\n \*\/)/,
  `$1\n\nconst LOG_LEVELS = Object.freeze({\n  INFO: 'INFO',\n  WARNING: 'WARNING',\n  ERROR: 'ERROR'\n});`
);

// Add module tags to header
content = content.replace(
  /@version 2\.1\.0/,
  `@module logger.js\n * @author Rushabh Desai\n * @license MIT\n * @version 2.1.0`
);

// 2. Fix DRY violations: _createLogMethod
content = content.replace(
  /constructor\(\) \{[\s\S]*?\}\n/,
  `constructor() {
        // Backup original console methods
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info
        };
        this.info = this._createLogMethod(LOG_LEVELS.INFO);
        this.warn = this._createLogMethod(LOG_LEVELS.WARNING);
        this.error = this._createLogMethod(LOG_LEVELS.ERROR);
    }

    /**
     * Creates a log method for given level
     * @param {string} level - Log severity
     * @returns {Function} Log method
     * @complexity Time: O(1) | Space: O(1)
     */
    _createLogMethod(level) {
        return (context, message, data) => {
            this._log(level, context, message, data);
        };
    }

    _log(level, context, message, data) {
        const consoleMethod = level === LOG_LEVELS.INFO ? this.originalConsole.info :
                              level === LOG_LEVELS.WARNING ? this.originalConsole.warn :
                              level === LOG_LEVELS.ERROR ? this.originalConsole.error : this.originalConsole.log;
        if (data !== undefined) {
            consoleMethod(\`[\${context}] \${message}\`, data);
        } else {
            consoleMethod(\`[\${context}] \${message}\`);
        }
        this._sendToCloudLogging(level, \`[\${context}] \${message}\`, { data });
    }
`
);

// Remove old info, warn, error methods
content = content.replace(/\/\*\*\s+\* @description Logs an informational message[\s\S]*?@since v1\.0\.0\s+\*\/\s+info\(message, \.\.\.args\) \{[\s\S]*?\}\n/g, '');
content = content.replace(/\/\*\*\s+\* @description Logs a warning message[\s\S]*?@since v1\.0\.0\s+\*\/\s+warn\(message, \.\.\.args\) \{[\s\S]*?\}\n/g, '');
content = content.replace(/\/\*\*\s+\* @description Logs an error message[\s\S]*?@since v1\.0\.0\s+\*\/\s+error\(message, \.\.\.args\) \{[\s\S]*?\}\n/g, '');

// Fix 'log' method to use LOG_LEVELS.INFO
content = content.replace(/this\._sendToCloudLogging\('INFO', message, \{ args \}\);/g, "this._sendToCloudLogging(LOG_LEVELS.INFO, message, { args });");

// Fix trackEvent to use template literals instead of concatenation, and LOG_LEVELS.INFO
// Actually the original uses template literals mostly: this.originalConsole.log(`[Event Tracked]: ${eventName}`, eventData);
// I just need to replace 'INFO' with LOG_LEVELS.INFO in trackEvent
content = content.replace(/this\._sendToCloudLogging\('INFO',/g, "this._sendToCloudLogging(LOG_LEVELS.INFO,");

// Fix unused err
content = content.replace(/\.catch\(err => \{/g, ".catch((_err) => {");

// Make sure no line exceeds 80 chars
// ... (some lines in my replaced text might exceed, I should format them)
content = content.replace(/const consoleMethod = level === LOG_LEVELS\.INFO \? this\.originalConsole\.info :/g, "const consoleMethod = \n            level === LOG_LEVELS.INFO ? this.originalConsole.info :");
content = content.replace(/level === LOG_LEVELS\.WARNING \? this\.originalConsole\.warn :/g, "level === LOG_LEVELS.WARNING ? this.originalConsole.warn :");
content = content.replace(/level === LOG_LEVELS\.ERROR \? this\.originalConsole\.error : this\.originalConsole\.log;/g, "level === LOG_LEVELS.ERROR ? \n            this.originalConsole.error : this.originalConsole.log;");

// Update file
fs.writeFileSync('logger.js', content, 'utf8');
console.log('logger.js refactored successfully.');
