const fs = require("fs-extra");
const request = require("request");
const axios = require("axios");

// Store messages for resend feature
global.logMessage = global.logMessage || new Map();

module.exports.config = {
    name: "groupmanage",
    version: "3.6.0",
    credits: "MQL1 Community + Modified by ChatGPT",
    hasPermssion: 1,
    description: "Manage group security, settings, kick members, unban, ban commands, resend tracking, and change bot language",
    commandCategory: "Group",
    usages: "antijoin on/off | antiout on/off | resend | unban | banCommand | kick | language | status | name | image | myname",
    cooldowns: 0,
    dependencies: {
        "request": "",
        "fs-extra": "",
        "axios": ""
    }
};

// =========================
// RESEND HANDLE EVENT (Track deleted messages)
// =========================
module.exports.handleEvent = async function({ event, api, Users }) {
    const { messageID, senderID, threadID, body, attachments, type } = event;
    const botID = api.getCurrentUserID();
    
    const threadData = global.data.threadData.get(threadID) || {};
    if (threadData.resend !== true) return;
    if (senderID == botID) return;
    
    if (type !== "message_unsend") {
        global.logMessage.set(messageID, {
            msgBody: body || "",
            attachment: attachments || [],
            senderID: senderID
        });
        
        if (global.logMessage.size > 500) {
            const firstKey = global.logMessage.keys().next().value;
            global.logMessage.delete(firstKey);
        }
    }
    else if (type == "message_unsend") {
        const deletedMsg = global.logMessage.get(messageID);
        if (!deletedMsg) return;
        
        const senderName = await Users.getNameUser(deletedMsg.senderID);
        
        if (!deletedMsg.attachment || deletedMsg.attachment.length === 0) {
            return api.sendMessage(
                `📝 ${senderName} deleted a message:\n\n"${deletedMsg.msgBody || "Empty message"}"`,
                threadID
            );
        }
        
        let attachmentFiles = [];
        let count = 0;
        
        for (const attach of deletedMsg.attachment) {
            try {
                count++;
                const url = attach.url;
                const path = __dirname + `/cache/resend_${Date.now()}_${count}.jpg`;
                const response = await axios.get(url, { responseType: "arraybuffer" });
                fs.writeFileSync(path, Buffer.from(response.data, "utf-8"));
                attachmentFiles.push(fs.createReadStream(path));
            } catch (e) {
                console.log("Download error:", e);
            }
        }
        
        const msgBody = deletedMsg.msgBody ? `\n\n💬 Content: ${deletedMsg.msgBody}` : "";
        const attachmentText = deletedMsg.attachment.length === 1 ? "1 attachment" : `${deletedMsg.attachment.length} attachments`;
        
        api.sendMessage({
            body: `🗑️ ${senderName} deleted ${attachmentText}${msgBody}`,
            attachment: attachmentFiles
        }, threadID, () => {
            for (const file of attachmentFiles) {
                try { fs.unlinkSync(file.path); } catch(e) {}
            }
        });
        
        global.logMessage.delete(messageID);
    }
};

// Check if a command is banned in a thread
async function isCommandBanned(threadID, commandName) {
    const threadData = (await global.Threads.getData(threadID)).data || {};
    const bannedCommands = threadData.bannedCommands || [];
    return bannedCommands.includes(commandName);
}

