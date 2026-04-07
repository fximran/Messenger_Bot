module.exports.config = {
    name: "delmsg",
    version: "1.0.0",
    hasPermssion: 1,
    credits: "MQL1 Community",
    description: "Unsend bot's own messages",
    commandCategory: "Group",
    usages: "reply to bot message",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, Threads, args }) {
    const { threadID, messageID, senderID, type, messageReply } = event;
    
    // Check if user is admin
    const threadInfo = await api.getThreadInfo(threadID);
    const isGroupAdmin = threadInfo.adminIDs.some(item => item.id == senderID);
    const isSuperAdmin = global.config.ADMINBOT.includes(senderID);
    
    if (!isGroupAdmin && !isSuperAdmin) {
        return api.sendMessage("❌ Only group admins can unsend bot messages!", threadID, messageID);
    }
    
    // Get current language for this group
    const threadData = (await Threads.getData(threadID)).data || {};
    const lang = threadData.language || global.config.language || "en";
    
    // Language specific messages
    const messages = {
        en: {
            no_reply: "❌ Please reply to a bot message to unsend it!\n\n💡 Usage: Reply to any bot message with /delmsg",
            not_bot_message: "❌ You can only unsend bot's own messages!\n\n💡 Reply to a message that was sent by the bot.",
            success: "✅ Message has been unsent successfully!",
            failed: "❌ Failed to unsend message!\nReason: {reason}",
            help: "📖 DELETE BOT MESSAGES\n━━━━━━━━━━━━━━━━━━━━\n\n📌 How to use:\n   • Reply to any bot message and type: /delmsg\n\n👑 Only group admins can use this command.\n🗑️ This will permanently delete the bot's message."
        },
        bn: {
            no_reply: "❌ Bot er message unsend korte reply korte hobe!\n\n💡 Use: Kono bot message reply kore /delmsg likhun",
            not_bot_message: "❌ Apni shudhu bot er nijer message unsend korte parben!\n\n💡 Bot er pathano message reply korun.",
            success: "✅ Message successfully unsend kora hoyeche!",
            failed: "❌ Message unsend korte failed!\nReason: {reason}",
            help: "📖 DELETE BOT MESSAGES\n━━━━━━━━━━━━━━━━━━━━\n\n📌 How to use:\n   • Kono bot message reply kore likhun: /delmsg\n\n👑 Shudhu group adminra ei command use korte parben.\n🗑️ Bot er message permanently delete kore dibe."
        },
        hi: {
            no_reply: "❌ Bot message unsend karne ke liye reply karna hoga!\n\n💡 Use: Kisi bot message ko reply karke /delmsg likhein",
            not_bot_message: "❌ Aap sirf bot ke khud ke messages unsend kar sakte hain!\n\n💡 Bot ke bheje gaye message ko reply karein.",
            success: "✅ Message successfully unsend kar diya gaya!",
            failed: "❌ Message unsend karne mein failed!\nReason: {reason}",
            help: "📖 DELETE BOT MESSAGES\n━━━━━━━━━━━━━━━━━━━━\n\n📌 How to use:\n   • Kisi bot message ko reply karke likhein: /delmsg\n\n👑 Sirf group admin hi is command ka use kar sakte hain.\n🗑️ Bot ka message permanently delete ho jayega."
        }
    };
    
    const msg = messages[lang] || messages.en;
    
    // Check if replying to a message
    if (type !== "message_reply") {
        return api.sendMessage(msg.no_reply, threadID, messageID);
    }
    
    // Check if replying to bot's own message
    if (messageReply.senderID !== api.getCurrentUserID()) {
        return api.sendMessage(msg.not_bot_message, threadID, messageID);
    }
    
    // Try to unsend the message
    try {
        await api.unsendMessage(messageReply.messageID);
        return api.sendMessage(msg.success, threadID, messageID);
    } catch (error) {
        console.log("Unsend error:", error);
        return api.sendMessage(
            msg.failed.replace("{reason}", error.message || "Unknown error"),
            threadID, messageID
        );
    }
};