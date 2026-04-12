const fs = require("fs-extra");
const moment = require("moment-timezone");

module.exports.config = {
    name: "automessage",
    version: "3.4.0",
    credits: "MQL1 Community",
    description: "Auto send messages in a specific group (or current) with individual timers",
    commandCategory: "system",
    usages: "add/list/on/off/default/status/reset [groupID|all]",
    cooldowns: 5
};

// Data storage path (per group) - matches web panel autoMsgPath
const basePath = __dirname + "/cache/automessage/";

if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
}

function getDataPath(threadID) {
    return basePath + "automessage_" + threadID + ".json";
}

function loadData(threadID) {
    const path = getDataPath(threadID);
    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, JSON.stringify({ messages: [], enabled: false, defaultInterval: 60, lastSent: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(path, "utf-8"));
}

function saveData(threadID, data) {
    const path = getDataPath(threadID);
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

async function sendToGroup(api, threadID, message) {
    try {
        await api.sendMessage(message, threadID);
    } catch(e) {
        console.log("Send error:", e);
    }
}

async function checkAndSendForGroup(api, threadID) {
    const data = loadData(threadID);
    if (!data.enabled) return;
    
    const now = moment().tz("Asia/Dhaka");
    
    for (let i = 0; i < data.messages.length; i++) {
        const msg = data.messages[i];
        const interval = msg.interval || data.defaultInterval;
        const lastSent = data.lastSent[msg.id] ? moment(data.lastSent[msg.id]) : null;
        
        if (!lastSent || now.diff(lastSent, 'minutes') >= interval) {
            await sendToGroup(api, threadID, msg.text);
            data.lastSent[msg.id] = now.valueOf();
            saveData(threadID, data);
            console.log(`[AutoMessage] Sent to ${threadID}: "${msg.text.substring(0, 50)}..." every ${interval} min`);
        }
    }
}

setInterval(async () => {
    const { api } = global.client;
    if (!api) return;
    
    const allThread = global.data.allThreadID || [];
    for (const tid of allThread) {
        await checkAndSendForGroup(api, tid);
    }
}, 60000);

// Helper: extract target thread and remaining args
async function parseTargetAndArgs(api, args, threadID) {
    let targetThreadID = threadID;
    let targetThreadName = "this group";
    let remainingArgs = [...args];

    // Case 1: Last arg is numeric (group ID)
    const lastArg = args[args.length - 1];
    if (lastArg && /^\d+$/.test(lastArg)) {
        try {
            const info = await api.getThreadInfo(lastArg);
            if (info.isGroup) {
                targetThreadID = lastArg;
                targetThreadName = info.threadName || lastArg;
                remainingArgs = args.slice(0, -1);
                return { targetThreadID, targetThreadName, remainingArgs };
            }
        } catch (e) {}
    }

    // Case 2: For 'add' command, second arg might be numeric (group ID between interval and message)
    if (args[0]?.toLowerCase() === 'add' && args.length >= 3) {
        // If first arg is interval (numeric) and second arg is numeric and third arg exists
        if (!isNaN(parseInt(args[1])) && parseInt(args[1]) > 0) {
            // args[1] is interval, check if args[2] is numeric group ID
            if (/^\d+$/.test(args[2])) {
                const possibleGroupID = args[2];
                try {
                    const info = await api.getThreadInfo(possibleGroupID);
                    if (info.isGroup) {
                        targetThreadID = possibleGroupID;
                        targetThreadName = info.threadName || possibleGroupID;
                        // remaining args: command, interval, then message parts (skip group ID)
                        remainingArgs = [args[0], args[1], ...args.slice(3)];
                        return { targetThreadID, targetThreadName, remainingArgs };
                    }
                } catch (e) {}
            }
        } else {
            // No interval given, first arg is command 'add', second arg might be group ID?
            if (/^\d+$/.test(args[1])) {
                const possibleGroupID = args[1];
                try {
                    const info = await api.getThreadInfo(possibleGroupID);
                    if (info.isGroup) {
                        targetThreadID = possibleGroupID;
                        targetThreadName = info.threadName || possibleGroupID;
                        remainingArgs = [args[0], ...args.slice(2)];
                        return { targetThreadID, targetThreadName, remainingArgs };
                    }
                } catch (e) {}
            }
        }
    }

    // Case 3: For other commands, check if any arg is numeric group ID (usually last)
    for (let i = args.length - 1; i >= 0; i--) {
        if (/^\d+$/.test(args[i])) {
            try {
                const info = await api.getThreadInfo(args[i]);
                if (info.isGroup) {
                    targetThreadID = args[i];
                    targetThreadName = info.threadName || args[i];
                    remainingArgs = [...args.slice(0, i), ...args.slice(i + 1)];
                    return { targetThreadID, targetThreadName, remainingArgs };
                }
            } catch (e) {}
        }
    }

    return { targetThreadID, targetThreadName, remainingArgs };
}

module.exports.run = async ({ event, api, args, Threads }) => {
    const { threadID, messageID, senderID } = event;
    
    // Check if user is admin (bot admin)
    const isAdmin = global.config.ADMINBOT.includes(senderID);
    if (!isAdmin) {
        return api.sendMessage("❌ Only bot admins can use this command!", threadID, messageID);
    }

    const cmd = args[0]?.toLowerCase();
    let data;
    let prefix = "";

    // ========== RESET (special case before parsing target) ==========
    if (cmd === "reset") {
        const subArg = args[1]?.toLowerCase();
        
        // Reset all groups
        if (subArg === "all") {
            const files = fs.readdirSync(basePath).filter(f => f.endsWith('.json'));
            let count = 0;
            for (const file of files) {
                const tid = file.replace('automessage_', '').replace('.json', '');
                try {
                    const d = loadData(tid);
                    d.lastSent = {};
                    saveData(tid, d);
                    count++;
                } catch(e) {}
            }
            return api.sendMessage(`✅ Reset lastSent for ${count} group(s).`, threadID, messageID);
        }
        
        // Reset for a specific group (or current)
        let targetThreadID = threadID;
        let targetThreadName = "this group";
        if (args[1] && /^\d+$/.test(args[1])) {
            targetThreadID = args[1];
            try {
                const info = await api.getThreadInfo(targetThreadID);
                if (!info.isGroup) {
                    return api.sendMessage("❌ The provided ID is not a group!", threadID, messageID);
                }
                targetThreadName = info.threadName || targetThreadID;
            } catch(e) {
                return api.sendMessage("❌ Bot is not in the specified group or group doesn't exist!", threadID, messageID);
            }
        }
        
        const d = loadData(targetThreadID);
        d.lastSent = {};
        saveData(targetThreadID, d);
        const resetMsg = targetThreadID === threadID 
            ? "✅ Reset lastSent for this group." 
            : `✅ Reset lastSent for ${targetThreadName}.`;
        return api.sendMessage(resetMsg, threadID, messageID);
    }

    // ========== NORMAL COMMANDS ==========
    const { targetThreadID, targetThreadName, remainingArgs: cmdArgs } = await parseTargetAndArgs(api, args, threadID);
    data = loadData(targetThreadID);
    prefix = targetThreadID === threadID ? "" : `[Target: ${targetThreadName}]\n`;

    // ========== HELP ==========
    if (!cmd || cmd === "help") {
        return api.sendMessage(
            prefix +
            `📖 AUTO MESSAGE COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📝 Message Management:\n` +
            `   /automessage add [interval] [message] [groupID]\n` +
            `   /automessage add [interval] [groupID] [message]\n` +
            `   /automessage add [message] [groupID]\n` +
            `   /automessage list [groupID]\n` +
            `   /automessage removeall [groupID]\n\n` +
            `⚙️ Settings:\n` +
            `   /automessage on [groupID]\n` +
            `   /automessage off [groupID]\n` +
            `   /automessage default [minutes] [groupID]\n` +
            `   /automessage status [groupID]\n\n` +
            `🔄 Reset:\n` +
            `   /automessage reset - Reset lastSent for current group\n` +
            `   /automessage reset [groupID] - Reset lastSent for target group\n` +
            `   /automessage reset all - Reset lastSent for ALL groups\n\n` +
            `📌 Examples:\n` +
            `   /automessage add 5 🌅 Good morning!\n` +
            `   /automessage add 5 123456789 Hello World\n` +
            `   /automessage reset 987654321`,
            threadID, messageID
        );
    }
    
    // ========== ADD MESSAGE ==========
    if (cmd === "add") {
        let interval = null;
        let messageStart = 1;
        
        // Check if first arg is numeric (interval)
        if (cmdArgs[1] && !isNaN(parseInt(cmdArgs[1])) && parseInt(cmdArgs[1]) > 0) {
            interval = parseInt(cmdArgs[1]);
            messageStart = 2;
        }
        
        const message = cmdArgs.slice(messageStart).join(" ");
        if (!message) {
            return api.sendMessage(prefix + `❌ Please enter a message!\n\nExamples:\n   /automessage add 5 Hello\n   /automessage add 5 123456789 Hello`, threadID, messageID);
        }
        
        const newId = Date.now() + "_" + Math.random().toString(36).substr(2, 5);
        data.messages.push({
            id: newId,
            text: message,
            interval: interval || null
        });
        saveData(targetThreadID, data);
        
        const intervalText = interval ? `every ${interval} minutes` : `using default timer (${data.defaultInterval} min)`;
        return api.sendMessage(prefix + `✅ Message added!\n\n📝 ${message.substring(0, 100)}${message.length > 100 ? "..." : ""}\n⏱️ ${intervalText}\n📊 Total: ${data.messages.length}`, threadID, messageID);
    }
    
    // ========== LIST MESSAGES ==========
    if (cmd === "list") {
        if (data.messages.length === 0) {
            return api.sendMessage(prefix + "📋 No messages added yet!\n\n💡 Use /automessage add [message] to add messages.", threadID, messageID);
        }
        let msg = prefix + `📋 MESSAGE LIST for ${targetThreadName}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        for (let i = 0; i < data.messages.length; i++) {
            const m = data.messages[i];
            const intervalText = m.interval ? `⏱️ ${m.interval} min` : `⏱️ Default (${data.defaultInterval} min)`;
            msg += `${i+1}. ${intervalText}\n   ${m.text}\n\n`;
        }
        msg += `━━━━━━━━━━━━━━━━━━━━\n💡 Reply with number to REMOVE\n💡 Reply with "edit [number] [new timer]" to EDIT timer\n💡 Reply with "removeall" to DELETE ALL messages`;
        return api.sendMessage(msg, threadID, (error, info) => {
            if (!error) {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    data: data,
                    threadID: targetThreadID
                });
            }
        }, messageID);
    }
    
    // ========== REMOVE ALL ==========
    if (cmd === "removeall" || cmd === "clear" || cmd === "deleteall") {
        data.messages = [];
        data.lastSent = {};
        saveData(targetThreadID, data);
        return api.sendMessage(prefix + `✅ ALL MESSAGES CLEARED!\n\n📊 Total messages: 0\n💡 Add new messages: /automessage add [message]`, threadID, messageID);
    }
    
    // ========== ENABLE ==========
    if (cmd === "on") {
        if (data.messages.length === 0) {
            return api.sendMessage(prefix + `❌ Cannot enable! No messages added.\n\n💡 First add messages: /automessage add [message]`, threadID, messageID);
        }
        data.enabled = true;
        saveData(targetThreadID, data);
        return api.sendMessage(prefix + `✅ AUTO MESSAGE ENABLED for ${targetThreadName}\n━━━━━━━━━━━━━━━━━━━━\n\n📝 ${data.messages.length} messages in queue\n⏱️ Default: ${data.defaultInterval} min`, threadID, messageID);
    }
    
    // ========== DISABLE ==========
    if (cmd === "off") {
        data.enabled = false;
        saveData(targetThreadID, data);
        return api.sendMessage(prefix + `❌ AUTO MESSAGE DISABLED for ${targetThreadName}\n\nNo more automatic messages will be sent.`, threadID, messageID);
    }
    
    // ========== SET DEFAULT INTERVAL ==========
    if (cmd === "default") {
        const interval = parseInt(cmdArgs[1]);
        if (isNaN(interval) || interval < 1 || interval > 1440) {
            return api.sendMessage(prefix + `❌ Invalid interval! Enter 1-1440 minutes.\n\nExample: /automessage default 30 [groupID]`, threadID, messageID);
        }
        data.defaultInterval = interval;
        saveData(targetThreadID, data);
        return api.sendMessage(prefix + `✅ Default interval set to ${interval} minutes for ${targetThreadName}!`, threadID, messageID);
    }
    
    // ========== STATUS ==========
    if (cmd === "status") {
        let msgWithTimer = 0;
        let msgWithDefault = 0;
        
        for (const m of data.messages) {
            if (m.interval) msgWithTimer++;
            else msgWithDefault++;
        }
        
        return api.sendMessage(
            prefix +
            `📊 AUTO MESSAGE STATUS for ${targetThreadName}\n━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🔘 Status: ${data.enabled ? "✅ ENABLED" : "❌ DISABLED"}\n` +
            `⏱️ Default: ${data.defaultInterval} minutes\n` +
            `📝 Messages: ${data.messages.length}\n` +
            `   • Custom timer: ${msgWithTimer}\n` +
            `   • Default timer: ${msgWithDefault}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💡 /automessage add [min] [msg] [groupID]\n` +
            `💡 /automessage list [groupID]\n` +
            `💡 /automessage on/off [groupID]`,
            threadID, messageID
        );
    }
    
    return api.sendMessage(prefix + `❌ Unknown command!\n\nUse /automessage help`, threadID, messageID);
};

// ========== HANDLE REPLY FOR REMOVE/EDIT/REMOVEALL ==========
module.exports.handleReply = async function({ event, api, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    const { author, threadID: targetThread } = handleReply;
    
    if (senderID != author) return;
    
    const currentData = loadData(targetThread);
    const reply = body.toLowerCase().trim();
    
    if (reply === "removeall") {
        currentData.messages = [];
        currentData.lastSent = {};
        saveData(targetThread, currentData);
        return api.sendMessage(`✅ ALL MESSAGES CLEARED!\n\n📊 Total messages: 0`, threadID, messageID);
    }
    
    if (reply.startsWith("edit")) {
        const parts = body.split(" ");
        if (parts.length < 3) {
            return api.sendMessage(`❌ Invalid format!\n\nUse: edit [number] [new timer]\nExample: edit 2 10`, threadID, messageID);
        }
        
        const num = parseInt(parts[1]);
        const newTimer = parseInt(parts[2]);
        
        if (isNaN(num) || num < 1 || num > currentData.messages.length) {
            return api.sendMessage(`❌ Invalid message number!`, threadID, messageID);
        }
        
        if (newTimer === 0) {
            currentData.messages[num-1].interval = null;
            saveData(targetThread, currentData);
            return api.sendMessage(`✅ Message ${num} will now use DEFAULT timer (${currentData.defaultInterval} minutes)!`, threadID, messageID);
        }
        
        if (isNaN(newTimer) || newTimer < 1 || newTimer > 1440) {
            return api.sendMessage(`❌ Invalid timer! Enter 1-1440 minutes, or 0 to use default.`, threadID, messageID);
        }
        
        currentData.messages[num-1].interval = newTimer;
        saveData(targetThread, currentData);
        return api.sendMessage(`✅ Message ${num} timer updated to ${newTimer} minutes!`, threadID, messageID);
    }
    
    const num = parseInt(body);
    if (isNaN(num) || num < 1 || num > currentData.messages.length) {
        return api.sendMessage(`❌ Invalid number! Use /automessage list to see numbers.`, threadID, messageID);
    }
    
    const removed = currentData.messages.splice(num-1, 1);
    delete currentData.lastSent[removed[0].id];
    saveData(targetThread, currentData);
    
    return api.sendMessage(`✅ Removed message #${num}: "${removed[0].text.substring(0, 50)}..."\n📊 Remaining: ${currentData.messages.length} messages`, threadID, messageID);
};