const colors = require('colors');

class Logger {
    static info(message, data = null) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] INFO: ${message}`.blue);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }

    static success(message, data = null) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] SUCCESS: ${message}`.green);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }

    static warning(message, data = null) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] WARNING: ${message}`.yellow);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }

    static error(message, error = null) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ERROR: ${message}`.red);
        if (error) {
            console.log(`Stack: ${error.stack}`.red);
        }
    }

    static debug(message, data = null) {
        if (process.env.NODE_ENV === 'production') {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] DEBUG: ${message}`.cyan);
            if (data) {
                console.log(JSON.stringify(data, null, 2));
            }
        }
    }
}

module.exports = Logger;