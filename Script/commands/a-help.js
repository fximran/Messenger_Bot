const fs = require("fs-extra");
const axios = require("axios");

module.exports.config = {
    name: "help",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Show all bot commands with categories",
    commandCategory: "system",
    usages: "[command name] or [all] or [page number]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const { commands } = global.client;
    const prefix = global.config.PREFIX || "/";
    
    // Get thread specific prefix if exists
    const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
    const actualPrefix = threadSetting.PREFIX || prefix;
    
    // ========== CHECK FOR "all" COMMAND ==========
    if (args[0] && args[0].toLowerCase() === "all") {
        // Show all commands in a simple list
        let allCmd = [];
        for (const [name] of commands) {
            allCmd.push(name);
        }
        allCmd.sort();
        
        let msg = 
            `📋 ALL COMMANDS (${allCmd.length})\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        // Show in groups of 6
        let line = "";
        for (let i = 0; i < allCmd.length; i++) {
            line += `• ${allCmd[i]}  `;
            if ((i + 1) % 6 === 0 || i === allCmd.length - 1) {
                msg += `${line.trim()}\n`;
                line = "";
            }
        }
        
        msg += 
            `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💡 Use ${actualPrefix}help [command] for details`;
        
        return api.sendMessage(msg, threadID, messageID);
    }
    
    // ========== CHECK FOR PAGE NUMBER ==========
    if (args[0] && !isNaN(args[0])) {
        const pageNum = parseInt(args[0]);
        return sendPaginatedHelp(api, event, commands, actualPrefix, pageNum);
    }
    
    // ========== SPECIFIC COMMAND INFO ==========
    if (args[0]) {
        const command = commands.get(args[0].toLowerCase());
        if (!command) {
            return api.sendMessage(`❌ Command "${args[0]}" not found!\n\n💡 Use ${actualPrefix}help to see all commands.`, threadID, messageID);
        }
        
        const config = command.config;
        const msg = 
            `📖 COMMAND INFO\n━━━━━━━━━━━━━━━━\n\n` +
            `📛 Name: ${config.name}\n` +
            `📝 Description: ${config.description || "No description"}\n` +
            `🔧 Usage: ${actualPrefix}${config.name} ${config.usages || ""}\n` +
            `📂 Category: ${config.commandCategory || "General"}\n` +
            `⏱️ Cooldown: ${config.cooldowns || 5} seconds\n` +
            `👑 Permission: ${config.hasPermssion == 0 ? "Everyone" : config.hasPermssion == 1 ? "Group Admin" : "Bot Admin"}\n` +
            `👨‍💻 Credits: ${config.credits || "Unknown"}\n` +
            `━━━━━━━━━━━━━━━━\n` +
            `💡 Example: ${actualPrefix}${config.name} ${config.usages ? config.usages.split(" ")[0] : ""}`;
        
        return api.sendMessage(msg, threadID, messageID);
    }
    
    // ========== DEFAULT: GROUP BY CATEGORY ==========
    let categories = {};
    
    for (const [name, command] of commands) {
        const category = command.config.commandCategory || "Uncategorized";
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(name);
    }
    
    // Sort categories
    const sortedCategories = Object.keys(categories).sort();
    
    // Calculate total commands
    let totalCommands = 0;
    for (const cat of sortedCategories) {
        totalCommands += categories[cat].length;
    }
    
    // Create message
    let msg = 
        `╔══════════════════════════════╗\n` +
        `║        🤖 BOT COMMANDS        ║\n` +
        `╚══════════════════════════════╝\n\n` +
        `📌 Prefix: ${actualPrefix}\n` +
        `📊 Total Commands: ${totalCommands}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Add each category
    for (const category of sortedCategories) {
        const cmdList = categories[category].sort();
        msg += `📁 ${category}\n`;
        msg += `   ─────────────────────\n`;
        
        // Show commands in groups of 4 for better readability
        let line = "";
        for (let i = 0; i < cmdList.length; i++) {
            line += `• ${cmdList[i]}  `;
            if ((i + 1) % 4 === 0 || i === cmdList.length - 1) {
                msg += `   ${line.trim()}\n`;
                line = "";
            }
        }
        msg += `\n`;
    }
    
    msg += 
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 Tips:\n` +
        `• ${actualPrefix}help [command] - Get command details\n` +
        `• ${actualPrefix}help all - Show all commands in one list\n` +
        `• ${actualPrefix}help [page number] - Show paginated list\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    
    // Send message (with random image if possible)
    try {
        const imageUrls = [
            "https://i.imgur.com/WXQIgMz.jpeg",
            "https://i.postimg.cc/QdgH08j6/Messenger-creation-C2-A39-DCF-A8-E7-4-FC7-8715-2559476-FEEF4.gif"
        ];
        const randomImage = imageUrls[Math.floor(Math.random() * imageUrls.length)];
        
        const imagePath = __dirname + "/cache/help_img.png";
        const response = await axios.get(randomImage, { responseType: "stream" });
        const writer = fs.createWriteStream(imagePath);
        response.data.pipe(writer);
        
        writer.on("finish", () => {
            api.sendMessage({
                body: msg,
                attachment: fs.createReadStream(imagePath)
            }, threadID, () => {
                fs.unlinkSync(imagePath);
            }, messageID);
        });
        
        writer.on("error", () => {
            api.sendMessage(msg, threadID, messageID);
        });
    } catch (error) {
        api.sendMessage(msg, threadID, messageID);
    }
};

// ========== PAGINATED HELP FUNCTION ==========
async function sendPaginatedHelp(api, event, commands, prefix, pageNum = 1) {
    const { threadID, messageID, senderID } = event;
    
    // Collect all commands
    let allCommands = [];
    for (const [name, command] of commands) {
        allCommands.push({
            name: name,
            category: command.config.commandCategory || "Uncategorized"
        });
    }
    allCommands.sort((a, b) => a.name.localeCompare(b.name));
    
    const itemsPerPage = 20;
    const totalPages = Math.ceil(allCommands.length / itemsPerPage);
    
    if (pageNum < 1) pageNum = 1;
    if (pageNum > totalPages) pageNum = totalPages;
    
    const start = (pageNum - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageCommands = allCommands.slice(start, end);
    
    let msg = 
        `📖 BOT COMMANDS - Page ${pageNum}/${totalPages}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    for (const cmd of pageCommands) {
        msg += `📁 ${cmd.category}\n`;
        msg += `   🔹 ${cmd.name}\n`;
        msg += `   ─────────────────────\n`;
    }
    
    msg += 
        `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 Commands:\n` +
        `• ${prefix}help [command] - Command details\n` +
        `• ${prefix}help all - All commands list\n` +
        `• ${prefix}help ${pageNum > 1 ? pageNum - 1 : 1} - Previous page\n` +
        `• ${prefix}help ${pageNum < totalPages ? pageNum + 1 : totalPages} - Next page`;
    
    api.sendMessage(msg, threadID, messageID);
}