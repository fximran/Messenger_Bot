module.exports.config = {
    name: "kick",
    version: "2.5.0",
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
    
    // ========== BUILD LOCAL USER CACHE (ONE TIME SCAN) ==========
    // This function scans all members once and returns a map for quick lookup
    async function buildUserCache(participantIDs, threadInfo) {
        const userCache = [];
        const botId = api.getCurrentUserID();
        
        for (const uid of participantIDs) {
            // Skip bot and self
            if (uid == botId) continue;
            if (uid == senderID) continue;
            
            try {
                const userInfo = await api.getUserInfo(uid);
                const user = userInfo[uid];
                const userName = user.name || "";
                const userNickname = threadInfo.nicknames && threadInfo.nicknames[uid] ? threadInfo.nicknames[uid] : "";
                const isAdmin = threadInfo.adminIDs.some(admin => admin.id == uid);
                
                // Skip admins (cannot kick)
                if (isAdmin) continue;
                
                userCache.push({
                    id: uid,
                    name: userName,
                    nickname: userNickname,
                    username: user.vanity || "",
                    searchTerms: (userName + " " + userNickname).toLowerCase()
                });
            } catch(e) {}
        }
        
        return userCache;
    }
    
    // ========== SEARCH IN CACHE (LOCAL, NO API CALLS) ==========
    function searchInCache(userCache, searchTerm) {
        const cleanTerm = searchTerm.toLowerCase().replace(/^@/, '').trim();
        const matchedUsers = [];
        
        for (const user of userCache) {
            if (user.searchTerms.includes(cleanTerm)) {
                matchedUsers.push({
                    id: user.id,
                    name: user.name,
                    nickname: user.nickname,
                    username: user.username
                });
            }
        }
        
        return matchedUsers;
    }
    
    // ========== BUILD CACHE ONCE (ONE TIME API CALLS FOR ALL MEMBERS) ==========
    const participants = threadInfo.participantIDs;
    
    // Send typing indicator to show processing
    api.sendMessage("⏳ Searching for user...", threadID, (err, info) => {
        // Optional: remove after 2 seconds
        setTimeout(() => {
            api.unsendMessage(info.messageID).catch(() => {});
        }, 2000);
    });
    
    // Build cache (this makes ONE API call per member - but only once)
    const userCache = await buildUserCache(participants, threadInfo);
    
    // ========== KICK BY MENTION ==========
    if (Object.keys(mentions).length > 0) {
        let mentionName = "";
        const mentionedId = Object.keys(mentions)[0];
        mentionName = mentions[mentionedId];
        
        if (mentionName.startsWith("@")) {
            mentionName = mentionName.substring(1);
        }
        
        const atIndex = body.indexOf("@");
        if (atIndex !== -1) {
            const fullMentionText = body.substring(atIndex + 1).trim();
            if (fullMentionText.length > mentionName.length) {
                mentionName = fullMentionText;
            }
        }
        
        if (!mentionName) {
            return api.sendMessage(msg.invalid, threadID, messageID);
        }
        
        // Search in cache (local, no API calls)
        const matchedUsers = searchInCache(userCache, mentionName);
        
        if (matchedUsers.length === 0) {
            return api.sendMessage(msg.no_user_found.replace("{name}", mentionName), threadID, messageID);
        }
        
        if (matchedUsers.length === 1) {
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
            if (user.username) listMsg += `   📛 Username: @${user.username}\n`;
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
    
    // ========== KICK BY NAME (SEARCH USING CACHE) ==========
    if (args[0]) {
        const searchName = args.join(" ");
        
        // Search in cache (local, no additional API calls)
        const matchedUsers = searchInCache(userCache, searchName);
        
        if (matchedUsers.length === 0) {
            return api.sendMessage(msg.no_user_found.replace("{name}", searchName), threadID, messageID);
        }
        
        if (matchedUsers.length === 1) {
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
            if (user.username) listMsg += `   📛 Username: @${user.username}\n`;
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