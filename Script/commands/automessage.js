const fs = require("fs-extra");
const moment = require("moment-timezone");

module.exports.config = {
    name: "automessage",
    version: "3.0.0",
    credits: "MQL1 Community",
    description: "Auto send messages in current group with individual timers",
    commandCategory: "system",
    usages: "add/list/on/off/default/status",
    cooldowns: 5
};

// Data storage path (per group)
function getDataPath(threadID) {
    return __dirname + "/cache/automessage_" + threadID + ".json";
}

// Load data for specific group
function loadData(threadID) {
    const path = getDataPath(threadID);
    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, JSON.stringify({ messages: [], enabled: false, defaultInterval: 60, lastSent: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(path, "utf-8"));
}

// Save data for specific group
function saveData(threadID, data) {
    const path = getDataPath(threadID);
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// Send message to current group
async function sendToGroup(api, threadID, message) {
    try {
        await api.sendMessage(message, threadID);
    } catch(e) {
        console.log("Send error:", e);
    }
}

// Check and send scheduled messages for a group
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

// Check all groups every minute
setInterval(async () => {
    const { api } = global.client;
    if (!api) return;
    
    const allThread = global.data.allThreadID || [];
    for (const tid of allThread) {
        await checkAndSendForGroup(api, tid);
    }
}, 60000);

module.exports.run = async ({ event, api, args, Threads }) => {
    const { threadID, messageID, senderID } = event;
    let data = loadData(threadID);
    
    // Check if user is admin
    const isAdmin = global.config.ADMINBOT.includes(senderID);
    
    if (!isAdmin) {
        return api.sendMessage("❌ Only bot admins can use this command!", threadID, messageID);
    }
    
    const cmd = args[0]?.toLowerCase();
    
    // ========== HELP ==========
    if (!cmd || cmd === "help") {
        return api.sendMessage(
            `📖 AUTO MESSAGE COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📝 Message Management:\n` +
            `   /automessage add [interval] [message] - Add message with timer\n` +
            `   /automessage add [message] - Add message (uses default timer)\n` +
            `   /automessage list - Show all messages\n` +
            `   /automessage removeall - Remove ALL messages\n\n` +
            `⚙️ Settings:\n` +
            `   /automessage on - Enable auto send\n` +
            `   /automessage off - Disable auto send\n` +
            `   /automessage default [minutes] - Set default interval (1-1440)\n` +
            `   /automessage status - Show current settings\n\n` +
            `📌 Examples:\n` +
            `   /automessage add 5 🌅 Good morning!\n` +
            `   /automessage add 📢 Reminder!`,
            threadID, messageID
        );
    }
    
    // ========== ADD MESSAGE ==========
    if (cmd === "add") {
        let interval = null;
        let messageStart = 1;
        
        if (args[1] && !isNaN(parseInt(args[1])) && parseInt(args[1]) > 0) {
            interval = parseInt(args[1]);
            messageStart = 2;
        }
        
        const message = args.slice(messageStart).join(" ");
        if (!message) {
            return api.sendMessage(`❌ Please enter a message!\n\nExamples:\n   /automessage add 5 Hello\n   /automessage add Hello`, threadID, messageID);
        }
        
        const newId = Date.now() + "_" + Math.random().toString(36).substr(2, 5);
        data.messages.push({
            id: newId,
            text: message,
            interval: interval || null
        });
        saveData(threadID, data);
        
        const intervalText = interval ? `every ${interval} minutes` : `using default timer (${data.defaultInterval} min)`;
        return api.sendMessage(`✅ Message added!\n\n📝 ${message.substring(0, 100)}${message.length > 100 ? "..." : ""}\n⏱️ ${intervalText}\n📊 Total: ${data.messages.length}`, threadID, messageID);
    }
    
    // ========== LIST MESSAGES ==========
    if (cmd === "list") {
        if (data.messages.length === 0) {
            return api.sendMessage("📋 No messages added yet!\n\n💡 Use /automessage add [message] to add messages.", threadID, messageID);
        }
        let msg = `📋 MESSAGE LIST\n━━━━━━━━━━━━━━━━━━━━\n\n`;
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
                    threadID: threadID
                });
            }
        }, messageID);
    }
    
    // ========== REMOVE ALL ==========
    if (cmd === "removeall" || cmd === "clear" || cmd === "deleteall") {
        data.messages = [];
        data.lastSent = {};
        saveData(threadID, data);
        return api.sendMessage(`✅ ALL MESSAGES CLEARED!\n\n📊 Total messages: 0\n💡 Add new messages: /automessage add [message]`, threadID, messageID);
    }
    
    // ========== ENABLE ==========
    if (cmd === "on") {
        if (data.messages.length === 0) {
            return api.sendMessage(`❌ Cannot enable! No messages added.\n\n💡 First add messages: /automessage add [message]`, threadID, messageID);
        }
        data.enabled = true;
        saveData(threadID, data);
        return api.sendMessage(`✅ AUTO MESSAGE ENABLED\n━━━━━━━━━━━━━━━━━━━━\n\n📝 ${data.messages.length} messages in queue\n⏱️ Default: ${data.defaultInterval} min`, threadID, messageID);
    }
    
    // ========== DISABLE ==========
    if (cmd === "off") {
        data.enabled = false;
        saveData(threadID, data);
        return api.sendMessage(`❌ AUTO MESSAGE DISABLED\n\nNo more automatic messages will be sent.`, threadID, messageID);
    }
    
    // ========== SET DEFAULT INTERVAL ==========
    if (cmd === "default") {
        const interval = parseInt(args[1]);
        if (isNaN(interval) || interval < 1 || interval > 1440) {
            return api.sendMessage(`❌ Invalid interval! Enter 1-1440 minutes.\n\nExample: /automessage default 30`, threadID, messageID);
        }
        data.defaultInterval = interval;
        saveData(threadID, data);
        return api.sendMessage(`✅ Default interval set to ${interval} minutes!`, threadID, messageID);
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
            `📊 AUTO MESSAGE STATUS\n━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🔘 Status: ${data.enabled ? "✅ ENABLED" : "❌ DISABLED"}\n` +
            `⏱️ Default: ${data.defaultInterval} minutes\n` +
            `📝 Messages: ${data.messages.length}\n` +
            `   • Custom timer: ${msgWithTimer}\n` +
            `   • Default timer: ${msgWithDefault}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💡 /automessage add [min] [msg]\n` +
            `💡 /automessage list\n` +
            `💡 /automessage on/off`,
            threadID, messageID
        );
    }
    
    // Unknown command
    return api.sendMessage(`❌ Unknown command!\n\nUse /automessage help`, threadID, messageID);
};

