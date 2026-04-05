const chalk = require('chalk');
const branding = require('./branding');

// Random color generator
function randomColor() {
    let color = '';
    for (let i = 0; i < 6; i++) {
        const randomDigit = Math.floor(Math.random() * 16).toString(16);
        color += randomDigit;
    }
    return '#' + color;
}

// Get bot name from branding
const botName = branding.botName || "Bot";
const loaderName = branding.loaderName || "LOADED";

// Main log function
module.exports = (message, type) => {
    switch (type) {
        case 'success':
            console.log(chalk.hex('#00FF00')('[✓] ') + chalk.hex('#00FF00')(message));
            break;
        case 'warning':
            console.log(chalk.hex('#FFA500')('[!] ') + chalk.hex('#FFA500')(message));
            break;
        case 'error':
            console.log(chalk.hex('#FF0000')('[✗] ') + chalk.hex('#FF0000')(message));
            break;
        default:
            console.log(chalk.hex('#00BFFF')('[i] ') + chalk.hex('#00BFFF')(message));
            break;
    }
};

// Loader function for loading animations
module.exports.loader = (message, type) => {
    switch (type) {
        case 'success':
            console.log(chalk.hex('#00FF00')('[✓] ') + chalk.hex('#00FF00')(`${loaderName}: `) + chalk.hex('#00FF00')(message));
            break;
        case 'warning':
            console.log(chalk.hex('#FFA500')('[!] ') + chalk.hex('#FFA500')(`${loaderName}: `) + chalk.hex('#FFA500')(message));
            break;
        case 'error':
            console.log(chalk.hex('#FF0000')('[✗] ') + chalk.hex('#FF0000')(`${loaderName}: `) + chalk.hex('#FF0000')(message));
            break;
        default:
            console.log(chalk.hex('#00BFFF')('[→] ') + chalk.hex('#00BFFF')(`${loaderName}: `) + chalk.hex('#00BFFF')(message));
            break;
    }
};