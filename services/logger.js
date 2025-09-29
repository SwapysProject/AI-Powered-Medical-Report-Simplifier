const fs = require('fs');
const path = require('path');

/**
 * Simplified Logging System for Medical Report Simplifier
 * Minimal, clean output focused on essential information only
 */
class Logger {
    constructor(options = {}) {
        this.logLevel = options.logLevel || 'INFO';
        this.logToConsole = options.logToConsole !== false;
        
        // Log levels
        this.levels = {
            'ERROR': 0,
            'WARN': 1,
            'INFO': 2,
            'DEBUG': 3
        };
        
        this.currentLevel = this.levels[this.logLevel] || this.levels['INFO'];
    }

    /**
     * Simple log method - minimal output
     */
    log(level, message, metadata = {}) {
        if (this.levels[level] > this.currentLevel) {
            return; // Skip if below current log level
        }
        
        if (this.logToConsole) {
            // Only show essential information
            if (level === 'ERROR') {
                console.error(`❌ ${message}`);
            } else if (level === 'WARN') {
                console.warn(`⚠️ ${message}`);
            } else if (level === 'INFO' && this.isEssential(message)) {
                console.log(`ℹ️ ${message}`);
            }
            // Skip DEBUG messages to reduce noise
        }
    }

    // Check if message is essential for display
    isEssential(message) {
        const essentialKeywords = [
            'Server started',
            'Health check',
            'Error',
            'Failed',
            'Request completed',
            'Service unavailable'
        ];
        return essentialKeywords.some(keyword => message.includes(keyword));
    }

    // Convenience methods
    error(message, metadata = {}) {
        this.log('ERROR', message, metadata);
    }

    warn(message, metadata = {}) {
        this.log('WARN', message, metadata);
    }

    info(message, metadata = {}) {
        this.log('INFO', message, metadata);
    }

    debug(message, metadata = {}) {
        // Skip debug messages in simplified mode
        return;
    }

    // Simplified essential logging methods
    logProcessingEvent(event, data = {}) {
        // Only log critical events
        if (['processing_started', 'processing_completed', 'processing_failed'].includes(event)) {
            this.info(`${event.replace('_', ' ')}`);
        }
    }

    logAPIRequest(req, processingTime, result) {
        // Minimal API logging
        this.info(`Request completed - ${result.tests?.length || 0} tests found`);
    }

    logError(error, context = {}) {
        this.error(`${error.message}`);
    }
}

// Create default logger instance
const defaultLogger = new Logger({
    logLevel: process.env.LOG_LEVEL || 'INFO',
    logToFile: process.env.LOG_TO_FILE !== 'false',
    logToConsole: process.env.LOG_TO_CONSOLE !== 'false'
});

module.exports = {
    Logger,
    logger: defaultLogger
};