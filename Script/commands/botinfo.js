const fs = require("fs-extra");
const axios = require("axios");
const request = require("request");
const moment = require("moment-timezone");

module.exports.config = {
    name: "botinfo",
    version: "1.0.0",
    hasPermssion: 1,
    credits: "MQL1 Community",
    description: "Show bot information (dynamic)",
    commandCategory: "system",
    cooldowns: 5
};

module.exports.run = async function({ api, event, Users, Threads }) {
    const { threadID, messageID, senderID } = event;
    
    // বটের মৌলিক তথ্য
    const botID = api.getCurrentUserID();
    const botInfo = await api.getUserInfo(botID);
    const botName = botInfo[botID].name || "Bot";
    const botProfileUrl = botInfo[botID].profileUrl || "No profile URL";
    
    // বটের আপটাইম (কতক্ষণ ধরে চলছে)
    const uptime = process.uptime();
    const uptimeDays = Math.floor(uptime / 86400);
    const uptimeHours = Math.floor((uptime % 86400) / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    const uptimeSeconds = Math.floor(uptime % 60);
    
    let uptimeString = "";
    if (uptimeDays > 0) uptimeString += `${uptimeDays} days, `;
    if (uptimeHours > 0) uptimeString += `${uptimeHours} hours, `;
    uptimeString += `${uptimeMinutes} minutes, ${uptimeSeconds} seconds`;
    
    // বর্তমান সময় (বাংলাদেশ)
    const currentTime = moment().tz("Asia/Dhaka").format("DD/MM/YYYY hh:mm:ss A");
    
    // গ্রুপের প্রিফিক্স (ডাইনামিক)
    const threadSetting = (await Threads.getData(String(threadID))).data || {};
    const prefix = threadSetting.PREFIX || global.config.PREFIX || "/";
    
    // বটের গ্লোবাল সেটিংস
    const botPrefix = global.config.PREFIX || "/";
    const botVersion = global.config.VERSION || "1.0.0";
    const botLanguage = global.config.language || "en";
    
    // গ্লোবাল পরিসংখ্যান (সব গ্রুপ)
    let allThreads = global.data.allThreadID || [];
    let allUsers = global.data.allUserID || [];
    let totalThreads = allThreads.length;
    let totalUsers = allUsers.length;
    
    // বর্তমান গ্রুপের তথ্য
    let threadInfo = await api.getThreadInfo(threadID);
    let groupName = threadInfo.threadName || "Unknown";
    let groupMembers = threadInfo.participantIDs.length || 0;
    let groupAdmins = threadInfo.adminIDs.length || 0;
    
    // র্যান্ডম প্রোফাইল ছবি (বটের নিজের ছবি ব্যবহার করবে)
    const avatarUrl = `https://graph.facebook.com/${botID}/picture?height=720&width=720`;
    
    // মেসেজ তৈরি
    const message = `
╔══════════════════════════╗
        🤖 𝐁𝐎𝐓 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍
╚══════════════════════════╝

📛 𝐁𝐨𝐭 𝐍𝐚𝐦𝐞: ${botName}
🆔 𝐁𝐨𝐭 𝐈𝐃: ${botID}
🔗 𝐏𝐫𝐨𝐟𝐢𝐥𝐞: ${botProfileUrl}
📌 𝐏𝐫𝐞𝐟𝐢𝐱: ${prefix}

━━━━━━━━━━━━━━━━━━━━

⏰ 𝐔𝐩𝐭𝐢𝐦𝐞: ${uptimeString}
📅 𝐂𝐮𝐫𝐫𝐞𝐧𝐭 𝐓𝐢𝐦𝐞: ${currentTime}

━━━━━━━━━━━━━━━━━━━━

📊 𝐒𝐭𝐚𝐭𝐢𝐬𝐭𝐢𝐜𝐬:
   • 𝐓𝐨𝐭𝐚𝐥 𝐆𝐫𝐨𝐮𝐩𝐬: ${totalThreads}
   • 𝐓𝐨𝐭𝐚𝐥 𝐔𝐬𝐞𝐫𝐬: ${totalUsers}

━━━━━━━━━━━━━━━━━━━━

📍 𝐂𝐮𝐫𝐫𝐞𝐧𝐭 𝐆𝐫𝐨𝐮𝐩:
   • 𝐍𝐚𝐦𝐞: ${groupName}
   • 𝐈𝐃: ${threadID}
   • 𝐌𝐞𝐦𝐛𝐞𝐫𝐬: ${groupMembers}
   • 𝐀𝐝𝐦𝐢𝐧𝐬: ${groupAdmins}

━━━━━━━━━━━━━━━━━━━━

⚙️ 𝐁𝐨𝐭 𝐂𝐨𝐧𝐟𝐢𝐠:
   • 𝐕𝐞𝐫𝐬𝐢𝐨𝐧: ${botVersion}
   • 𝐋𝐚𝐧𝐠𝐮𝐚𝐠𝐞: ${botLanguage}

━━━━━━━━━━━━━━━━━━━━
    `;
    
    // ছবি সহ মেসেজ পাঠানো
    const imagePath = __dirname + "/cache/botinfo.png";
    
    request(encodeURI(avatarUrl))
        .pipe(fs.createWriteStream(imagePath))
        .on("close", () => {
            api.sendMessage({
                body: message,
                attachment: fs.createReadStream(imagePath)
            }, threadID, () => {
                fs.unlinkSync(imagePath);
            }, messageID);
        })
        .on("error", (err) => {
            console.error("Avatar download error:", err);
            api.sendMessage(message, threadID, messageID);
        });
};