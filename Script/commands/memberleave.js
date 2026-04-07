module.exports.config = {
    name: "memberleave",
    version: "2.0.0",
    hasPermssion: 1,
    credits: "MQL1 Community",
    description: "Anti Out system - Prevent members from leaving",
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
    const isBotAdmin = threadInfo.adminIDs.some(item => item.id == api.getCurrentUserID());
    
    // Get current language for this group
    const threadData = (await Threads.getData(threadID)).data || {};
    const lang = threadData.language || global.config.language || "en";
    
    // Language specific messages
    const messages = {
        en: {
            on: "✅ Anti Out is ON\n\n🚪 Members cannot leave without permission.",
            off: "✅ Anti Out is OFF\n\n👋 Members can leave normally.",
            status_on: "✅ Anti Out is currently ENABLED for this group.",
            status_off: "❌ Anti Out is currently DISABLED for this group.",
            already_on: "⚠️ Anti Out is already ON for this group!",
            already_off: "⚠️ Anti Out is already OFF for this group!",
            no_bot_admin: "❌ Bot needs to be group admin to use anti-out!",
            no_permission: "❌ Only group admins can change anti-out settings!",
            help: "📖 ANTI OUT SYSTEM\n━━━━━━━━━━━━━━━━━━━━\n\nCurrent Status: {status}\n\n📌 Commands:\n   • /memberleave on - Enable Anti Out\n   • /memberleave off - Disable Anti Out\n   • /memberleave status - Show current status\n\n👑 Only group admins can change settings.\n🚪 When ON, members cannot leave the group."
        },
        bn: {
            on: "✅ Anti Out ON kora hoyeche\n\n🚪 Sodoshyo ra permission chara leave korte parbe na.",
            off: "✅ Anti Out OFF kora hoyeche\n\n👋 Sodoshyo ra normal bhabe leave korte parbe.",
            status_on: "✅ Anti Out currently ENABLED for this group.",
            status_off: "❌ Anti Out currently DISABLED for this group.",
            already_on: "⚠️ Anti Out already ON for this group!",
            already_off: "⚠️ Anti Out already OFF for this group!",
            no_bot_admin: "❌ Anti out use korte bot ke group admin hote hobe!",
            no_permission: "❌ Shudhu group adminra anti-out change korte parben!",
            help: "📖 ANTI OUT SYSTEM\n━━━━━━━━━━━━━━━━━━━━\n\nCurrent Status: {status}\n\n📌 Commands:\n   • /memberleave on - Anti Out ON korte\n   • /memberleave off - Anti Out OFF korte\n   • /memberleave status - Current status dekhte\n\n👑 Shudhu group adminra settings change korte parben.\n🚪 ON thakle sodoshyo ra group chara korte parbe na."
        },
        hi: {
            on: "✅ Anti Out ON kar diya gaya hai\n\n🚪 Sadasyon permission ke bina leave nahi kar sakte.",
            off: "✅ Anti Out OFF kar diya gaya hai\n\n👋 Sadasyon normal tarah se leave kar sakte hain.",
            status_on: "✅ Anti Out currently ENABLED for this group.",
            status_off: "❌ Anti Out currently DISABLED for this group.",
            already_on: "⚠️ Anti Out already ON for this group!",
            already_off: "⚠️ Anti Out already OFF for this group!",
            no_bot_admin: "❌ Anti out use karne ke liye bot ko group admin hona chahiye!",
            no_permission: "❌ Sirf group admin hi anti-out change kar sakte hain!",
            help: "📖 ANTI OUT SYSTEM\n━━━━━━━━━━━━━━━━━━━━\n\nCurrent Status: {status}\n\n📌 Commands:\n   • /memberleave on - Anti Out ON karne ke liye\n   • /memberleave off - Anti Out OFF karne ke liye\n   • /memberleave status - Current status dekhne ke liye\n\n👑 Sirf group admin hi settings change kar sakte hain.\n🚪 ON hone par sadasyon ko group chodne se roka jayega."
        }
    };
    
    const msg = messages[lang] || messages.en;
    
    let data = (await Threads.getData(threadID)).data || {};
    const currentStatus = data.antiout === true;
    const statusText = currentStatus ? "✅ ON" : "❌ OFF";
    
    // Command: on
    if (args[0] === "on") {
        if (!isGroupAdmin && !isSuperAdmin) {
            return api.sendMessage(msg.no_permission, threadID, messageID);
        }
        if (!isBotAdmin) {
            return api.sendMessage(msg.no_bot_admin, threadID, messageID);
        }
        
        if (currentStatus) {
            return api.sendMessage(msg.already_on, threadID, messageID);
        }
        
        data.antiout = true;
        await Threads.setData(threadID, { data });
        global.data.threadData.set(parseInt(threadID), data);
        
        return api.sendMessage(msg.on, threadID, messageID);
    }
    
    // Command: off
    else if (args[0] === "off") {
        if (!isGroupAdmin && !isSuperAdmin) {
            return api.sendMessage(msg.no_permission, threadID, messageID);
        }
        if (!isBotAdmin) {
            return api.sendMessage(msg.no_bot_admin, threadID, messageID);
        }
        
        if (!currentStatus) {
            return api.sendMessage(msg.already_off, threadID, messageID);
        }
        
        data.antiout = false;
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