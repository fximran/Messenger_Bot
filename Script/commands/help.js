module.exports.config = {
    name: "help",
    version: "3.1.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Show all bot commands (filtered by permission)",
    commandCategory: "system",
    usages: "[command name]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const { commands } = global.client;
    const prefix = global.config.PREFIX || "/";
    
    // Get user's permission level in current group
    let userPermission = 0;
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const isGroupAdmin = threadInfo.adminIDs.some(item => item.id == senderID);
        const isSuperAdmin = global.config.ADMINBOT.includes(senderID);
        
        if (isSuperAdmin) userPermission = 2;
        else if (isGroupAdmin) userPermission = 1;
        else userPermission = 0;
    } catch(e) {
        userPermission = 0;
    }
    
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
            available: "Available for you",
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
            permission_level: "Your Permission Level",
            level_0: "Member",
            level_1: "Group Admin",
            level_2: "Bot Admin (Super Admin)",
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
            available: "Apnar jonno available",
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
            permission_level: "Apnar Permission Level",
            level_0: "Member",
            level_1: "Group Admin",
            level_2: "Bot Admin (Super Admin)",
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
            available: "Aapke liye available",
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
            permission_level: "Aapka Permission Level",
            level_0: "Member",
            level_1: "Group Admin",
            level_2: "Bot Admin (Super Admin)",
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
    
    // Get permission level name
    function getPermissionLevel(level) {
        if (level === 2) return msg.bot_admin;
        if (level === 1) return msg.group_admin;
        return msg.everyone;
    }
    
    // ========== SPECIFIC COMMAND INFO ==========
    if (args[0]) {
        const command = commands.get(args[0].toLowerCase());
        if (!command) {
            return api.sendMessage(msg.not_found.replace("{name}", args[0]), threadID, messageID);
        }
        
        const config = command.config;
        const requiredPerm = config.hasPermssion || 0;
        
        // Check if user has permission to see this command
        if (userPermission < requiredPerm) {
            return api.sendMessage(`❌ You don't have permission to view details of "${args[0]}" command!`, threadID, messageID);
        }
        
        const permission = requiredPerm == 0 ? msg.everyone : 
                          (requiredPerm == 1 ? msg.group_admin : msg.bot_admin);
        
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
    
    // ========== SHOW ALL COMMANDS BY CATEGORY (FILTERED BY PERMISSION) ==========
    let categories = {};
    let totalAvailableCommands = 0;
    
    for (const [name, command] of commands) {
        const requiredPerm = command.config.hasPermssion || 0;
        
        // Only show commands that user has permission to use
        if (userPermission >= requiredPerm) {
            const category = command.config.commandCategory || "Uncategorized";
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(name);
            totalAvailableCommands++;
        }
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
    
    // Permission level display name
    let permissionLevelName = "";
    if (userPermission === 2) permissionLevelName = msg.level_2;
    else if (userPermission === 1) permissionLevelName = msg.level_1;
    else permissionLevelName = msg.level_0;
    
    let resultMsg = `╔════════════════════════╗\n`;
    resultMsg += `║     ${msg.title}     ║\n`;
    resultMsg += `╚════════════════════════╝\n\n`;
    resultMsg += `📌 ${msg.prefix}: ${actualPrefix}\n`;
    resultMsg += `👑 ${msg.permission_level}: ${permissionLevelName}\n`;
    resultMsg += `📊 ${msg.available}: ${totalAvailableCommands} / ${commands.size}\n`;
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