module.exports.config = {
    name: "goiadmin",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Bot will reply when someone mentions bot admin",
    commandCategory: "Other",
    usages: "",
    cooldowns: 1
};

module.exports.handleEvent = async function({ api, event, Users }) {
    const { threadID, messageID, mentions, senderID } = event;
    
    // ONLY proceed if there are mentions
    if (!mentions || Object.keys(mentions).length === 0) return;
    
    const adminList = global.config.ADMINBOT || [];
    if (adminList.length === 0) return;
    
    // Check if any admin is mentioned
    let mentionedAdmin = false;
    let adminName = "";
    
    for (const adminId of adminList) {
        if (mentions[adminId]) {
            mentionedAdmin = true;
            const adminInfo = await api.getUserInfo(adminId);
            adminName = adminInfo[adminId].name || "Admin";
            break;
        }
    }
    
    if (!mentionedAdmin) return;
    if (adminList.includes(senderID)) return;
    if (senderID == api.getCurrentUserID()) return;
    
    const mentionerName = await Users.getNameUser(senderID);
    
    const replies = [
        `🤣 ${mentionerName} জি, ${adminName} কে ডাকছেন? তিনি ব্যস্ত আছেন!`,
        `😒 ${mentionerName} ভাই, ${adminName} কে ডিস্টার্ব করবেন না!`,
        `😂 ${adminName} স্যারকে ডাকার আগে একবার ভাবেন!`,
        `😎 ${mentionerName}, ${adminName} এখন গোসল করতেছেন! পরে ডাকবেন!`,
        `🫵 ${mentionerName}, ${adminName} কে মেনশন দিয়েছেন কেন?`,
        `💪 ${adminName} স্যার এখন ব্যস্ত! পরে বলবেন ${mentionerName}।`
    ];
    
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    api.sendMessage(randomReply, threadID, messageID);
};

module.exports.run = async function({}) {};