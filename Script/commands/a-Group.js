const fs = require("fs-extra");
const request = require("request");

module.exports.config = {
    name: "group",
    version: "5.1.0",
    credits: "MQL1 Community",
    hasPermssion: 1,
    description: "View group status and change group image",
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
        const isBotAdmin = threadInfo.adminIDs.some(item => item.id == api.getCurrentUserID());
        
        const threadData = (await Threads.getData(threadID)).data || {};
        const lang = threadData.language || global.config.language || "en";
        
        const antiOut = threadData.antiout === true;
        
        // Language names
        const langNames = { en: "English", bn: "বাংলা", hi: "हिंदी" };
        
        // Helper function
        function getStatusText(value) {
            if (value === true) return "✅ ON";
            return "❌ OFF";
        }
        
        // Language specific messages
        const messages = {
            en: {
                image_changed: "✅ Group image updated!",
                image_no_reply: "❌ Reply to a photo to set as group image.",
                image_no_photo: "❌ Please reply to a valid photo.",
                image_not_photo: "❌ Please reply to a photo only.",
                image_no_permission: "❌ Only group admins can change group image!",
                image_no_bot_admin: "❌ Bot needs to be group admin to change group image!"
            },
            bn: {
                image_changed: "✅ Group image update kora hoyeche!",
                image_no_reply: "❌ Group image set korte ekta photo reply korun.",
                image_no_photo: "❌ Doya kore ekta valid photo reply korun.",
                image_not_photo: "❌ Doya kore shudhu photo reply korun.",
                image_no_permission: "❌ Shudhu group adminra group image change korte parben!",
                image_no_bot_admin: "❌ Group image change korte bot ke group admin hote hobe!"
            },
            hi: {
                image_changed: "✅ Group image update kar diya gaya!",
                image_no_reply: "❌ Group image set karne ke liye ek photo reply karein.",
                image_no_photo: "❌ Kripya ek valid photo reply karein.",
                image_not_photo: "❌ Kripya sirf photo reply karein.",
                image_no_permission: "❌ Sirf group admin hi group image change kar sakte hain!",
                image_no_bot_admin: "❌ Group image change karne ke liye bot ko group admin hona chahiye!"
            }
        };
        
        const msg = messages[lang] || messages.en;
        
        // ========== CHANGE GROUP IMAGE ==========
        if (args[0] === "image") {
            if (!isGroupAdmin && !isSuperAdmin) {
                return api.sendMessage(msg.image_no_permission, threadID, messageID);
            }
            if (!isBotAdmin) {
                return api.sendMessage(msg.image_no_bot_admin, threadID, messageID);
            }
            if (type !== "message_reply") {
                return api.sendMessage(msg.image_no_reply, threadID, messageID);
            }
            if (!event.messageReply.attachments || event.messageReply.attachments.length === 0) {
                return api.sendMessage(msg.image_no_photo, threadID, messageID);
            }
            if (event.messageReply.attachments[0].type !== "photo") {
                return api.sendMessage(msg.image_not_photo, threadID, messageID);
            }
            
            const imagePath = __dirname + "/cache/group_img.png";
            const imageUrl = event.messageReply.attachments[0].url;
            
            request(encodeURI(imageUrl))
                .pipe(fs.createWriteStream(imagePath))
                .on("close", () => {
                    api.changeGroupImage(fs.createReadStream(imagePath), threadID, () => {
                        fs.unlinkSync(imagePath);
                        api.sendMessage(msg.image_changed, threadID, messageID);
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
        
        // Admin list
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
        
        // Group language
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