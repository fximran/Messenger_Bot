module.exports.config = {
    name: "autoreply",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Funny replies for /বট /পন্ডিত /অটোবট",
    commandCategory: "fun",
    usages: "/বট or /পন্ডিত or /অটোবট",
    cooldowns: 2
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const input = args.join(" ").toLowerCase();
    
    // Get sender name
    let senderName = "আপু/ভাই";
    try {
        const userInfo = await api.getUserInfo(senderID);
        senderName = userInfo[senderID].name.split(" ")[0];
    } catch(e) {}
    
    // Check command
    if (input === "বট" || input === "/বট") {
        const replies = [
            `🤖 ${senderName} জি, আমি আপনার বট! কি হুকুম?`,
            `😎 ${senderName} ভাই, বট এখানে আছে! বলুন কি করতে হবে?`,
            `💪 ${senderName}, আমি রেডি! /help দিন কমান্ড দেখতে।`,
            `🎉 ${senderName}! বট আপনার সেবায়!`
        ];
        return api.sendMessage(replies[Math.floor(Math.random() * replies.length)], threadID, messageID);
    }
    
    if (input === "পন্ডিত" || input === "/পন্ডিত") {
        const replies = [
            `📚 ${senderName} জি, পন্ডিত না, তবে জানার চেষ্টা করি!`,
            `🤓 ${senderName} ভাই, আমি এখনো শিখছি! আপনি শেখান?`,
            `😅 ${senderName}, পন্ডিত হতে অনেক দেরি! তবে চেষ্টা করছি।`,
            `🎓 ${senderName} জি, পন্ডিত না বট, আপনার সেবক!`
        ];
        return api.sendMessage(replies[Math.floor(Math.random() * replies.length)], threadID, messageID);
    }
    
    if (input === "অটোবট" || input === "/অটোবট") {
        const replies = [
            `🤖 ${senderName}, অটোবট না, আমি স্মার্ট বট! 😎`,
            `⚡ ${senderName} ভাই, অটো না, ম্যানুয়ালি কাজ করি!`,
            `😁 ${senderName}, অটোবট না, আমি আপনার দাস বট!`,
            `🦾 ${senderName}, আধা অটো আধা ম্যানুয়াল! 😅`
        ];
        return api.sendMessage(replies[Math.floor(Math.random() * replies.length)], threadID, messageID);
    }
    
    // Default help
    return api.sendMessage(
        `📋 উপলব্ধ কমান্ড:\n━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🔹 /বট - বটের সাথে কথা বলতে\n` +
        `🔹 /পন্ডিত - পন্ডিত হতে চাইলে\n` +
        `🔹 /অটোবট - অটোবট সম্পর্কে জানতে\n\n` +
        `💡 উদাহরণ: /বট`,
        threadID, messageID
    );
};