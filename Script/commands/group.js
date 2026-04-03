const fs = require("fs-extra");
const request = require("request");

module.exports.config = {
    name: "group",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Group management tools",
    commandCategory: "box",
    usages: "name | image | info | myname",
    cooldowns: 1,
    dependencies: {
        "request": "",
        "fs-extra": ""
    }
};

module.exports.run = async({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    
    // হেল্প মেসেজ
    if (args.length == 0) {
        return api.sendMessage(
            "📌 Group Commands:\n\n" +
            "• /group name [নাম] - Change group name\n" +
            "• /group image - Change group avatar (reply to a photo)\n" +
            "• /group info - Show group information\n" +
            "• /group myname [নাম] - Change your nickname in this group",
            threadID, messageID
        );
    }
    
    // 1. গ্রুপের নাম পরিবর্তন
    if (args[0] == "name") {
        const newName = args.slice(1).join(" ");
        if (!newName) {
            return api.sendMessage("Please enter a group name.\nExample: /group name My Group", threadID, messageID);
        }
        api.setTitle(newName, threadID);
        return api.sendMessage(`✅ Group name changed to: ${newName}`, threadID, messageID);
    }
    
    // 2. নিজের নাম পরিবর্তন (নতুন যোগ করা)
    if (args[0] == "myname") {
        const newNickname = args.slice(1).join(" ");
        if (!newNickname) {
            return api.sendMessage("Please enter a nickname.\nExample: /group myname Imran", threadID, messageID);
        }
        api.changeNickname(newNickname, threadID, senderID);
        return api.sendMessage(`✅ Your nickname changed to: ${newNickname}`, threadID, messageID);
    }
    
    // 3. গ্রুপের ছবি পরিবর্তন
    if (args[0] == "image") {
        if (event.type !== "message_reply") {
            return api.sendMessage("Please reply to a photo to set as group avatar.", threadID, messageID);
        }
        if (!event.messageReply.attachments || event.messageReply.attachments.length == 0) {
            return api.sendMessage("Please reply to a valid photo.", threadID, messageID);
        }
        if (event.messageReply.attachments[0].type !== "photo") {
            return api.sendMessage("Please reply to a photo, not video or other file.", threadID, messageID);
        }
        
        const imagePath = __dirname + "/cache/group_img.png";
        const imageUrl = event.messageReply.attachments[0].url;
        
        request(encodeURI(imageUrl))
            .pipe(fs.createWriteStream(imagePath))
            .on("close", () => {
                api.changeGroupImage(fs.createReadStream(imagePath), threadID, () => {
                    fs.unlinkSync(imagePath);
                    api.sendMessage("✅ Group avatar has been updated!", threadID, messageID);
                });
            });
        return;
    }
    
    // 4. গ্রুপের তথ্য দেখা
    if (args[0] == "info") {
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            const threadMem = threadInfo.participantIDs.length;
            
            // ছেলে ও মেয়ে কাউন্ট
            let male = 0;
            let female = 0;
            let unknown = 0;
            
            for (let user of threadInfo.userInfo) {
                if (user.gender == 'MALE') male++;
                else if (user.gender == 'FEMALE') female++;
                else unknown++;
            }
            
            const adminCount = threadInfo.adminIDs.length;
            const messageCount = threadInfo.messageCount || 0;
            const emoji = threadInfo.emoji || "None";
            const groupName = threadInfo.threadName || "Unknown";
            const groupID = threadInfo.threadID;
            const approvalMode = threadInfo.approvalMode ? "✅ On" : "❎ Off";
            
            // এডমিনদের লিস্ট
            let adminList = "";
            for (let i = 0; i < threadInfo.adminIDs.length; i++) {
                const adminId = threadInfo.adminIDs[i].id;
                try {
                    const userInfo = await api.getUserInfo(adminId);
                    const adminName = userInfo[adminId].name || "Unknown";
                    adminList += `• ${adminName}\n`;
                } catch(e) {
                    adminList += `• Unknown (${adminId})\n`;
                }
            }
            
            const message = `
╔══════════════════════════╗
        📊 𝐆𝐑𝐎𝐔𝐏 𝐈𝐍𝐅𝐎
╚══════════════════════════╝

📛 𝐍𝐚𝐦𝐞: ${groupName}
🆔 𝐈𝐃: ${groupID}
😀 𝐄𝐦𝐨𝐣𝐢: ${emoji}
🔒 𝐀𝐩𝐩𝐫𝐨𝐯𝐚𝐥: ${approvalMode}

━━━━━━━━━━━━━━━━━━━━

👥 𝐌𝐞𝐦𝐛𝐞𝐫𝐬:
   • 𝐓𝐨𝐭𝐚𝐥: ${threadMem}
   • 👨 𝐌𝐚𝐥𝐞: ${male}
   • 👩 𝐅𝐞𝐦𝐚𝐥𝐞: ${female}
   • ❓ 𝐔𝐧𝐤𝐧𝐨𝐰𝐧: ${unknown}

━━━━━━━━━━━━━━━━━━━━

👑 𝐀𝐝𝐦𝐢𝐧𝐬 (${adminCount}):
${adminList || "   No admin found"}

━━━━━━━━━━━━━━━━━━━━

💬 𝐌𝐞𝐬𝐬𝐚𝐠𝐞𝐬: ${messageCount}

━━━━━━━━━━━━━━━━━━━━
            `;
            
            // গ্রুপের ছবি সহ পাঠানো (যদি থাকে)
            if (threadInfo.imageSrc) {
                const imgPath = __dirname + "/cache/group_info_img.png";
                request(encodeURI(threadInfo.imageSrc))
                    .pipe(fs.createWriteStream(imgPath))
                    .on("close", () => {
                        api.sendMessage({
                            body: message,
                            attachment: fs.createReadStream(imgPath)
                        }, threadID, () => {
                            fs.unlinkSync(imgPath);
                        }, messageID);
                    });
            } else {
                api.sendMessage(message, threadID, messageID);
            }
            
        } catch (error) {
            console.error("Group info error:", error);
            api.sendMessage("❌ Failed to get group information.", threadID, messageID);
        }
        return;
    }
    
    // ভুল কমান্ড দিলে
    return api.sendMessage(
        "❌ Invalid command.\n\nAvailable commands:\n" +
        "• /group name [name] - Change group name\n" +
        "• /group myname [name] - Change your nickname\n" +
        "• /group image - Change group avatar\n" +
        "• /group info - Show group information",
        threadID, messageID
    );
};