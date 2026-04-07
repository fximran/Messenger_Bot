const chalk = require('chalk');

// Check if debug mode is enabled
function isDebugEnabled() {
    if (typeof global.debugMode !== 'undefined' && global.debugMode === true) {
        return true;
    }
    if (global.config && global.config.debugMode === true) {
        return true;
    }
    return false;
}

// Main log function
module.exports = (message, type) => {
    if (!isDebugEnabled() && type !== 'warning' && type !== 'error') {
        return;
    }
    
    switch (type) {
        case 'success':
            console.log(chalk.green('[✓] ') + chalk.green(message));
            break;
        case 'warning':
            console.log(chalk.yellow('[!] ') + chalk.yellow(message));
            break;
        case 'error':
            console.log(chalk.red('[✗] ') + chalk.red(message));
            break;
        default:
            console.log(chalk.cyan('[i] ') + chalk.cyan(message));
            break;
    }
};

// Loader function for loading animations
module.exports.loader = (message, type) => {
    if (!isDebugEnabled()) return;
    console.log(chalk.blue('[→] ') + chalk.blue('LOADED: ') + chalk.green(message));
};

// Extra functions for backward compatibility
module.exports.warn = (message) => {
    console.log(chalk.yellow('[!] ') + chalk.yellow(message));
};

module.exports.error = (message) => {
    console.log(chalk.red('[✗] ') + chalk.red(message));
};

module.exports.info = (message) => {
    if (!isDebugEnabled()) return;
    console.log(chalk.cyan('[i] ') + chalk.cyan(message));
};

module.exports.success = (message) => {
    if (!isDebugEnabled()) return;
    console.log(chalk.green('[✓] ') + chalk.green(message));
};