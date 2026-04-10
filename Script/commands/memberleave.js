module.exports.config = {
    name: "memberleave",
    version: "2.2.0",
    hasPermssion: 1,
    credits: "MQL1 Community",
    description: "Control whether members can leave the group (current or specified group)",
    commandCategory: "Group",
    usages: "on/off/status [groupID]",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, Threads, args }) {
    const { threadID, messageID, senderID } = event;
    const isSuperAdmin = global.config.ADMINBOT.includes(senderID);
    const botID = api.getCurrentUserID();

    // Determine target thread: if args[1] is a number, use it; otherwise current thread
    let targetThreadID = threadID;
    let targetGroupName = "this group";
    let isRemote = false;
    
    if (args[1] && /^\d+$/.test(args[1])) {
        targetThreadID = args[1];
        isRemote = true;
        try {
            const targetInfo = await api.getThreadInfo(targetThreadID);
            if (!targetInfo.isGroup) {
                return api.sendMessage("❌ The provided ID is not a group!", threadID, messageID);
            }
            targetGroupName = targetInfo.threadName || targetThreadID;
        } catch (e) {
            return api.sendMessage("❌ Bot is not in the specified group or group doesn't exist!", threadID, messageID);
        }
    }

    // Check if user has permission in target group (or is super admin)
    let isTargetGroupAdmin = false;
    let isBotAdminInTarget = false;
    const targetInfo = await api.getThreadInfo(targetThreadID);
    isTargetGroupAdmin = targetInfo.adminIDs.some(item => item.id == senderID);
    isBotAdminInTarget = targetInfo.adminIDs.some(item => item.id == botID);

    // Permission logic: user must be group admin of target group, or super admin
    if (!isSuperAdmin && !isTargetGroupAdmin) {
        return api.sendMessage(`❌ You are not an admin of ${targetGroupName}!`, threadID, messageID);
    }
    if (!isBotAdminInTarget) {
        return api.sendMessage(`❌ Bot is not an admin in ${targetGroupName}!`, threadID, messageID);
    }

    // Get current language for the target group
    const targetThreadData = (await Threads.getData(targetThreadID)).data || {};
    const lang = targetThreadData.language || global.config.language || "en";
    
    // Language specific messages
    const messages = {
        en: {
            on: "✅ Members can leave normally.",
            off: "✅ Members cannot leave without permission.",
            status_on: "✅ Members can currently leave the group.",
            status_off: "❌ Members currently cannot leave the group.",
            already_on: "⚠️ Members are already allowed to leave!",
            already_off: "⚠️ Members are already prevented from leaving!",
            no_bot_admin: "❌ Bot needs to be group admin to manage this!",
            no_permission: "❌ Only group admins can change this setting!",
            help: "📖 MEMBER LEAVE CONTROL\n━━━━━━━━━━━━━━━━━━━━\n\nGroup: {groupName}\nCurrent Status: {status}\n\n📌 Commands:\n   • /memberleave on [groupID] - Allow members to leave\n   • /memberleave off [groupID] - Prevent members from leaving\n   • /memberleave status [groupID] - Show current status\n\n👑 Only group admins can change settings."
        },
        bn: {
            on: "✅ Sodoshyo ra leave korte parbe.",
            off: "✅ Sodoshyo ra permission chara leave korte parbe na.",
            status_on: "✅ Sodoshyo ra ekhon leave korte pare.",
            status_off: "❌ Sodoshyo ra ekhon leave korte pare na.",
            already_on: "⚠️ Sodoshyo ra agei leave korte pare!",
            already_off: "⚠️ Sodoshyo ra agei leave korte pare na!",
            no_bot_admin: "❌ Eta manage korte bot ke group admin hote hobe!",
            no_permission: "❌ Shudhu group adminra ei setting change korte parben!",
            help: "📖 MEMBER LEAVE CONTROL\n━━━━━━━━━━━━━━━━━━━━\n\nGroup: {groupName}\nCurrent Status: {status}\n\n📌 Commands:\n   • /memberleave on [groupID] - Leave korte dewa\n   • /memberleave off [groupID] - Leave korte na dewa\n   • /memberleave status [groupID] - Current status dekhte\n\n👑 Shudhu group adminra settings change korte parben."
        },
        hi: {
            on: "✅ Sadasyon leave kar sakte hain.",
            off: "✅ Sadasyon bina anumati ke leave nahi kar sakte.",
            status_on: "✅ Sadasyon abhi leave kar sakte hain.",
            status_off: "❌ Sadasyon abhi leave nahi kar sakte.",
            already_on: "⚠️ Sadasyon ko pahle se leave karne ki anumati hai!",
            already_off: "⚠️ Sadasyon ko pahle se leave karne se roka gaya hai!",
            no_bot_admin: "❌ Isse manage karne ke liye bot ko group admin hona chahiye!",
            no_permission: "❌ Sirf group admin hi yeh setting badal sakte hain!",
            help: "📖 MEMBER LEAVE CONTROL\n━━━━━━━━━━━━━━━━━━━━\n\nGroup: {groupName}\nCurrent Status: {status}\n\n📌 Commands:\n   • /memberleave on [groupID] - Leave karne dena\n   • /memberleave off [groupID] - Leave karne se rokna\n   • /memberleave status [groupID] - Current status dekhna\n\n👑 Sirf group admin hi settings badal sakte hain."
        }
    };
    
    const msg = messages[lang] || messages.en;
    
    let data = (await Threads.getData(targetThreadID)).data || {};
    // antiout flag: true = members CANNOT leave, false = they CAN leave
    const antiout = data.antiout === true;
    const statusText = antiout ? "❌ Leave blocked" : "✅ Leave allowed";
    
    const cmd = args[0]?.toLowerCase();
    
    // Command: on (allow leaving)
    if (cmd === "on") {
        if (!antiout) {
            return api.sendMessage(msg.already_on, threadID, messageID);
        }
        
        data.antiout = false;
        await Threads.setData(targetThreadID, { data });
        global.data.threadData.set(parseInt(targetThreadID), data);
        
        return api.sendMessage(msg.on, threadID, messageID);
    }
    
    // Command: off (prevent leaving)
    else if (cmd === "off") {
        if (antiout) {
            return api.sendMessage(msg.already_off, threadID, messageID);
        }
        
        data.antiout = true;
        await Threads.setData(targetThreadID, { data });
        global.data.threadData.set(parseInt(targetThreadID), data);
        
        return api.sendMessage(msg.off, threadID, messageID);
    }
    
    // Command: status
    else if (cmd === "status") {
        if (antiout) {
            return api.sendMessage(msg.status_off, threadID, messageID);
        } else {
            return api.sendMessage(msg.status_on, threadID, messageID);
        }
    }
    
    // Default: Show help + current status
    else {
        const groupDisplay = isRemote ? `${targetGroupName} (${targetThreadID})` : "this group";
        return api.sendMessage(
            msg.help.replace("{groupName}", groupDisplay).replace("{status}", statusText),
            threadID, messageID
        );
    }
};