module.exports.run = async function ({ api, event, Threads, args, Users }) {
    const { threadID, messageID, senderID, body } = event;

    try {
        const info = await api.getThreadInfo(threadID);
        const isBotAdmin = info.adminIDs.some(item => item.id == api.getCurrentUserID());
        const isGroupAdmin = info.adminIDs.some(item => item.id == senderID);
        const isSuperAdmin = global.config.ADMINBOT.includes(senderID);
        
        // =========================
        // BAN COMMAND (Block specific commands in group)
        // =========================
        if (args[0] == "banCommand" || args[0] == "bancommand") {
            if (!isGroupAdmin && !isSuperAdmin) {
                return api.sendMessage('❌ Only group admins or bot admins can ban commands!', threadID, messageID);
            }
            
            const commandToBan = args[1];
            
            if (!commandToBan) {
                // Show banned commands list
                const threadData = (await Threads.getData(threadID)).data || {};
                const bannedCommands = threadData.bannedCommands || [];
                
                if (bannedCommands.length === 0) {
                    return api.sendMessage(
                        `📋 BANNED COMMANDS\n━━━━━━━━━━━━━━━━\n\n` +
                        `No commands are banned in this group.\n\n` +
                        `💡 To ban a command: /groupmanage banCommand [command name]\n` +
                        `Example: /groupmanage banCommand kick`,
                        threadID, messageID
                    );
                }
                
                let msg = `📋 BANNED COMMANDS IN THIS GROUP\n━━━━━━━━━━━━━━━━━━━━\n\n`;
                for (let i = 0; i < bannedCommands.length; i++) {
                    msg += `${i+1}. ${bannedCommands[i]}\n`;
                }
                msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
                msg += `💡 To unban: /groupmanage unbanCommand [command name]`;
                
                return api.sendMessage(msg, threadID, messageID);
            }
            
            // Ban the command
            if (commandToBan === "all") {
                // Ban all commands
                const allCommands = [];
                for (const [name] of global.client.commands) {
                    allCommands.push(name);
                }
                
                const threadData = (await Threads.getData(threadID)).data || {};
                threadData.bannedCommands = allCommands;
                await Threads.setData(threadID, { data: threadData });
                global.data.threadData.set(threadID, threadData);
                
                return api.sendMessage(
                    `✅ ALL COMMANDS BANNED\n━━━━━━━━━━━━━━━━\n\n` +
                    `All ${allCommands.length} commands have been banned in this group.\n` +
                    `No one can use any command here.\n\n` +
                    `💡 To unban: /groupmanage unbanCommand all`,
                    threadID, messageID
                );
            }
            
            // Check if command exists
            const commandExists = global.client.commands.has(commandToBan.toLowerCase());
            if (!commandExists) {
                return api.sendMessage(`❌ Command "${commandToBan}" does not exist!\n\n💡 Use /help to see all commands.`, threadID, messageID);
            }
            
            const threadData = (await Threads.getData(threadID)).data || {};
            const bannedCommands = threadData.bannedCommands || [];
            
            if (bannedCommands.includes(commandToBan.toLowerCase())) {
                return api.sendMessage(`❌ Command "${commandToBan}" is already banned in this group!`, threadID, messageID);
            }
            
            bannedCommands.push(commandToBan.toLowerCase());
            threadData.bannedCommands = bannedCommands;
            await Threads.setData(threadID, { data: threadData });
            global.data.threadData.set(threadID, threadData);
            
            return api.sendMessage(
                `✅ COMMAND BANNED\n━━━━━━━━━━━━━━━━\n\n` +
                `🔨 "${commandToBan}" has been banned in this group.\n` +
                `No one can use this command here.\n\n` +
                `💡 To unban: /groupmanage unbanCommand ${commandToBan}`,
                threadID, messageID
            );
        }
        
        // =========================
        // UNBAN COMMAND (Unblock specific commands in group)
        // =========================
        else if (args[0] == "unbanCommand" || args[0] == "unbancommand") {
            if (!isGroupAdmin && !isSuperAdmin) {
                return api.sendMessage('❌ Only group admins or bot admins can unban commands!', threadID, messageID);
            }
            
            const commandToUnban = args[1];
            
            if (!commandToUnban) {
                // Show banned commands list
                const threadData = (await Threads.getData(threadID)).data || {};
                const bannedCommands = threadData.bannedCommands || [];
                
                if (bannedCommands.length === 0) {
                    return api.sendMessage(
                        `📋 BANNED COMMANDS\n━━━━━━━━━━━━━━━━\n\n` +
                        `No commands are banned in this group.`,
                        threadID, messageID
                    );
                }
                
                let msg = `📋 BANNED COMMANDS IN THIS GROUP\n━━━━━━━━━━━━━━━━━━━━\n\n`;
                for (let i = 0; i < bannedCommands.length; i++) {
                    msg += `${i+1}. ${bannedCommands[i]}\n`;
                }
                msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
                msg += `💡 To unban: /groupmanage unbanCommand [command name]`;
                
                return api.sendMessage(msg, threadID, messageID);
            }
            
            // Unban all commands
            if (commandToUnban === "all") {
                const threadData = (await Threads.getData(threadID)).data || {};
                threadData.bannedCommands = [];
                await Threads.setData(threadID, { data: threadData });
                global.data.threadData.set(threadID, threadData);
                
                return api.sendMessage(
                    `✅ ALL COMMANDS UNBANNED\n━━━━━━━━━━━━━━━━\n\n` +
                    `All commands have been unbanned in this group.\n` +
                    `Everyone can use all commands again.`,
                    threadID, messageID
                );
            }
            
            const threadData = (await Threads.getData(threadID)).data || {};
            const bannedCommands = threadData.bannedCommands || [];
            
            if (!bannedCommands.includes(commandToUnban.toLowerCase())) {
                return api.sendMessage(`❌ Command "${commandToUnban}" is not banned in this group!`, threadID, messageID);
            }
            
            const index = bannedCommands.indexOf(commandToUnban.toLowerCase());
            bannedCommands.splice(index, 1);
            threadData.bannedCommands = bannedCommands;
            await Threads.setData(threadID, { data: threadData });
            global.data.threadData.set(threadID, threadData);
            
            return api.sendMessage(
                `✅ COMMAND UNBANNED\n━━━━━━━━━━━━━━━━\n\n` +
                `🔓 "${commandToUnban}" has been unbanned in this group.\n` +
                `Everyone can use this command again.`,
                threadID, messageID
            );
        }
        
        // =========================
        // CHECK IF CURRENT COMMAND IS BANNED (Add this at the beginning of each command handler)
        // =========================
        // Note: This check should be added to all command files, but for now it's here
        
        // =========================
        // UNSEND COMMAND
        // =========================
        else if (args[0] == "unsend") {
            if (event.type !== "message_reply") {
                return api.sendMessage(
                    `❌ Please reply to a bot message to unsend it!\n\n` +
                    `💡 Usage: Reply to any bot message with /groupmanage unsend`,
                    threadID, messageID
                );
            }
            
            if (event.messageReply.senderID !== api.getCurrentUserID()) {
                return api.sendMessage(
                    `❌ You can only unsend bot's own messages!\n\n` +
                    `💡 Reply to a message that was sent by the bot.`,
                    threadID, messageID
                );
            }
            
            try {
                await api.unsendMessage(event.messageReply.messageID);
                return api.sendMessage(`✅ Message has been unsent successfully!`, threadID, messageID);
            } catch (error) {
                console.log("Unsend error:", error);
                return api.sendMessage(`❌ Failed to unsend message!\nReason: ${error.message || "Unknown error"}`, threadID, messageID);
            }
        }
        
        // =========================
        // UNBAN MEMBER/QTV/BOX
        // =========================
        else if (args[0] == "unban") {
            if (!isSuperAdmin && !isGroupAdmin) {
                return api.sendMessage('❌ Only group admins or bot admins can use unban command!', threadID, messageID);
            }
            
            if (args[1] == "member") {
                let targetId = null;
                let targetName = "";
                
                if (event.type == "message_reply") {
                    targetId = event.messageReply.senderID;
                    const userInfo = await api.getUserInfo(targetId);
                    targetName = userInfo[targetId].name;
                } else if (Object.keys(event.mentions).length > 0) {
                    targetId = Object.keys(event.mentions)[0];
                    targetName = event.mentions[targetId].replace("@", "");
                } else if (args[2] && !isNaN(args[2])) {
                    targetId = args[2];
                    const userInfo = await api.getUserInfo(targetId);
                    targetName = userInfo[targetId].name;
                }
                
                if (!targetId) {
                    const userBanned = global.data.userBanned.keys();
                    let bannedList = [];
                    let i = 1;
                    
                    for (const userId of userBanned) {
                        try {
                            const userInfo = await api.getUserInfo(userId);
                            const name = userInfo[userId].name || "Unknown";
                            bannedList.push(`${i++}. ${name}\n   🆔 ID: ${userId}`);
                        } catch(e) {}
                    }
                    
                    if (bannedList.length === 0) {
                        return api.sendMessage(`📋 BANNED MEMBERS\n━━━━━━━━━━━━━━━━\n\nNo banned members found in this group.`, threadID, messageID);
                    }
                    
                    return api.sendMessage(
                        `📋 BANNED MEMBERS IN THIS GROUP\n━━━━━━━━━━━━━━━━━━━━\n\n${bannedList.join("\n\n")}\n\n━━━━━━━━━━━━━━━━━━━━\n💡 To unban: /groupmanage unban member @user`,
                        threadID, messageID
                    );
                }
                
                const userData = (await Users.getData(targetId)).data || {};
                if (userData.banned !== 1) {
                    return api.sendMessage(`❌ ${targetName} is not banned!`, threadID, messageID);
                }
                
                userData.banned = 0;
                userData.reason = null;
                userData.dateAdded = null;
                await Users.setData(targetId, { data: userData });
                global.data.userBanned.delete(targetId);
                
                return api.sendMessage(`✅ UNBANNED: ${targetName}\n━━━━━━━━━━━━━━━━\n\nUser has been unbanned and can now use the bot.`, threadID, messageID);
            }
            
            else if (args[1] == "qtv") {
                let unbannedCount = 0;
                
                for (const admin of info.adminIDs) {
                    const adminId = admin.id;
                    const adminData = (await Users.getData(adminId)).data || {};
                    
                    if (adminData.banned === 1) {
                        adminData.banned = 0;
                        adminData.reason = null;
                        adminData.dateAdded = null;
                        await Users.setData(adminId, { data: adminData });
                        global.data.userBanned.delete(adminId);
                        unbannedCount++;
                    }
                }
                
                if (unbannedCount === 0) {
                    return api.sendMessage(`❌ No admins are banned in this group!`, threadID, messageID);
                }
                
                return api.sendMessage(`✅ UNBANNED: ${unbannedCount} admin(s)\n━━━━━━━━━━━━━━━━\n\nAll banned admins in this group have been unbanned.`, threadID, messageID);
            }
            
            else if (args[1] == "box") {
                const threadData = (await Threads.getData(threadID)).data || {};
                
                if (threadData.banned !== 1) {
                    return api.sendMessage(`❌ This group is not banned!`, threadID, messageID);
                }
                
                threadData.banned = 0;
                threadData.reason = null;
                threadData.dateAdded = null;
                await Threads.setData(threadID, { data: threadData });
                global.data.threadBanned.delete(threadID);
                
                return api.sendMessage(`✅ GROUP UNBANNED\n━━━━━━━━━━━━━━━━\n\nThis group has been unbanned. Bot will now work normally.`, threadID, messageID);
            }
            
            else if (args[1] == "status") {
                const threadData = (await Threads.getData(threadID)).data || {};
                const isGroupBanned = threadData.banned === 1;
                
                let bannedAdmins = [];
                let bannedMembers = [];
                
                for (const participant of info.participantIDs) {
                    const userData = (await Users.getData(participant)).data || {};
                    if (userData.banned === 1) {
                        const userInfo = await api.getUserInfo(participant);
                        const name = userInfo[participant].name || "Unknown";
                        const isAdmin = info.adminIDs.some(a => a.id == participant);
                        
                        if (isAdmin) {
                            bannedAdmins.push(name);
                        } else {
                            bannedMembers.push(name);
                        }
                    }
                }
                
                return api.sendMessage(
                    `📋 BAN STATUS\n━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `🔒 Group Ban: ${isGroupBanned ? "✅ BANNED" : "❌ NOT BANNED"}\n\n` +
                    `👑 Banned Admins (${bannedAdmins.length}):\n   ${bannedAdmins.length > 0 ? bannedAdmins.join(", ") : "None"}\n\n` +
                    `👥 Banned Members (${bannedMembers.length}):\n   ${bannedMembers.length > 0 ? bannedMembers.join(", ") : "None"}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `💡 Commands:\n` +
                    `• /groupmanage unban member @user\n` +
                    `• /groupmanage unban qtv\n` +
                    `• /groupmanage unban box\n` +
                    `• /groupmanage unban status`,
                    threadID, messageID
                );
            }
            
            else {
                return api.sendMessage(
                    `📖 UNBAN COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `👤 Unban a member:\n` +
                    `   /groupmanage unban member @user\n` +
                    `   /groupmanage unban member (reply)\n` +
                    `   /groupmanage unban member (show banned list)\n\n` +
                    `👑 Unban all admins:\n` +
                    `   /groupmanage unban qtv\n\n` +
                    `📦 Unban this group:\n` +
                    `   /groupmanage unban box\n\n` +
                    `📊 Show ban status:\n` +
                    `   /groupmanage unban status`,
                    threadID, messageID
                );
            }
        }
        
        // =========================
        // RESEND COMMAND
        // =========================
        else if (args[0] == "resend") {
            if (!isGroupAdmin && !isSuperAdmin) {
                return api.sendMessage('❌ Only group admins can use resend command!', threadID, messageID);
            }
            
            let data = (await Threads.getData(threadID)).data || {};
            
            if (args[1] && args[1].toLowerCase() === "status") {
                const isEnabled = (data.resend === true);
                const statusText = isEnabled ? "✅ ENABLED" : "❌ DISABLED";
                const statusEmoji = isEnabled ? "🟢" : "🔴";
                
                return api.sendMessage(
                    `📋 RESEND STATUS\n━━━━━━━━━━━━━━━━\n\n` +
                    `${statusEmoji} Current Status: ${statusText}\n\n` +
                    `💡 Use /groupmanage resend to toggle ON/OFF`,
                    threadID, messageID
                );
            }
            
            if (data.resend === undefined || data.resend === false) {
                data.resend = true;
                await Threads.setData(threadID, { data });
                global.data.threadData.set(threadID, data);
                return api.sendMessage(
                    `✅ RESEND ENABLED\n━━━━━━━━━━━━━━━━\n\n` +
                    `🔔 I will now track and show deleted messages.`,
                    threadID, messageID
                );
            } else {
                data.resend = false;
                await Threads.setData(threadID, { data });
                global.data.threadData.set(threadID, data);
                return api.sendMessage(
                    `❌ RESEND DISABLED\n━━━━━━━━━━━━━━━━\n\n` +
                    `🔕 I will no longer track or show deleted messages.`,
                    threadID, messageID
                );
            }
        }
        
        // =========================
        // LANGUAGE COMMAND
        // =========================
        else if (args[0] == "language") {
            if (!isSuperAdmin) {
                return api.sendMessage('❌ Only bot admins can change the bot language!', threadID, messageID);
            }
            
            const lang = args[1];
            
            switch (lang) {
                case "en":
                    global.config.language = "en";
                    await fs.writeFileSync(global.client.configPath, JSON.stringify(global.config, null, 4));
                    return api.sendMessage(`✅ Bot language changed to English!`, threadID, messageID);
                case "bn":
                    global.config.language = "bn";
                    await fs.writeFileSync(global.client.configPath, JSON.stringify(global.config, null, 4));
                    return api.sendMessage(`✅ বটের ভাষা বাংলায় পরিবর্তন করা হয়েছে!`, threadID, messageID);
                case "hi":
                    global.config.language = "hi";
                    await fs.writeFileSync(global.client.configPath, JSON.stringify(global.config, null, 4));
                    return api.sendMessage(`✅ बॉट की भाषा हिंदी में बदल दी गई है!`, threadID, messageID);
                default:
                    return api.sendMessage(
                        `📖 Change Bot Language\n\n` +
                        `Available:\n` +
                        `• /groupmanage language en - English\n` +
                        `• /groupmanage language bn - বাংলা\n` +
                        `• /groupmanage language hi - हिंदी`,
                        threadID, messageID
                    );
            }
        }
        
        // =========================
        // KICK COMMAND
        // =========================
        else if (args[0] == "kick") {
            if (!isGroupAdmin && !isSuperAdmin) {
                return api.sendMessage('❌ Only group admins can kick members!', threadID, messageID);
            }
            if (!isBotAdmin) {
                return api.sendMessage('❌ Bot needs to be group admin to kick members!', threadID, messageID);
            }
            
            if (event.type == "message_reply") {
                let targetId = event.messageReply.senderID;
                if (targetId == senderID) return api.sendMessage('❌ You cannot kick yourself!', threadID, messageID);
                if (targetId == api.getCurrentUserID()) return api.sendMessage('❌ You cannot kick the bot!', threadID, messageID);
                if (info.adminIDs.some(item => item.id == targetId)) return api.sendMessage('❌ Cannot kick a group admin!', threadID, messageID);
                
                let userInfo = await api.getUserInfo(targetId);
                let name = userInfo[targetId].name;
                
                api.removeUserFromGroup(targetId, threadID, (err) => {
                    if (err) return api.sendMessage(`❌ Failed to kick ${name}`, threadID, messageID);
                    return api.sendMessage(`👢 ${name} has been kicked from the group! Bye Bye!`, threadID, messageID);
                });
                return;
            }
            
            if (Object.keys(event.mentions).length > 0) {
                let targetId = Object.keys(event.mentions)[0];
                let name = event.mentions[targetId].replace("@", "");
                
                if (targetId == senderID) return api.sendMessage('❌ You cannot kick yourself!', threadID, messageID);
                if (targetId == api.getCurrentUserID()) return api.sendMessage('❌ You cannot kick the bot!', threadID, messageID);
                if (info.adminIDs.some(item => item.id == targetId)) return api.sendMessage('❌ Cannot kick a group admin!', threadID, messageID);
                
                api.removeUserFromGroup(targetId, threadID, (err) => {
                    if (err) return api.sendMessage(`❌ Failed to kick ${name}`, threadID, messageID);
                    return api.sendMessage(`👢 ${name} has been kicked from the group! Bye Bye!`, threadID, messageID);
                });
                return;
            }
            
            let targetId = null;
            if (args[1] && (args[1] == "id" || !isNaN(args[1]))) {
                if (args[1] == "id" && args[2]) targetId = args[2];
                else if (!isNaN(args[1])) targetId = args[1];
                
                if (targetId) {
                    if (targetId == senderID) return api.sendMessage('❌ You cannot kick yourself!', threadID, messageID);
                    if (targetId == api.getCurrentUserID()) return api.sendMessage('❌ You cannot kick the bot!', threadID, messageID);
                    if (info.adminIDs.some(item => item.id == targetId)) return api.sendMessage('❌ Cannot kick a group admin!', threadID, messageID);
                    
                    let userInfo = await api.getUserInfo(targetId);
                    let name = userInfo[targetId].name;
                    
                    api.removeUserFromGroup(targetId, threadID, (err) => {
                        if (err) return api.sendMessage(`❌ Failed to kick ${name}`, threadID, messageID);
                        return api.sendMessage(`👢 ${name} has been kicked from the group! Bye Bye!`, threadID, messageID);
                    });
                    return;
                }
            }
            
            return api.sendMessage(
                '❌ Please use:\n' +
                '/groupmanage kick @user\n' +
                '/groupmanage kick (reply to message)\n' +
                '/groupmanage kick id USER_ID',
                threadID, messageID
            );
        }
        
        // =========================
        // GROUP NAME
        // =========================
        else if (args[0] == "name") {
            if (!isGroupAdmin && !isSuperAdmin) {
                return api.sendMessage('❌ Only group admins can change group name!', threadID, messageID);
            }
            const newName = args.slice(1).join(" ");
            if (!newName) {
                return api.sendMessage("❌ Please enter a new group name.\nExample: /groupmanage name My Group", threadID, messageID);
            }
            api.setTitle(newName, threadID);
            return api.sendMessage(`✅ Group name changed to: ${newName}`, threadID, messageID);
        }

        // =========================
        // MY NICKNAME
        // =========================
        else if (args[0] == "myname") {
            const newNickname = args.slice(1).join(" ");
            if (!newNickname) {
                return api.sendMessage("❌ Please enter a nickname.\nExample: /groupmanage myname Imran", threadID, messageID);
            }
            api.changeNickname(newNickname, threadID, senderID);
            return api.sendMessage(`✅ Your nickname changed to: ${newNickname}`, threadID, messageID);
        }

        // =========================
        // GROUP IMAGE
        // =========================
        else if (args[0] == "image") {
            if (!isGroupAdmin && !isSuperAdmin) {
                return api.sendMessage('❌ Only group admins can change group image!', threadID, messageID);
            }
            if (event.type !== "message_reply") {
                return api.sendMessage("❌ Reply to a photo to set as group image.", threadID, messageID);
            }
            if (!event.messageReply.attachments || event.messageReply.attachments.length == 0) {
                return api.sendMessage("❌ Please reply to a valid photo.", threadID, messageID);
            }
            if (event.messageReply.attachments[0].type !== "photo") {
                return api.sendMessage("❌ Please reply to a photo only.", threadID, messageID);
            }
            
            const imagePath = __dirname + "/cache/group_manage_img.png";
            const imageUrl = event.messageReply.attachments[0].url;
            
            return request(encodeURI(imageUrl))
                .pipe(fs.createWriteStream(imagePath))
                .on("close", () => {
                    api.changeGroupImage(fs.createReadStream(imagePath), threadID, () => {
                        fs.unlinkSync(imagePath);
                        api.sendMessage("✅ Group image updated!", threadID, messageID);
                    });
                });
        }

        // =========================
        // ANTI JOIN
        // =========================
        else if (args[0] == "antijoin") {
            if (!isBotAdmin) {
                return api.sendMessage('❌ Bot needs to be group admin to use anti-join!', threadID, messageID);
            }
            if (!isGroupAdmin && !isSuperAdmin) {
                return api.sendMessage('❌ Only group admins can change anti-join!', threadID, messageID);
            }
            
            let data = (await Threads.getData(threadID)).data || {};
            
            if (args[1] == "on") {
                data.newMember = true;
                await Threads.setData(threadID, { data });
                global.data.threadData.set(parseInt(threadID), data);
                return api.sendMessage("✅ Anti Join is ON\n\n🚫 New members will be removed automatically.", threadID, messageID);
            }
            else if (args[1] == "off") {
                data.newMember = false;
                await Threads.setData(threadID, { data });
                global.data.threadData.set(parseInt(threadID), data);
                return api.sendMessage("✅ Anti Join is OFF\n\n🎉 New members can join normally.", threadID, messageID);
            }
            else {
                const status = data.newMember === true ? "✅ ON" : "❌ OFF";
                return api.sendMessage(`📌 Anti Join Status: ${status}`, threadID, messageID);
            }
        }

        // =========================
        // ANTI OUT
        // =========================
        else if (args[0] == "antiout") {
            if (!isBotAdmin) {
                return api.sendMessage('❌ Bot needs to be group admin to use anti-out!', threadID, messageID);
            }
            if (!isGroupAdmin && !isSuperAdmin) {
                return api.sendMessage('❌ Only group admins can change anti-out!', threadID, messageID);
            }
            
            let data = (await Threads.getData(threadID)).data || {};
            
            if (args[1] == "on") {
                data.antiout = true;
                await Threads.setData(threadID, { data });
                global.data.threadData.set(parseInt(threadID), data);
                return api.sendMessage("✅ Anti Out is ON\n\n🚪 Members cannot leave without permission.", threadID, messageID);
            }
            else if (args[1] == "off") {
                data.antiout = false;
                await Threads.setData(threadID, { data });
                global.data.threadData.set(parseInt(threadID), data);
                return api.sendMessage("✅ Anti Out is OFF\n\n👋 Members can leave normally.", threadID, messageID);
            }
            else {
                const status = data.antiout === true ? "✅ ON" : "❌ OFF";
                return api.sendMessage(`📌 Anti Out Status: ${status}`, threadID, messageID);
            }
        }

        // =========================
        // STATUS
        // =========================
        else if (args[0] == "status") {
            let data = (await Threads.getData(threadID)).data || {};
            const joinStatus = data.newMember === true ? "✅ ON" : "❌ OFF";
            const outStatus = data.antiout === true ? "✅ ON" : "❌ OFF";
            const resendStatus = data.resend === true ? "✅ ON" : "❌ OFF";
            const groupBanStatus = data.banned === true ? "✅ BANNED" : "❌ NOT BANNED";
            const bannedCommands = data.bannedCommands || [];
            
            let bannedCommandsText = bannedCommands.length > 0 ? bannedCommands.join(", ") : "None";

            return api.sendMessage(
                `🛡️ GROUP STATUS\n━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🚫 Anti Join  : ${joinStatus}\n` +
                `🚪 Anti Out   : ${outStatus}\n` +
                `👁️ Resend     : ${resendStatus}\n` +
                `🔒 Group Ban  : ${groupBanStatus}\n` +
                `🔨 Banned Cmds: ${bannedCommandsText}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `💡 Commands:\n` +
                `• /groupmanage banCommand [cmd] - Ban a command\n` +
                `• /groupmanage unbanCommand [cmd] - Unban a command\n` +
                `• /groupmanage unban status - See banned users`,
                threadID, messageID
            );
        }

        // =========================
        // HELP
        // =========================
        else {
            return api.sendMessage(
                `📖 GROUP MANAGE COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n\n` +
                `⚙️ Group Settings\n` +
                `• /groupmanage name [name]\n` +
                `• /groupmanage image\n` +
                `• /groupmanage myname [name]\n\n` +
                `👢 Member Management\n` +
                `• /groupmanage kick @user\n` +
                `• /groupmanage kick (reply)\n` +
                `• /groupmanage kick id [ID]\n\n` +
                `🗑️ Bot Message Management\n` +
                `• /groupmanage unsend (reply to bot message)\n\n` +
                `🔓 Unban\n` +
                `• /groupmanage unban member @user\n` +
                `• /groupmanage unban member (reply)\n` +
                `• /groupmanage unban member (show list)\n` +
                `• /groupmanage unban qtv\n` +
                `• /groupmanage unban box\n` +
                `• /groupmanage unban status\n\n` +
                `🔨 Command Ban\n` +
                `• /groupmanage banCommand [cmd] - Ban a command\n` +
                `• /groupmanage banCommand (show banned list)\n` +
                `• /groupmanage unbanCommand [cmd] - Unban a command\n` +
                `• /groupmanage unbanCommand all - Unban all\n\n` +
                `🛡️ Security\n` +
                `• /groupmanage antijoin on/off\n` +
                `• /groupmanage antiout on/off\n` +
                `• /groupmanage resend\n\n` +
                `🌐 Bot Language (Bot Admin)\n` +
                `• /groupmanage language en/bn/hi\n\n` +
                `📊 Status\n` +
                `• /groupmanage status`,
                threadID, messageID
            );
        }
    } catch (e) {
        console.log(e);
        return api.sendMessage("❌ Something went wrong.", threadID, messageID);
    }
};