module.exports.config = {
    name: "kick",
    version: "2.4.0",
    hasPermssion: 1,
    credits: "MQL1 Community",
    description: "Kick a member from the group by mention, reply, id, or name",
    commandCategory: "Group",
    usages: "@user / reply / id [ID] / name [name]",
    cooldowns: 5
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    const { author, users } = handleReply;
    
    if (senderID != author) return;
    
    const num = parseInt(body);
    if (isNaN(num) || num < 1 || num > users.length) {
        return api.sendMessage("❌ Invalid number! Please reply with a valid number.", threadID, messageID);
    }
    
    const target = users[num - 1];
    
    api.removeUserFromGroup(target.id, threadID, (err) => {
        if (err) {
            return api.sendMessage(`❌ Failed to kick ${target.name}.\nReason: ${err.message || "Unknown error"}`, threadID, messageID);
        }
        return api.sendMessage(`👢 ${target.name} has been kicked from the group! Bye Bye!`, threadID, messageID);
    });
};

module.exports.run = async function ({ api, event, Threads, args }) {
    const { threadID, messageID, senderID, type, mentions, body } = event;
    
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
            self: "❌ You cannot kick yourself!",
            bot: "❌ You cannot kick the bot!",
            admin: "❌ Cannot kick a group admin!",
            failed: "❌ Failed to kick {name}",
            success: "👢 {name} has been kicked from the group! Bye Bye!",
            no_permission: "❌ Only group admins can kick members!",
            no_bot_admin: "❌ Bot needs to be group admin to kick members!",
            invalid: "❌ Please use:\n/kick @user\n/kick (reply to message)\n/kick id USER_ID\n/kick [name]",
            multiple: "🔍 Multiple users found with \"{name}\":\n\n{list}\n\n💡 Reply with number to kick",
            no_user_found: "❌ No user found with name \"{name}\""
        },
        bn: {
            self: "❌ Apni nijeke kick korte parben na!",
            bot: "❌ Apni bot ke kick korte parben na!",
            admin: "❌ Group admin ke kick kora jabe na!",
            failed: "❌ {name} ke kick korte failed!",
            success: "👢 {name} ke group theke kick kora hoyeche! Bye Bye!",
            no_permission: "❌ Shudhu group adminra member kick korte parben!",
            no_bot_admin: "❌ Kick korte bot ke group admin hote hobe!",
            invalid: "❌ Please use:\n/kick @user\n/kick (reply to message)\n/kick id USER_ID\n/kick [name]",
            multiple: "🔍 \"{name}\" name er onek user ache:\n\n{list}\n\n💡 Number reply kore kick korun",
            no_user_found: "❌ \"{name}\" name er kono user nei"
        },
        hi: {
            self: "❌ Aap khud ko kick nahi kar sakte!",
            bot: "❌ Aap bot ko kick nahi kar sakte!",
            admin: "❌ Group admin ko kick nahi kar sakte!",
            failed: "❌ {name} ko kick karne mein failed!",
            success: "👢 {name} ko group se kick kar diya gaya! Bye Bye!",
            no_permission: "❌ Sirf group admin hi member kick kar sakte hain!",
            no_bot_admin: "❌ Kick karne ke liye bot ko group admin hona chahiye!",
            invalid: "❌ Please use:\n/kick @user\n/kick (reply to message)\n/kick id USER_ID\n/kick [name]",
            multiple: "🔍 \"{name}\" naam ke multiple users mile:\n\n{list}\n\n💡 Number reply kare kick karein",
            no_user_found: "❌ \"{name}\" naam ka koi user nahi mila"
        }
    };
    
    const msg = messages[lang] || messages.en;
    
    // Permission check
    if (!isGroupAdmin && !isSuperAdmin) {
        return api.sendMessage(msg.no_permission, threadID, messageID);
    }
    if (!isBotAdmin) {
        return api.sendMessage(msg.no_bot_admin, threadID, messageID);
    }
    
    // ========== HELPER FUNCTION: Search users by name ==========
    async function searchUsersByName(searchName) {
        const participants = threadInfo.participantIDs;
        let matchedUsers = [];
        
        // Clean the search name (remove @ symbol if present)
        let cleanSearchName = searchName.toLowerCase();
        if (cleanSearchName.startsWith("@")) {
            cleanSearchName = cleanSearchName.substring(1);
        }
        
        for (const uid of participants) {
            if (uid == api.getCurrentUserID()) continue;
            if (uid == senderID) continue;
            
            try {
                const userInfo = await api.getUserInfo(uid);
                const userName = userInfo[uid].name || "";
                const userNickname = threadInfo.nicknames && threadInfo.nicknames[uid] ? threadInfo.nicknames[uid] : "";
                
                // Check if search term matches name or nickname
                if (userName.toLowerCase().includes(cleanSearchName) || userNickname.toLowerCase().includes(cleanSearchName)) {
                    const isAdmin = threadInfo.adminIDs.some(admin => admin.id == uid);
                    if (!isAdmin) {
                        matchedUsers.push({
                            id: uid,
                            name: userName,
                            nickname: userNickname,
                            username: userInfo[uid].vanity || "No username"
                        });
                    }
                }
            } catch(e) {}
        }
        
        return matchedUsers;
    }
    
    // ========== KICK BY MENTION (Extract name from @mention) ==========
    if (Object.keys(mentions).length > 0) {
        // Get the mentioned name from mentions object
        let mentionName = "";
        const mentionedId = Object.keys(mentions)[0];
        mentionName = mentions[mentionedId];
        
        // Remove @ symbol if present at the beginning
        if (mentionName.startsWith("@")) {
            mentionName = mentionName.substring(1);
        }
        
        // Also check the message body for the full name (in case of multiple words)
        const atIndex = body.indexOf("@");
        if (atIndex !== -1) {
            const fullMentionText = body.substring(atIndex + 1).trim();
            // If full mention text is longer, use that
            if (fullMentionText.length > mentionName.length) {
                mentionName = fullMentionText;
            }
        }
        
        if (!mentionName) {
            return api.sendMessage(msg.invalid, threadID, messageID);
        }
        
        // Search for users with this name
        const matchedUsers = await searchUsersByName(mentionName);
        
        if (matchedUsers.length === 0) {
            return api.sendMessage(msg.no_user_found.replace("{name}", mentionName), threadID, messageID);
        }
        
        if (matchedUsers.length === 1) {
            // Direct kick if only one user found
            const target = matchedUsers[0];
            api.removeUserFromGroup(target.id, threadID, (err) => {
                if (err) {
                    return api.sendMessage(msg.failed.replace("{name}", target.name), threadID, messageID);
                }
                return api.sendMessage(msg.success.replace("{name}", target.name), threadID, messageID);
            });
            return;
        }
        
        // Multiple users found - show list
        let listMsg = "";
        for (let i = 0; i < matchedUsers.length; i++) {
            const user = matchedUsers[i];
            listMsg += `${i+1}. ${user.name}\n`;
            listMsg += `   🆔 ID: ${user.id}\n`;
            if (user.username !== "No username") listMsg += `   📛 Username: @${user.username}\n`;
            if (user.nickname) listMsg += `   🏷️ Nickname: ${user.nickname}\n`;
            listMsg += `   ───────────────────\n`;
        }
        
        api.sendMessage(msg.multiple
            .replace("{name}", mentionName)
            .replace("{list}", listMsg), 
            threadID, 
            (error, info) => {
                if (!error) {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID,
                        users: matchedUsers
                    });
                }
            }, 
            messageID);
        return;
    }
    
    // ========== KICK BY REPLY ==========
    if (type === "message_reply") {
        let targetId = event.messageReply.senderID;
        if (targetId == senderID) return api.sendMessage(msg.self, threadID, messageID);
        if (targetId == api.getCurrentUserID()) return api.sendMessage(msg.bot, threadID, messageID);
        if (threadInfo.adminIDs.some(item => item.id == targetId)) return api.sendMessage(msg.admin, threadID, messageID);
        
        let userInfo = await api.getUserInfo(targetId);
        let name = userInfo[targetId].name;
        
        api.removeUserFromGroup(targetId, threadID, (err) => {
            if (err) return api.sendMessage(msg.failed.replace("{name}", name), threadID, messageID);
            return api.sendMessage(msg.success.replace("{name}", name), threadID, messageID);
        });
        return;
    }
    
    // ========== KICK BY ID ==========
    if (args[0] === "id" && args[1]) {
        let targetId = args[1];
        
        if (targetId == senderID) return api.sendMessage(msg.self, threadID, messageID);
        if (targetId == api.getCurrentUserID()) return api.sendMessage(msg.bot, threadID, messageID);
        
        if (!threadInfo.participantIDs.includes(targetId)) {
            return api.sendMessage("❌ User not found in this group!", threadID, messageID);
        }
        if (threadInfo.adminIDs.some(item => item.id == targetId)) return api.sendMessage(msg.admin, threadID, messageID);
        
        try {
            let userInfo = await api.getUserInfo(targetId);
            let name = userInfo[targetId].name;
            
            api.removeUserFromGroup(targetId, threadID, (err) => {
                if (err) return api.sendMessage(msg.failed.replace("{name}", name), threadID, messageID);
                return api.sendMessage(msg.success.replace("{name}", name), threadID, messageID);
            });
        } catch (e) {
            return api.sendMessage(msg.failed.replace("{name}", "User"), threadID, messageID);
        }
        return;
    }
    
    // ========== KICK BY NAME (SEARCH) ==========
    if (args[0]) {
        const searchName = args.join(" ");
        const matchedUsers = await searchUsersByName(searchName);
        
        if (matchedUsers.length === 0) {
            return api.sendMessage(msg.no_user_found.replace("{name}", searchName), threadID, messageID);
        }
        
        if (matchedUsers.length === 1) {
            // Direct kick if only one user found
            const target = matchedUsers[0];
            api.removeUserFromGroup(target.id, threadID, (err) => {
                if (err) {
                    return api.sendMessage(msg.failed.replace("{name}", target.name), threadID, messageID);
                }
                return api.sendMessage(msg.success.replace("{name}", target.name), threadID, messageID);
            });
            return;
        }
        
        // Multiple users found - show list
        let listMsg = "";
        for (let i = 0; i < matchedUsers.length; i++) {
            const user = matchedUsers[i];
            listMsg += `${i+1}. ${user.name}\n`;
            listMsg += `   🆔 ID: ${user.id}\n`;
            if (user.username !== "No username") listMsg += `   📛 Username: @${user.username}\n`;
            if (user.nickname) listMsg += `   🏷️ Nickname: ${user.nickname}\n`;
            listMsg += `   ───────────────────\n`;
        }
        
        api.sendMessage(msg.multiple
            .replace("{name}", searchName)
            .replace("{list}", listMsg), 
            threadID, 
            (error, info) => {
                if (!error) {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID,
                        users: matchedUsers
                    });
                }
            }, 
            messageID);
        return;
    }
    
    // ========== INVALID COMMAND ==========
    return api.sendMessage(msg.invalid, threadID, messageID);
};