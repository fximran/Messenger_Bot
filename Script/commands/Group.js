const fs = require("fs-extra");
const request = require("request");

module.exports.config = {
    name: "group",
    version: "5.2.0",
    credits: "MQL1 Community",
    hasPermssion: 1,
    description: "View group status and change group image (admin only, silent for non-admins)",
    commandCategory: "Group",
    usages: "group | image",
    cooldowns: 5,
    dependencies: {
        "request": "",
        "fs-extra": ""
    }
};

module.exports.run = async function ({ api, event, Threads, args }) {
    const { threadID, messageID, senderID, type } = event;

    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const isGroupAdmin = threadInfo.adminIDs.some(item => item.id == senderID);
        const isSuperAdmin = global.config.ADMINBOT.includes(senderID);
        
        const threadData = (await Threads.getData(threadID)).data || {};
        const lang = threadData.language || global.config.language || "en";
        
        const antiOut = threadData.antiout === true;
        
        // Language names for display
        const langNames = { en: "English", bn: "বাংলা", hi: "हिंदी" };
        
        // Helper function
        function getStatusText(value) {
            if (value === true) return "✅ ON";
            return "❌ OFF";
        }
        
        // ========== CHANGE GROUP IMAGE ==========
        if (args[0] === "image") {
            // Only group admin or bot admin can change image
            if (!isGroupAdmin && !isSuperAdmin) {
                // Silent for regular members - no response at all
                return;
            }
            
            // Check if user replied to a message
            if (type !== "message_reply") {
                return api.sendMessage("❌ Please reply to a photo to set as group image.", threadID, messageID);
            }
            if (!event.messageReply.attachments || event.messageReply.attachments.length === 0) {
                return api.sendMessage("❌ Please reply to a valid photo.", threadID, messageID);
            }
            if (event.messageReply.attachments[0].type !== "photo") {
                return api.sendMessage("❌ Please reply to a photo only.", threadID, messageID);
            }
            
            const imagePath = __dirname + "/cache/group_img.png";
            const imageUrl = event.messageReply.attachments[0].url;
            
            api.sendMessage("⏳ Changing group image...", threadID, messageID);
            
            request(encodeURI(imageUrl))
                .pipe(fs.createWriteStream(imagePath))
                .on("close", () => {
                    api.changeGroupImage(fs.createReadStream(imagePath), threadID, (err) => {
                        fs.unlinkSync(imagePath);
                        if (err) {
                            return api.sendMessage(`❌ Failed to change group image.\nReason: ${err.message || "Unknown error"}`, threadID, messageID);
                        }
                        api.sendMessage("✅ Group image updated successfully!", threadID, messageID);
                    });
                });
            return;
        }
        
        // ========== SHOW STATUS (DEFAULT) ==========
        // BOT INFO
        const botID = api.getCurrentUserID();
        const botInfo = await api.getUserInfo(botID);
        const originalName = botInfo[botID].name || "Bot";
        
        let botNickname = originalName;
        try {
            const threadInfoLocal = await api.getThreadInfo(threadID);
            if (threadInfoLocal.nicknames && threadInfoLocal.nicknames[botID]) {
                botNickname = threadInfoLocal.nicknames[botID];
            }
        } catch(e) {}
        
        const totalCommands = global.client.commands.size;
        const botPrefix = global.config.PREFIX || "/";
        const botLanguage = global.config.language || "en";
        
        // GROUP INFO
        const memberCount = threadInfo.participantIDs.length;
        const adminCount = threadInfo.adminIDs.length;
        const emoji = threadInfo.emoji || "None";
        const approvalMode = threadInfo.approvalMode ? "✅ On" : "❎ Off";
        const groupName = threadInfo.threadName || "Unknown";
        const groupID = threadInfo.threadID;
        const messageCount = threadInfo.messageCount || 0;
        
        // Gender stats
        let male = 0, female = 0, unknown = 0;
        if (threadInfo.userInfo) {
            for (let user of threadInfo.userInfo) {
                if (user.gender === "MALE") male++;
                else if (user.gender === "FEMALE") female++;
                else unknown++;
            }
        }
        
        // Build admin list
        let adminList = "";
        for (let i = 0; i < threadInfo.adminIDs.length; i++) {
            const adminId = threadInfo.adminIDs[i].id;
            try {
                const userInfo = await api.getUserInfo(adminId);
                const adminName = userInfo[adminId].name || "Unknown";
                adminList += `• ${adminName}\n`;
            } catch (e) {
                adminList += `• Unknown (${adminId})\n`;
            }
        }
        if (adminList === "") adminList = "No admin found";
        
        // Group language setting
        const grpLang = threadData.language || global.config.language || "en";
        const grpLangName = langNames[grpLang] || grpLang;
        const antiOutStatus = getStatusText(antiOut);
        
        const statusMessage = `
📊 GROUP STATUS
━━━━━━━━━━━━━━

🤖 BOT INFO
━━━━━━━━━━━━━━
📛 Name: ${botNickname}
🆔 ID: ${botID}
🔧 Prefix: ${botPrefix}
⚡ Commands: ${totalCommands}
🌐 Language: ${langNames[botLanguage] || botLanguage}

━━━━━━━━━━━━━━

📍 GROUP INFO
━━━━━━━━━━━━━━
📛 Name: ${groupName}
🆔 ID: ${groupID}
💬 Messages: ${messageCount}
😀 Emoji: ${emoji}
🔒 Approval: ${approvalMode}
🌐 Language: ${grpLangName}
🚪 Anti Out: ${antiOutStatus}

━━━━━━━━━━━━━━

👥 MEMBERS
━━━━━━━━━━━━━━
📊 Total: ${memberCount}
👨 Male: ${male}
👩 Female: ${female}
❓ Unknown: ${unknown}

━━━━━━━━━━━━━━

👑 ADMINS (${adminCount})
━━━━━━━━━━━━━━
${adminList}

━━━━━━━━━━━━━━
💡 /group image - Change group image (reply to photo)
        `;
        
        api.sendMessage(statusMessage, threadID, messageID);
        
    } catch (error) {
        console.error("Group error:", error);
        api.sendMessage("❌ Failed to get group information.", threadID, messageID);
    }
};