const fs = require("fs-extra");

module.exports.config = {
    name: "notify",
    version: "3.2.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Send hidden message to any group as bot (anonymous)",
    commandCategory: "Admin",
    usages: "notify | notify id [groupID] [message]",
    cooldowns: 5
};

// Helper function to get user's permission level in current group
async function getUserPermission(api, threadID, senderID) {
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const isGroupAdmin = threadInfo.adminIDs.some(item => item.id == senderID);
        const isSuperAdmin = global.config.ADMINBOT.includes(senderID);
        
        if (isSuperAdmin) return 2;
        if (isGroupAdmin) return 1;
        return 0;
    } catch(e) {
        return 0;
    }
}

// Helper function to check if bot is in target group
async function isBotInGroup(api, groupID) {
    try {
        const threadInfo = await api.getThreadInfo(groupID);
        return threadInfo && threadInfo.participantIDs ? true : false;
    } catch(e) {
        return false;
    }
}

// Helper function to check if user is admin in target group
async function isUserAdminInGroup(api, groupID, userID) {
    try {
        const threadInfo = await api.getThreadInfo(groupID);
        return threadInfo.adminIDs.some(item => item.id == userID);
    } catch(e) {
        return false;
    }
}

// Helper function to truncate message for display
function truncateMessage(text, maxLength = 50) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
}

