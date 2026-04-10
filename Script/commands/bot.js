const fs = require("fs-extra");
const path = require("path");

// Path to config.json (assuming bot.js is in Script/commands/)
const CONFIG_PATH = path.join(__dirname, '..', '..', 'config.json');

function readConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function writeConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

module.exports.config = {
    name: "bot",
    version: "4.1.0",
    hasPermssion: 2,
    credits: "MQL1 Community",
    description: "View bot info, change language, toggle debug mode",
    commandCategory: "system",
    usages: "bot | bot language [en/bn/hi] | bot debug [on/off/status]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const isBotAdmin = global.config.ADMINBOT.includes(senderID);
    
    if (!isBotAdmin) {
        return api.sendMessage("❌ Only bot admins can use this command!", threadID, messageID);
    }
    
    let config = readConfig();
    // Ensure defaults
    if (typeof config.language === 'undefined') config.language = 'en';
    if (typeof config.DEBUG_MODE === 'undefined') config.DEBUG_MODE = false;
    
    // Sync global variables for immediate effect
    global.config.language = config.language;
    global.debugMode = config.DEBUG_MODE;

    // ========== CHANGE BOT LANGUAGE ==========
    if (args[0] === "language") {
        const newLang = args[1]?.toLowerCase();
        const availableLangs = {
            en: "English",
            bn: "বাংলা (Banglish)",
            hi: "हिंदी (Hinglish)"
        };
        
        if (!newLang || !availableLangs[newLang]) {
            const currentLang = config.language;
            let langList = "";
            for (const [code, name] of Object.entries(availableLangs)) {
                const marker = code === currentLang ? "✅ " : "   ";
                langList += `${marker}/bot language ${code} - ${name}\n`;
            }
            return api.sendMessage(
                `📖 CHANGE BOT LANGUAGE\n━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🌐 Current Language: ${availableLangs[currentLang]} (${currentLang})\n\n` +
                `📌 Available:\n${langList}\n\n` +
                `💡 Example: /bot language bn`,
                threadID, messageID
            );
        }
        
        config.language = newLang;
        writeConfig(config);
        global.config.language = newLang;
        
        return api.sendMessage(
            `✅ Bot language changed to ${availableLangs[newLang]}!\n\n` +
            `🌐 All bot messages will now use ${newLang.toUpperCase()} language.\n` +
            `💡 Use /bot language to see available options.`,
            threadID, messageID
        );
    }
    
    // ========== DEBUG MODE TOGGLE ==========
    if (args[0] === "debug") {
        const subCommand = args[1]?.toLowerCase();
        
        if (subCommand === "status" || !subCommand) {
            const status = config.DEBUG_MODE ? "✅ ENABLED" : "❌ DISABLED";
            const statusIcon = config.DEBUG_MODE ? "🔴" : "⚫";
            return api.sendMessage(
                `🐛 DEBUG MODE STATUS\n━━━━━━━━━━━━━━━━━━━━\n\n` +
                `${statusIcon} Current Status: ${status}\n\n` +
                `📌 Commands:\n` +
                `   • /bot debug on - Enable debug mode\n` +
                `   • /bot debug off - Disable debug mode\n` +
                `   • /bot debug status - Show this status\n\n` +
                `💡 When enabled, bot will show detailed error logs and API responses.`,
                threadID, messageID
            );
        }
        
        if (subCommand === "on") {
            config.DEBUG_MODE = true;
            writeConfig(config);
            global.debugMode = true;
            return api.sendMessage(
                `✅ DEBUG MODE ENABLED\n━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🔴 Debug logging is now ACTIVE.\n\n` +
                `📌 Bot will now show:\n` +
                `   • Detailed error messages\n` +
                `   • API request/response logs\n` +
                `   • Command execution details\n\n` +
                `⚠️ This may expose sensitive info. Use with caution!`,
                threadID, messageID
            );
        }
        
        if (subCommand === "off") {
            config.DEBUG_MODE = false;
            writeConfig(config);
            global.debugMode = false;
            return api.sendMessage(
                `✅ DEBUG MODE DISABLED\n━━━━━━━━━━━━━━━━━━━━\n\n` +
                `⚫ Debug logging is now OFF.\n\n` +
                `📌 Bot will only show essential errors.\n` +
                `💡 Use /bot debug on to enable again.`,
                threadID, messageID
            );
        }
        
        return api.sendMessage(`❌ Invalid option!\n\nUse: /bot debug on/off/status`, threadID, messageID);
    }
    
    // ========== BOT INFO (DEFAULT) ==========
    const botID = api.getCurrentUserID();
    const botInfo = await api.getUserInfo(botID);
    const originalName = botInfo[botID].name || "Bot";
    const botProfileUrl = botInfo[botID].profileUrl || "No profile URL";
    
    let botNickname = originalName;
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        if (threadInfo.nicknames && threadInfo.nicknames[botID]) {
            botNickname = threadInfo.nicknames[botID];
        }
    } catch(e) {}
    
    const totalCommands = global.client.commands.size;
    const botPrefix = global.config.PREFIX || "/";
    const botLanguage = config.language;
    const debugStatus = config.DEBUG_MODE ? "✅ ON" : "❌ OFF";
    
    const langNames = {
        en: "English",
        bn: "বাংলা (Banglish)",
        hi: "हिंदी (Hinglish)"
    };
    
    const adminCount = global.config.ADMINBOT ? global.config.ADMINBOT.length : 0;
    
    const message = `
╔════════════════════════════════════════╗
║              🤖 BOT INFO               ║
╚════════════════════════════════════════╝

📛 Name: ${botNickname}
🆔 ID: ${botID}
🔗 Profile: ${botProfileUrl}
🔧 Prefix: ${botPrefix}
⚡ Commands: ${totalCommands}
🌐 Language: ${langNames[botLanguage] || botLanguage}
🐛 Debug Mode: ${debugStatus}
👑 Admins: ${adminCount}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 AVAILABLE COMMANDS (Bot Admin only):

🌐 /bot language [en/bn/hi] - Change bot language
🐛 /bot debug [on/off/status] - Toggle debug mode

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
    
    api.sendMessage(message, threadID, messageID);
};