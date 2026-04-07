module.exports.config = {
    name: "resend",
    version: "1.0.0",
    hasPermssion: 1,
    credits: "MQL1 Community",
    description: "Track deleted messages in group",
    commandCategory: "Group",
    usages: "on/off/status",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, Threads, args }) {
    const { threadID, messageID, senderID } = event;
    
    // Check if user is admin
    const threadInfo = await api.getThreadInfo(threadID);
    const isGroupAdmin = threadInfo.adminIDs.some(item => item.id == senderID);
    const isSuperAdmin = global.config.ADMINBOT.includes(senderID);
    
    if (!isGroupAdmin && !isSuperAdmin) {
        return api.sendMessage("❌ Only group admins can change resend settings!", threadID, messageID);
    }
    
    // Get current language for this group
    const threadData = (await Threads.getData(threadID)).data || {};
    const lang = threadData.language || global.config.language || "en";
    
    // Language specific messages
    const messages = {
        en: {
            on: "✅ RESEND ENABLED\n━━━━━━━━━━━━━━━━\n\n🔔 I will now track and show deleted messages.",
            off: "❌ RESEND DISABLED\n━━━━━━━━━━━━━━━━\n\n🔕 I will no longer track or show deleted messages.",
            status_on: "✅ Resend is currently ENABLED for this group.\n\n👁️ I will show when someone deletes a message.",
            status_off: "❌ Resend is currently DISABLED for this group.\n\n👁️ I will not track deleted messages.",
            already_on: "⚠️ Resend is already ON for this group!",
            already_off: "⚠️ Resend is already OFF for this group!",
            no_permission: "❌ Only group admins can change resend settings!",
            help: "📖 RESEND SYSTEM\n━━━━━━━━━━━━━━━━━━━━\n\nCurrent Status: {status}\n\n📌 Commands:\n   • /resend on - Enable resend tracking\n   • /resend off - Disable resend tracking\n   • /resend status - Show current status\n\n👑 Only group admins can change settings.\n🔔 When ON, bot will show deleted messages with sender name and content."
        },
        bn: {
            on: "✅ RESEND ENABLED\n━━━━━━━━━━━━━━━━\n\n🔔 Ami ekhon deleted messages track kore dekhabo.",
            off: "❌ RESEND DISABLED\n━━━━━━━━━━━━━━━━\n\n🔕 Ami ar deleted messages track korbo na.",
            status_on: "✅ Resend currently ENABLED for this group.\n\n👁️ Keu message delete korle ami dekhabo.",
            status_off: "❌ Resend currently DISABLED for this group.\n\n👁️ Ami deleted messages track korbo na.",
            already_on: "⚠️ Resend already ON for this group!",
            already_off: "⚠️ Resend already OFF for this group!",
            no_permission: "❌ Shudhu group adminra resend settings change korte parben!",
            help: "📖 RESEND SYSTEM\n━━━━━━━━━━━━━━━━━━━━\n\nCurrent Status: {status}\n\n📌 Commands:\n   • /resend on - Resend tracking ON korte\n   • /resend off - Resend tracking OFF korte\n   • /resend status - Current status dekhte\n\n👑 Shudhu group adminra settings change korte parben.\n🔔 ON thakle bot deleted message sender name and content dekhabe."
        },
        hi: {
            on: "✅ RESEND ENABLED\n━━━━━━━━━━━━━━━━\n\n🔔 Main ab deleted messages track karke dikhaunga.",
            off: "❌ RESEND DISABLED\n━━━━━━━━━━━━━━━━\n\n🔕 Main ab deleted messages track nahi karunga.",
            status_on: "✅ Resend currently ENABLED for this group.\n\n👁️ Koi message delete karega to main dikhaunga.",
            status_off: "❌ Resend currently DISABLED for this group.\n\n👁️ Main deleted messages track nahi karunga.",
            already_on: "⚠️ Resend already ON for this group!",
            already_off: "⚠️ Resend already OFF for this group!",
            no_permission: "❌ Sirf group admin hi resend settings change kar sakte hain!",
            help: "📖 RESEND SYSTEM\n━━━━━━━━━━━━━━━━━━━━\n\nCurrent Status: {status}\n\n📌 Commands:\n   • /resend on - Resend tracking ON karne ke liye\n   • /resend off - Resend tracking OFF karne ke liye\n   • /resend status - Current status dekhne ke liye\n\n👑 Sirf group admin hi settings change kar sakte hain.\n🔔 ON hone par bot deleted message sender name aur content dikhayega."
        }
    };
    
    const msg = messages[lang] || messages.en;
    
    let data = (await Threads.getData(threadID)).data || {};
    const currentStatus = data.resend === true;
    const statusText = currentStatus ? "✅ ON" : "❌ OFF";
    
    // Command: on
    if (args[0] === "on") {
        if (currentStatus) {
            return api.sendMessage(msg.already_on, threadID, messageID);
        }
        
        data.resend = true;
        await Threads.setData(threadID, { data });
        global.data.threadData.set(parseInt(threadID), data);
        
        return api.sendMessage(msg.on, threadID, messageID);
    }
    
    // Command: off
    else if (args[0] === "off") {
        if (!currentStatus) {
            return api.sendMessage(msg.already_off, threadID, messageID);
        }
        
        data.resend = false;
        await Threads.setData(threadID, { data });
        global.data.threadData.set(parseInt(threadID), data);
        
        return api.sendMessage(msg.off, threadID, messageID);
    }
    
    // Command: status
    else if (args[0] === "status") {
        if (currentStatus) {
            return api.sendMessage(msg.status_on, threadID, messageID);
        } else {
            return api.sendMessage(msg.status_off, threadID, messageID);
        }
    }
    
    // Default: Show status + command list (no argument)
    else {
        return api.sendMessage(
            msg.help.replace("{status}", statusText),
            threadID, messageID
        );
    }
};