module.exports.handleReply = async function ({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    const { author, groups, targetGroupID, targetGroupName, type } = handleReply;
    
    if (senderID != author) return;
    
    const userPermission = await getUserPermission(api, threadID, senderID);
    
    if (userPermission === 0) return;
    
    // If replying to a success message, extract group ID and resend
    if (type === "success_reply") {
        const message = body.trim();
        if (!message || message.length === 0) {
            return api.sendMessage("❌ Message cannot be empty!", threadID, messageID);
        }
        
        try {
            await api.sendMessage(message, targetGroupID);
            
            const truncatedMsg = truncateMessage(message);
            const successMsg = await api.sendMessage(
                `✅ Message sent successfully to:\n📛 ${targetGroupName}\n🆔 ${targetGroupID}\n\n📝 ${truncatedMsg}${message.length > 50 ? '' : ''}`,
                threadID, messageID
            );
            
            if (successMsg && successMsg.messageID) {
                global.client.handleReply.push({
                    name: "notify",
                    messageID: successMsg.messageID,
                    author: senderID,
                    type: "success_reply",
                    targetGroupID: targetGroupID,
                    targetGroupName: targetGroupName
                });
            }
            return;
        } catch (error) {
            return api.sendMessage(`❌ Failed to send message.\nError: ${error.message}`, threadID, messageID);
        }
    }
    
    // For group list reply - ask for message
    if (type === "group_list") {
        const num = parseInt(body);
        if (isNaN(num) || num < 1 || num > groups.length) {
            return api.sendMessage("❌ Invalid number! Please reply with a valid group number.", threadID, messageID);
        }
        
        const selectedGroup = groups[num - 1];
        
        // Permission 1 (Group Admin): can only send to groups where they are admin
        // Permission 2 (Bot Admin): can send to any group
        if (userPermission === 1) {
            const isUserAdmin = await isUserAdminInGroup(api, selectedGroup.id, senderID);
            if (!isUserAdmin) {
                return api.sendMessage(`❌ You don't have permission to send message to "${selectedGroup.name}".\nYou need to be an admin in that group.`, threadID, messageID);
            }
        }
        
        api.sendMessage(`✏️ Selected: ${selectedGroup.name}\n🆔 ${selectedGroup.id}\n\nPlease type your message to send to this group as BOT:`, threadID, (err, info) => {
            if (!err) {
                global.client.handleReply.push({
                    name: "notify",
                    messageID: info.messageID,
                    author: senderID,
                    type: "send_message",
                    targetGroupID: selectedGroup.id,
                    targetGroupName: selectedGroup.name
                });
            }
        }, messageID);
        return;
    }
    
    // For send_message - actually send the message
    if (type === "send_message") {
        const message = body.trim();
        if (!message || message.length === 0) {
            return api.sendMessage("❌ Message cannot be empty!", threadID, messageID);
        }
        
        // Permission 1 (Group Admin): check if admin in target group
        // Permission 2 (Bot Admin): no check needed
        if (userPermission === 1) {
            const isUserAdmin = await isUserAdminInGroup(api, targetGroupID, senderID);
            if (!isUserAdmin) {
                return api.sendMessage(`❌ You don't have permission to send message to "${targetGroupName}".\nYou need to be an admin in that group.`, threadID, messageID);
            }
        }
        
        try {
            await api.sendMessage(message, targetGroupID);
            
            const truncatedMsg = truncateMessage(message);
            const successMsg = await api.sendMessage(
                `✅ Message sent successfully to:\n📛 ${targetGroupName}\n🆔 ${targetGroupID}\n\n📝 ${truncatedMsg}${message.length > 50 ? '' : ''}`,
                threadID, messageID
            );
            
            if (successMsg && successMsg.messageID) {
                global.client.handleReply.push({
                    name: "notify",
                    messageID: successMsg.messageID,
                    author: senderID,
                    type: "success_reply",
                    targetGroupID: targetGroupID,
                    targetGroupName: targetGroupName
                });
            }
            return;
        } catch (error) {
            return api.sendMessage(`❌ Failed to send message.\nError: ${error.message}`, threadID, messageID);
        }
    }
};

module.exports.run = async function ({ api, event, args, Threads }) {
    const { threadID, messageID, senderID, body } = event;
    
    const userPermission = await getUserPermission(api, threadID, senderID);
    
    if (userPermission === 0) return;
    
    let targetGroupID = null;
    let messageText = null;
    let foundId = false;
    
    const fullText = body;
    const idMatch = fullText.match(/\b(id|ID)\s+(\d+)\b/);
    
    if (idMatch) {
        targetGroupID = idMatch[2];
        foundId = true;
        let tempText = fullText.replace(/\/notify\s*/i, '').replace(/notify\s*/i, '');
        tempText = tempText.replace(new RegExp(`(id|ID)\\s+${targetGroupID}\\s*`, 'i'), '');
        messageText = tempText.trim();
    }
    
    // Case 1: User provided group ID directly in command
    if (foundId && targetGroupID && messageText && messageText.length > 0) {
        // Permission 1: Check if user is admin in target group
        // Permission 2: Skip check
        if (userPermission === 1) {
            const isUserAdmin = await isUserAdminInGroup(api, targetGroupID, senderID);
            if (!isUserAdmin) {
                return api.sendMessage(`❌ You don't have permission to send message to this group.\nYou need to be an admin in that group.`, threadID, messageID);
            }
        }
        
        const botInGroup = await isBotInGroup(api, targetGroupID);
        if (!botInGroup) {
            return api.sendMessage(`❌ Bot is not in group ${targetGroupID} or group doesn't exist!`, threadID, messageID);
        }
        
        try {
            const threadInfo = await api.getThreadInfo(targetGroupID);
            await api.sendMessage(messageText, targetGroupID);
            
            const truncatedMsg = truncateMessage(messageText);
            const successMsg = await api.sendMessage(
                `✅ Message sent successfully to:\n📛 ${threadInfo.threadName || targetGroupID}\n🆔 ${targetGroupID}\n\n📝 ${truncatedMsg}${messageText.length > 50 ? '' : ''}`,
                threadID, messageID
            );
            
            if (successMsg && successMsg.messageID) {
                global.client.handleReply.push({
                    name: "notify",
                    messageID: successMsg.messageID,
                    author: senderID,
                    type: "success_reply",
                    targetGroupID: targetGroupID,
                    targetGroupName: threadInfo.threadName || targetGroupID
                });
            }
            return;
        } catch (error) {
            return api.sendMessage(`❌ Failed to send message.\nError: ${error.message}`, threadID, messageID);
        }
    }
    
    // Case 2: User wants to see group list (no ID provided)
    if (!foundId) {
        try {
            const threadList = await api.getThreadList(1000, null, ["INBOX"]);
            let allGroups = [];
            
            for (const thread of threadList) {
                if (thread.isGroup == true && thread.isSubscribed == true) {
                    let memberCount = 0;
                    try {
                        const threadInfo = await api.getThreadInfo(thread.threadID);
                        memberCount = threadInfo.participantIDs ? threadInfo.participantIDs.length : 0;
                    } catch(e) {
                        memberCount = thread.participantIDs ? thread.participantIDs.length : 0;
                    }
                    
                    allGroups.push({
                        id: thread.threadID,
                        name: thread.name || "Unnamed Group",
                        messageCount: thread.messageCount || 0,
                        memberCount: memberCount
                    });
                }
            }
            
            if (allGroups.length === 0) {
                return api.sendMessage("❌ Bot is not in any group!", threadID, messageID);
            }
            
            // Filter groups based on user permission
            let filteredGroups = [];
            
            if (userPermission === 2) {
                // Bot Admin: সব গ্রুপ দেখাবে
                filteredGroups = allGroups;
            } else if (userPermission === 1) {
                // Group Admin: শুধু যেখানে অ্যাডমিন
                for (const group of allGroups) {
                    const isUserAdmin = await isUserAdminInGroup(api, group.id, senderID);
                    if (isUserAdmin) {
                        filteredGroups.push(group);
                    }
                }
            }
            
            if (filteredGroups.length === 0) {
                if (userPermission === 1) {
                    return api.sendMessage("❌ You are not an admin in any group where bot is present!", threadID, messageID);
                }
                return api.sendMessage("❌ No groups available!", threadID, messageID);
            }
            
            filteredGroups.sort((a, b) => b.messageCount - a.messageCount);
            
            let permissionLevelName = userPermission === 2 ? "🔓 Super Admin (Full Access - All Groups)" : "🔒 Group Admin (Your Groups Only)";
            
            let msg = `📋 GROUP LIST\n━━━━━━━━━━━━━━━━━━━━\n`;
            msg += `👑 ${permissionLevelName}\n`;
            msg += `📊 Total: ${filteredGroups.length} groups\n`;
            msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            for (let i = 0; i < filteredGroups.length; i++) {
                msg += `${i+1}. 📛 ${filteredGroups[i].name}\n`;
                msg += `   🆔 ${filteredGroups[i].id}\n`;
                msg += `   💬 ${filteredGroups[i].messageCount} msgs\n`;
                msg += `   👥 ${filteredGroups[i].memberCount} members\n`;
                msg += `   ───────────────────\n`;
            }
            
            msg += `\n💡 Reply with a number to send a message to that group as BOT.\n`;
            if (userPermission === 2) {
                msg += `💡 Or use: /notify id [groupID] [message] - Direct send to ANY group\n`;
            } else {
                msg += `💡 Or use: /notify id [groupID] [message] - Direct send (only groups you admin)\n`;
            }
            msg += `💡 Example: /notify id 123456789 Hello everyone!\n`;
            msg += `💡 After sending, reply to the success message to send another message to the same group.`;
            
            api.sendMessage(msg, threadID, (error, info) => {
                if (!error) {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID,
                        type: "group_list",
                        groups: filteredGroups
                    });
                }
            }, messageID);
            
        } catch (error) {
            console.error("Notify error:", error);
            api.sendMessage(`❌ Failed to fetch group list.\nError: ${error.message}`, threadID, messageID);
        }
        return;
    }
    
    if (foundId && targetGroupID && (!messageText || messageText.length === 0)) {
        return api.sendMessage(`❌ Please provide a message to send!\n\nExample: /notify id ${targetGroupID} Your message here`, threadID, messageID);
    }
};