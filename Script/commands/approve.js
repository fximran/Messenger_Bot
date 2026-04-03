const fs = require('fs');
const axios = require('axios');
const request = require('request');

const approvedFile = __dirname + "/cache/group_approved.json";
const pendingFile = __dirname + "/cache/group_pending.json";

module.exports.config = {
    name: "pending",
    version: "1.0.2",
    hasPermssion: 1,
    credits: "MQL1 Community",
    description: "Group approval system - approve or deny groups",
    commandCategory: "Admin",
    cooldowns: 5
};

// ফাইল না থাকলে তৈরি করা
module.exports.onLoad = () => {
    if (!fs.existsSync(approvedFile)) {
        fs.writeFileSync(approvedFile, JSON.stringify([]));
    }
    if (!fs.existsSync(pendingFile)) {
        fs.writeFileSync(pendingFile, JSON.stringify([]));
    }
};

// রিপ্লাই হ্যান্ডলার
module.exports.handleReply = async function({ event, api, handleReply }) {
    const { body, threadID, messageID, senderID } = event;
    const { author, type, pendingList } = handleReply;
    
    if (senderID != author) return;
    
    const approvedGroups = JSON.parse(fs.readFileSync(approvedFile));
    const pendingGroups = JSON.parse(fs.readFileSync(pendingFile));
    
    if (type === "pending_approve") {
        const num = parseInt(body);
        if (isNaN(num) || num < 1 || num > pendingList.length) {
            return api.sendMessage("Invalid number. Please enter a valid number.", threadID, messageID);
        }
        
        const groupId = pendingList[num - 1];
        
        // pending থেকে সরানো
        const index = pendingGroups.indexOf(groupId);
        if (index > -1) pendingGroups.splice(index, 1);
        
        // approved-এ যোগ করা
        if (!approvedGroups.includes(groupId)) approvedGroups.push(groupId);
        
        fs.writeFileSync(approvedFile, JSON.stringify(approvedGroups, null, 2));
        fs.writeFileSync(pendingFile, JSON.stringify(pendingGroups, null, 2));
        
        api.sendMessage(`✅ Group ${groupId} has been APPROVED! Bot will now work in this group.`, threadID, messageID);
    }
};

// মেইন রান ফাংশন
module.exports.run = async function({ api, event, args, Threads, Users }) {
    const { threadID, messageID, senderID } = event;
    const approvedGroups = JSON.parse(fs.readFileSync(approvedFile));
    const pendingGroups = JSON.parse(fs.readFileSync(pendingFile));
    
    const command = args[0] ? args[0].toLowerCase() : "list";
    
    // লিস্ট দেখানো
    if (command === "list" || command === "l") {
        let msg = "━━━━━━━━━━━━━━━━━━━━━━\n";
        msg += "📋 GROUP APPROVAL SYSTEM\n";
        msg += "━━━━━━━━━━━━━━━━━━━━━━\n\n";
        
        // Approved groups
        msg += "✅ APPROVED GROUPS:\n";
        if (approvedGroups.length === 0) {
            msg += "   No approved groups yet.\n";
        } else {
            for (let i = 0; i < approvedGroups.length; i++) {
                const groupId = approvedGroups[i];
                let groupName = "Unknown";
                try {
                    const info = await api.getThreadInfo(groupId);
                    groupName = info.name || "Unknown";
                } catch(e) {}
                msg += `   ${i+1}. ${groupName}\n      ID: ${groupId}\n\n`;
            }
        }
        
        msg += "━━━━━━━━━━━━━━━━━━━━━━\n";
        
        // Pending groups
        msg += "⏳ PENDING GROUPS:\n";
        if (pendingGroups.length === 0) {
            msg += "   No pending groups.\n";
        } else {
            for (let i = 0; i < pendingGroups.length; i++) {
                const groupId = pendingGroups[i];
                let groupName = "Unknown";
                try {
                    const info = await api.getThreadInfo(groupId);
                    groupName = info.name || "Unknown";
                } catch(e) {}
                msg += `   ${i+1}. ${groupName}\n      ID: ${groupId}\n\n`;
            }
        }
        
        msg += "━━━━━━━━━━━━━━━━━━━━━━\n";
        msg += "💡 Commands:\n";
        msg += "   /pending list - Show this list\n";
        msg += "   /pending approve [number] - Approve a pending group\n";
        msg += "   /pending del [number] - Remove from pending\n";
        msg += "   /pending help - Show help\n";
        
        return api.sendMessage(msg, threadID, messageID);
    }
    
    // হেল্প
    else if (command === "help" || command === "h") {
        const msg = "━━━━━━━━━━━━━━━━━━━━━━\n"
                  + "🔧 PENDING SYSTEM HELP\n"
                  + "━━━━━━━━━━━━━━━━━━━━━━\n\n"
                  + "📌 Commands:\n"
                  + "   /pending list - Show all approved & pending groups\n"
                  + "   /pending approve [number] - Approve a group from pending list\n"
                  + "   /pending del [number] - Remove a group from pending list\n"
                  + "   /pending help - Show this help\n\n"
                  + "⚠️ Note: Only bot owner (SUPER ADMIN) can use this command.\n"
                  + "━━━━━━━━━━━━━━━━━━━━━━";
        return api.sendMessage(msg, threadID, messageID);
    }
    
    // অ্যাপ্রুভ
    else if (command === "approve" || command === "a") {
        const num = parseInt(args[1]);
        if (isNaN(num) || num < 1 || num > pendingGroups.length) {
            return api.sendMessage("❌ Invalid number. Use /pending list to see pending groups.", threadID, messageID);
        }
        
        const groupId = pendingGroups[num - 1];
        const index = pendingGroups.indexOf(groupId);
        if (index > -1) pendingGroups.splice(index, 1);
        
        if (!approvedGroups.includes(groupId)) approvedGroups.push(groupId);
        
        fs.writeFileSync(approvedFile, JSON.stringify(approvedGroups, null, 2));
        fs.writeFileSync(pendingFile, JSON.stringify(pendingGroups, null, 2));
        
        api.sendMessage(`✅ Group ${groupId} has been APPROVED!`, threadID, messageID);
        
        // গ্রুপকে নোটিফিকেশন পাঠানো
        api.sendMessage("✅ This group has been approved by the bot owner. Bot will now work normally.", groupId);
    }
    
    // ডিলিট (pending থেকে সরানো)
    else if (command === "del" || command === "delete" || command === "d") {
        const num = parseInt(args[1]);
        if (isNaN(num) || num < 1 || num > pendingGroups.length) {
            return api.sendMessage("❌ Invalid number. Use /pending list to see pending groups.", threadID, messageID);
        }
        
        const groupId = pendingGroups[num - 1];
        pendingGroups.splice(num - 1, 1);
        
        fs.writeFileSync(pendingFile, JSON.stringify(pendingGroups, null, 2));
        
        api.sendMessage(`❌ Group ${groupId} has been REMOVED from pending list.`, threadID, messageID);
        api.sendMessage("❌ Your group has been denied by the bot owner. Bot will not work here.", groupId);
    }
    
    else {
        return api.sendMessage("❌ Unknown command. Use /pending help for instructions.", threadID, messageID);
    }
};