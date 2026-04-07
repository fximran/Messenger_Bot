const fs = require("fs-extra");

module.exports.config = {
    name: "language",
    version: "2.0.0",
    hasPermssion: 1,
    credits: "MQL1 Community",
    description: "Change bot language for current group only (Admin only)",
    commandCategory: "Admin",
    usages: "en / bn / hi",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, Threads, args }) {
    const { threadID, messageID, senderID } = event;
    
    // Check if user is admin
    const isGroupAdmin = (await api.getThreadInfo(threadID)).adminIDs.some(item => item.id == senderID);
    const isSuperAdmin = global.config.ADMINBOT.includes(senderID);
    
    if (!isGroupAdmin && !isSuperAdmin) {
        return api.sendMessage("❌ Only group admins can change the bot language for this group!", threadID, messageID);
    }
    
    // Get current language for this group
    const threadData = (await Threads.getData(threadID)).data || {};
    const currentLang = threadData.language || global.config.language || "en";
    
    const langNames = {
        "en": "English",
        "bn": "বাংলা",
        "hi": "हिंदी"
    };
    
    const langEmoji = {
        "en": "🇬🇧",
        "bn": "🇧🇩",
        "hi": "🇮🇳"
    };
    
    // Helper function to change language for current group only
    async function changeLanguage(lang) {
        const threadData = (await Threads.getData(threadID)).data || {};
        threadData.language = lang;
        await Threads.setData(threadID, { data: threadData });
        global.data.threadData.set(threadID, threadData);
        
        return api.sendMessage(
            `✅ Bot language changed to ${langNames[lang]} for this group only!\n\n` +
            `🌐 Other groups will not be affected.`,
            threadID, messageID
        );
    }
    
    // Command: en
    if (args[0] === "en") {
        if (currentLang === "en") {
            return api.sendMessage(`⚠️ Bot is already set to ${langNames.en} for this group!`, threadID, messageID);
        }
        return changeLanguage("en");
    }
    
    // Command: bn
    else if (args[0] === "bn") {
        if (currentLang === "bn") {
            return api.sendMessage(`⚠️ Bot is already set to ${langNames.bn} for this group!`, threadID, messageID);
        }
        return changeLanguage("bn");
    }
    
    // Command: hi
    else if (args[0] === "hi") {
        if (currentLang === "hi") {
            return api.sendMessage(`⚠️ Bot is already set to ${langNames.hi} for this group!`, threadID, messageID);
        }
        return changeLanguage("hi");
    }
    
    // Default: Show status and available commands (no reply feature)
    else {
        return api.sendMessage(
            `📖 CHANGE BOT LANGUAGE\n━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📍 This Group Only\n` +
            `🌐 Current Language: ${langEmoji[currentLang]} ${langNames[currentLang]}\n\n` +
            `📌 Available:\n` +
            `   • /language en - ${langEmoji.en} English\n` +
            `   • /language bn - ${langEmoji.bn} বাংলা\n` +
            `   • /language hi - ${langEmoji.hi} हिंदी\n\n` +
            `👑 Only group admins can change language for this group.\n` +
            `🌐 Other groups will keep their own language settings.`,
            threadID, messageID
        );
    }
};