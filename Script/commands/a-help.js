module.exports.config = {
    name: "help",
    version: "3.0.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Show all bot commands",
    commandCategory: "system",
    usages: "[command name]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const { commands } = global.client;
    const prefix = global.config.PREFIX || "/";
    
    // Get thread specific prefix if exists
    const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
    const actualPrefix = threadSetting.PREFIX || prefix;
    
    // Get current language for this group
    const threadData = global.data.threadData.get(parseInt(threadID)) || {};
    const lang = threadData.language || global.config.language || "en";
    
    // Language specific messages
    const messages = {
        en: {
            title: "🤖 BOT COMMANDS",
            prefix: "Prefix",
            total: "Total Commands",
            usage: "Usage",
            example: "Example",
            description: "Description",
            category: "Category",
            cooldown: "Cooldown",
            permission: "Permission",
            credits: "Credits",
            not_found: "❌ Command '{name}' not found!",
            everyone: "Everyone",
            group_admin: "Group Admin",
            bot_admin: "Bot Admin",
            no_desc: "No description",
            tip: "💡 Tip: Use {prefix}help [command] for details",
            categories: {
                "system": "⚙️ SYSTEM",
                "Admin": "👑 ADMIN",
                "Group": "👥 GROUP",
                "AI": "🤖 AI",
                "media": "📷 MEDIA",
                "game": "🎮 GAME",
                "fun": "😄 FUN",
                "tag": "🏷️ TAG",
                "prefix": "🔧 PREFIX",
                "tools": "🛠️ TOOLS",
                "Uncategorized": "📁 OTHER"
            }
        },
        bn: {
            title: "🤖 BOT COMMANDS",
            prefix: "Prefix",
            total: "Total Commands",
            usage: "Use korte",
            example: "Example",
            description: "Biboron",
            category: "Category",
            cooldown: "Cooldown",
            permission: "Permission",
            credits: "Credits",
            not_found: "❌ '{name}' command ta nei!",
            everyone: "Shobai",
            group_admin: "Group Admin",
            bot_admin: "Bot Admin",
            no_desc: "Kichu description nei",
            tip: "💡 Tip: {prefix}help [command] diye details dekhte parben",
            categories: {
                "system": "⚙️ SYSTEM",
                "Admin": "👑 ADMIN",
                "Group": "👥 GROUP",
                "AI": "🤖 AI",
                "media": "📷 MEDIA",
                "game": "🎮 GAME",
                "fun": "😄 FUN",
                "tag": "🏷️ TAG",
                "prefix": "🔧 PREFIX",
                "tools": "🛠️ TOOLS",
                "Uncategorized": "📁 OTHER"
            }
        },
        hi: {
            title: "🤖 BOT COMMANDS",
            prefix: "Prefix",
            total: "Total Commands",
            usage: "Use karein",
            example: "Example",
            description: "Vivaran",
            category: "Category",
            cooldown: "Cooldown",
            permission: "Permission",
            credits: "Credits",
            not_found: "❌ '{name}' command exists nahi karta!",
            everyone: "Sabhi",
            group_admin: "Group Admin",
            bot_admin: "Bot Admin",
            no_desc: "Koi description nahi",
            tip: "💡 Tip: {prefix}help [command] se details dekhein",
            categories: {
                "system": "⚙️ SYSTEM",
                "Admin": "👑 ADMIN",
                "Group": "👥 GROUP",
                "AI": "🤖 AI",
                "media": "📷 MEDIA",
                "game": "🎮 GAME",
                "fun": "😄 FUN",
                "tag": "🏷️ TAG",
                "prefix": "🔧 PREFIX",
                "tools": "🛠️ TOOLS",
                "Uncategorized": "📁 OTHER"
            }
        }
    };
    
    const msg = messages[lang] || messages.en;
    
    // Helper function to get category display name
    function getCategoryDisplay(category) {
        return msg.categories[category] || msg.categories["Uncategorized"];
    }
    
    // ========== SPECIFIC COMMAND INFO ==========
    if (args[0]) {
        const command = commands.get(args[0].toLowerCase());
        if (!command) {
            return api.sendMessage(msg.not_found.replace("{name}", args[0]), threadID, messageID);
        }
        
        const config = command.config;
        const permission = config.hasPermssion == 0 ? msg.everyone : 
                          (config.hasPermssion == 1 ? msg.group_admin : msg.bot_admin);
        
        const infoMsg = 
            `📖 ${config.name.toUpperCase()}\n━━━━━━━━━━━━━━━━\n\n` +
            `📝 ${msg.description}: ${config.description || msg.no_desc}\n` +
            `🔧 ${msg.usage}: ${actualPrefix}${config.name} ${config.usages || ""}\n` +
            `📂 ${msg.category}: ${getCategoryDisplay(config.commandCategory)}\n` +
            `⏱️ ${msg.cooldown}: ${config.cooldowns || 5}s\n` +
            `👑 ${msg.permission}: ${permission}\n` +
            `👨‍💻 ${msg.credits}: ${config.credits || "MQL1 Community"}\n` +
            `━━━━━━━━━━━━━━━━\n` +
            `💡 ${msg.example}: ${actualPrefix}${config.name}`;
        
        return api.sendMessage(infoMsg, threadID, messageID);
    }
    
    // ========== SHOW ALL COMMANDS BY CATEGORY ==========
    let categories = {};
    
    for (const [name, command] of commands) {
        const category = command.config.commandCategory || "Uncategorized";
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(name);
    }
    
    // Define category order
    const categoryOrder = ["system", "Admin", "Group", "AI", "media", "game", "fun", "tag", "prefix", "tools", "Uncategorized"];
    
    const sortedCategories = Object.keys(categories).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });
    
    let totalCommands = 0;
    for (const cat of sortedCategories) {
        totalCommands += categories[cat].length;
    }
    
    let resultMsg = `╔════════════════════════╗\n`;
    resultMsg += `║     ${msg.title}     ║\n`;
    resultMsg += `╚════════════════════════╝\n\n`;
    resultMsg += `📌 ${msg.prefix}: ${actualPrefix}\n`;
    resultMsg += `📊 ${msg.total}: ${totalCommands}\n`;
    resultMsg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    for (const category of sortedCategories) {
        const cmdList = categories[category].sort();
        resultMsg += `${getCategoryDisplay(category)} (${cmdList.length})\n`;
        resultMsg += `─────────────────────\n`;
        
        // Show commands in rows of 4
        let line = "";
        for (let i = 0; i < cmdList.length; i++) {
            line += `◈ ${cmdList[i]}  `;
            if ((i + 1) % 4 === 0 || i === cmdList.length - 1) {
                resultMsg += `${line.trim()}\n`;
                line = "";
            }
        }
        resultMsg += `\n`;
    }
    
    resultMsg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    resultMsg += msg.tip.replace("{prefix}", actualPrefix);
    
    api.sendMessage(resultMsg, threadID, messageID);
};