// ========== HANDLE REPLY FOR REMOVE/EDIT/REMOVEALL ==========
module.exports.handleReply = async function({ event, api, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    const { author, threadID: targetThread } = handleReply;
    
    if (senderID != author) return;
    
    const currentData = loadData(targetThread);
    const reply = body.toLowerCase().trim();
    
    // ========== REMOVE ALL ==========
    if (reply === "removeall") {
        currentData.messages = [];
        currentData.lastSent = {};
        saveData(targetThread, currentData);
        return api.sendMessage(`✅ ALL MESSAGES CLEARED!\n\n📊 Total messages: 0`, threadID, messageID);
    }
    
    // ========== EDIT TIMER ==========
    if (reply.startsWith("edit")) {
        const parts = body.split(" ");
        if (parts.length < 3) {
            return api.sendMessage(`❌ Invalid format!\n\nUse: edit [number] [new timer]\nExample: edit 2 10 (sets message 2 to 10 minutes)\n\n💡 To remove custom timer: edit 2 0 (uses default timer)`, threadID, messageID);
        }
        
        const num = parseInt(parts[1]);
        const newTimer = parseInt(parts[2]);
        
        if (isNaN(num) || num < 1 || num > currentData.messages.length) {
            return api.sendMessage(`❌ Invalid message number! Use /automessage list to see numbers.`, threadID, messageID);
        }
        
        // If timer is 0, remove custom timer (use default)
        if (newTimer === 0) {
            currentData.messages[num-1].interval = null;
            saveData(targetThread, currentData);
            return api.sendMessage(`✅ Message ${num} will now use DEFAULT timer (${currentData.defaultInterval} minutes)!`, threadID, messageID);
        }
        
        // Otherwise set custom timer
        if (isNaN(newTimer) || newTimer < 1 || newTimer > 1440) {
            return api.sendMessage(`❌ Invalid timer! Enter 1-1440 minutes, or 0 to use default.`, threadID, messageID);
        }
        
        currentData.messages[num-1].interval = newTimer;
        saveData(targetThread, currentData);
        
        return api.sendMessage(`✅ Message ${num} timer updated to ${newTimer} minutes!`, threadID, messageID);
    }
    
    // ========== REMOVE BY NUMBER ==========
    const num = parseInt(body);
    if (isNaN(num) || num < 1 || num > currentData.messages.length) {
        return api.sendMessage(`❌ Invalid number! Use /automessage list to see numbers.\n\n💡 Commands:\n   [number] - Remove message\n   edit [num] [timer] - Edit timer\n   removeall - Delete all`, threadID, messageID);
    }
    
    const removed = currentData.messages.splice(num-1, 1);
    delete currentData.lastSent[removed[0].id];
    saveData(targetThread, currentData);
    
    return api.sendMessage(`✅ Removed message #${num}: "${removed[0].text.substring(0, 50)}..."\n📊 Remaining: ${currentData.messages.length} messages`, threadID, messageID);
};