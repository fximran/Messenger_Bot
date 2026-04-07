module.exports.config = {
    name: "uid",
    version: "4.1.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Get complete user information by mention, reply, name, or ID",
    commandCategory: "Tools",
    usages: "uid | @mention | reply | name | id",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID, type, messageReply, body, mentions } = event;
    
    // Helper function to get user info with all details
    async function getUserFullInfo(targetId, threadInfo) {
        try {
            const userInfo = await api.getUserInfo(targetId);
            const user = userInfo[targetId];
            
            if (!user) return null;
            
            // Check if user is admin in the group
            const isAdmin = threadInfo.adminIDs ? threadInfo.adminIDs.some(admin => admin.id == targetId) : false;
            const role = isAdmin ? "👑 Admin" : "👤 Member";
            
            // Get nickname in this group
            const nickname = threadInfo.nicknames && threadInfo.nicknames[targetId] ? threadInfo.nicknames[targetId] : "No nickname";
            
            // Fix gender display
            let gender = "Not specified";
            if (user.gender === 1) gender = "👩 Female";
            else if (user.gender === 2) gender = "👨 Male";
            else gender = "⚧ Not specified";
            
            return {
                name: user.name || "Unknown",
                nickname: nickname,
                id: targetId,
                role: role,
                profileUrl: user.profileUrl || "No profile URL",
                username: user.vanity || "No username",
                gender: gender,
                isFriend: user.isFriend ? "Yes" : "No"
            };
        } catch(e) {
            return null;
        }
    }
    
    // Get thread info for checking admin status and nicknames
    const threadInfo = await api.getThreadInfo(threadID);
    let targetId = null;
    
    // ========== CASE 1: Reply to a message ==========
    if (type === "message_reply") {
        targetId = messageReply.senderID;
    }
    
    // ========== CASE 2: Check mentions ==========
    else if (Object.keys(mentions).length > 0) {
        let results = "";
        let count = 1;
        
        for (const id in mentions) {
            const userInfo = await getUserFullInfo(id, threadInfo);
            if (userInfo) {
                results += `╔══════════ USER ${count} ══════════╗\n`;
                results += `📛 Name: ${userInfo.name}\n`;
                results += `🏷️ Nickname: ${userInfo.nickname}\n`;
                results += `🆔 ID: ${userInfo.id}\n`;
                results += `👑 Role: ${userInfo.role}\n`;
                results += `📱 Profile: ${userInfo.profileUrl}\n`;
                results += `💦 Username: @${userInfo.username}\n`;
                results += `⚧ Gender: ${userInfo.gender}\n`;
                results += `🤝 Friend with bot: ${userInfo.isFriend}\n`;
                results += `╚════════════════════════════════╝\n\n`;
                count++;
            }
        }
        
        if (results) {
            return api.sendMessage(results, threadID, messageID);
        }
    }
    
    // ========== CASE 3: Search by name or ID from args ==========
    else if (args[0]) {
        const searchTerm = args.join(" ").toLowerCase();
        const cleanSearchTerm = searchTerm.startsWith("@") ? searchTerm.substring(1) : searchTerm;
        
        // Check if it's a numeric ID
        if (!isNaN(cleanSearchTerm)) {
            targetId = cleanSearchTerm;
        } else {
            // Search by name in participants
            const participants = threadInfo.participantIDs;
            let matchedUsers = [];
            
            for (const uid of participants) {
                try {
                    const userInfo = await api.getUserInfo(uid);
                    const userName = userInfo[uid].name || "";
                    const userNickname = threadInfo.nicknames && threadInfo.nicknames[uid] ? threadInfo.nicknames[uid] : "";
                    
                    if (userName.toLowerCase().includes(cleanSearchTerm) || userNickname.toLowerCase().includes(cleanSearchTerm)) {
                        matchedUsers.push(uid);
                    }
                } catch(e) {}
            }
            
            if (matchedUsers.length === 1) {
                targetId = matchedUsers[0];
            } else if (matchedUsers.length > 1) {
                let result = `🔍 Multiple users found with "${args.join(" ")}":\n\n`;
                for (let i = 0; i < matchedUsers.length; i++) {
                    const uid = matchedUsers[i];
                    const userInfo = await getUserFullInfo(uid, threadInfo);
                    if (userInfo) {
                        result += `${i+1}. ${userInfo.name}\n`;
                        result += `   🆔 ID: ${userInfo.id}\n`;
                        if (userInfo.nickname !== "No nickname") result += `   🏷️ Nickname: ${userInfo.nickname}\n`;
                        result += `   👑 Role: ${userInfo.role}\n`;
                        result += `   ───────────────────\n`;
                    }
                }
                result += `\n💡 Use: /uid [ID] to get full info of a specific user`;
                return api.sendMessage(result, threadID, messageID);
            }
        }
    }
    
    // ========== CASE 4: No arguments - show own info ==========
    if (!targetId) {
        targetId = senderID;
    }
    
    // ========== Get and display full user info ==========
    const userInfo = await getUserFullInfo(targetId, threadInfo);
    
    if (userInfo) {
        const message = `
╔══════════ USER INFO ══════════╗
📛 Name: ${userInfo.name}
🏷️ Nickname: ${userInfo.nickname}
🆔 ID: ${userInfo.id}
👑 Role: ${userInfo.role}
📱 Profile: ${userInfo.profileUrl}
💦 Username: @${userInfo.username}
⚧ Gender: ${userInfo.gender}
🤝 Friend with bot: ${userInfo.isFriend}
╚════════════════════════════════╝
        `;
        return api.sendMessage(message, threadID, messageID);
    } else {
        return api.sendMessage(`❌ User not found!`, threadID, messageID);
    }
};