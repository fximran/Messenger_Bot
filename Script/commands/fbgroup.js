module.exports.config = {
    name: "fbgroup",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "MQL1 Community",
    description: "Get list of all Facebook groups the bot is in",
    commandCategory: "system",
    usages: "[page]",
    cooldowns: 10
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    
    // Permission check - only bot admins
    if (!global.config.ADMINBOT.includes(senderID)) {
        return api.sendMessage("❌ Only bot admins can use this command!", threadID, messageID);
    }
    
    try {
        // Show loading message
        api.sendMessage("⏳ Fetching Facebook groups... This may take a moment.", threadID, messageID);
        
        // Get all threads
        const allThreads = await api.getThreadList(1000, null, ["INBOX"]);
        
        // Filter only group threads
        const groups = allThreads.filter(thread => thread.isGroup === true && thread.isSubscribed === true);
        
        if (groups.length === 0) {
            return api.sendMessage("❌ Bot is not in any Facebook groups!", threadID, messageID);
        }
        
        // Sort by message count (most active first)
        groups.sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));
        
        // Pagination settings
        const page = parseInt(args[0]) || 1;
        const limit = 10; // Groups per page
        const totalPages = Math.ceil(groups.length / limit);
        
        if (page < 1 || page > totalPages) {
            return api.sendMessage(`❌ Invalid page number! Valid pages: 1 - ${totalPages}`, threadID, messageID);
        }
        
        const start = (page - 1) * limit;
        const end = Math.min(start + limit, groups.length);
        
        let msg = `📋 FACEBOOK GROUPS LIST\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `📊 Total Groups: ${groups.length}\n`;
        msg += `📄 Page: ${page}/${totalPages}\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        for (let i = start; i < end; i++) {
            const group = groups[i];
            const groupName = group.name || "Unnamed Group";
            const memberCount = group.participants ? group.participants.length : "N/A";
            const approvalMode = group.approvalMode ? "🔒 Approval ON" : "✅ Open";
            
            msg += `${i + 1}. 📛 ${groupName}\n`;
            msg += `   🆔 ID: ${group.threadID}\n`;
            msg += `   👥 Members: ${memberCount}\n`;
            msg += `   💬 Messages: ${group.messageCount || 0}\n`;
            msg += `   ${approvalMode}\n`;
            
            // Check if bot is admin in this group
            if (group.adminIDs && Array.isArray(group.adminIDs)) {
                const botID = api.getCurrentUserID();
                const isBotAdmin = group.adminIDs.some(admin => admin.id == botID);
                msg += `   🤖 Bot: ${isBotAdmin ? "👑 Admin" : "👤 Member"}\n`;
            }
            
            msg += `   ───────────────────\n`;
        }
        
        msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        if (page < totalPages) {
            msg += `💡 Next page: /fbgroup ${page + 1}\n`;
        }
        if (page > 1) {
            msg += `💡 Previous page: /fbgroup ${page - 1}\n`;
        }
        msg += `💡 Use /fbgroup all to see full list`;
        
        api.sendMessage(msg, threadID, messageID);
        
    } catch (error) {
        console.error("fbgroup error:", error);
        return api.sendMessage(`❌ Failed to fetch groups.\nError: ${error.message}`, threadID, messageID);
    }
};