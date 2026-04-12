const fs = require("fs-extra");

module.exports.config = {
    name: "setname",
    version: "1.4.0",
    hasPermssion: 1,
    credits: "MQL1 Community",
    description: "Change group name, bot nickname, or member nickname (or clear member nickname)",
    commandCategory: "Group",
    usages: "g [groupID] <name> | bot [groupID] <name> | member <@mention/uid/name> <nickname> | member clear <@mention/uid/name>",
    cooldowns: 5
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    const { author, users, nickname } = handleReply;
    
    if (senderID != author) return;
    
    const num = parseInt(body);
    if (isNaN(num) || num < 1 || num > users.length) {
        return api.sendMessage("❌ Invalid number! Please reply with a valid number.", threadID, messageID);
    }
    
    const target = users[num - 1];
    
    api.changeNickname(nickname, threadID, target.id, (err) => {
        if (err) {
            return api.sendMessage(`❌ Failed to change nickname for ${target.name}.\nReason: ${err.message || "Unknown error"}`, threadID, messageID);
        }
        return api.sendMessage(`✅ Nickname of ${target.name} changed to: ${nickname}`, threadID, messageID);
    });
};

module.exports.run = async function({ api, event, args, Threads }) {
    const { threadID, messageID, senderID, mentions, body } = event;
    const botID = api.getCurrentUserID();

    async function getTargetThread(targetID) {
        try {
            return await api.getThreadInfo(targetID);
        } catch (e) {
            return null;
        }
    }

    const threadData = (await Threads.getData(threadID)).data || {};
    const lang = threadData.language || global.config.language || "en";

    const messages = {
        en: {
            help: `📖 SETNAME COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `👥 GROUP NAME:\n` +
                  `   /setname g <name> - Change current group name\n` +
                  `   /setname g <groupID> <name> - Change target group name\n\n` +
                  `🤖 BOT NICKNAME:\n` +
                  `   /setname bot <name> - Change bot nickname in current group\n` +
                  `   /setname bot <groupID> <name> - Change bot nickname in target group\n\n` +
                  `👤 MEMBER NICKNAME:\n` +
                  `   /setname member <UID> <nickname>\n` +
                  `   /setname member <name> <nickname>\n` +
                  `   /setname member @mention <nickname>\n` +
                  `   /setname member clear <@mention/uid/name> - Remove nickname\n\n` +
                  `💡 Examples:\n` +
                  `   /setname g My Awesome Group\n` +
                  `   /setname bot Jarvis 2.0\n` +
                  `   /setname member @Imran Pro Trader\n` +
                  `   /setname member clear @Imran`,
            missing_args: "❌ Missing arguments. Usage: /setname g [groupID] <name> | bot [groupID] <name> | member <@mention/uid/name> <nickname> | member clear <@mention/uid/name>",
            group_not_found: "❌ Bot is not in the specified group or group doesn't exist!",
            not_admin: "❌ You must be a group admin to change the group name!",
            bot_not_admin: "❌ Bot must be a group admin to change the group name!",
            group_name_changed: "✅ Group name changed to: {name}",
            group_name_changed_target: "✅ Group name of {targetName} changed to: {name}",
            bot_nick_changed: "✅ Bot nickname changed to: {name}",
            bot_nick_changed_target: "✅ Bot nickname in {targetName} changed to: {name}",
            user_nick_changed: "✅ Nickname of {user} changed to: {nick}",
            user_nick_cleared: "✅ Nickname of {user} has been cleared (reset to original name).",
            user_not_found: "❌ User not found in this group!",
            cannot_change_admin: "❌ Cannot change/clear nickname of a group admin!",
            no_bot_admin: "❌ Bot needs to be group admin to change nicknames!",
            invalid_target: "❌ Invalid target. Use @mention, UID, or name search.",
            cannot_nick_self: "❌ You cannot change your own nickname using this command!",
            no_permission: "❌ Only group admins can change nicknames!",
            bot_nick_failed: "❌ Failed to change bot nickname. Make sure bot is admin.",
            user_nick_failed: "❌ Failed to change nickname. Make sure bot is admin.",
            multiple: "🔍 Multiple users found with \"{name}\":\n\n{list}\n\n💡 Reply with number to change nickname to: {nick}",
            multiple_clear: "🔍 Multiple users found with \"{name}\":\n\n{list}\n\n💡 Reply with number to CLEAR nickname",
            no_user_found: "❌ No user found with name \"{name}\"",
            searching: "⏳ Searching for user..."
        },
        bn: {
            help: `📖 SETNAME COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `👥 GROUP ER NAAM:\n` +
                  `   /setname g <name> - Current group er naam poriborton\n` +
                  `   /setname g <groupID> <name> - Target group er naam poriborton\n\n` +
                  `🤖 BOT ER NICKNAME:\n` +
                  `   /setname bot <name> - Current group e bot er nickname\n` +
                  `   /setname bot <groupID> <name> - Target group e bot er nickname\n\n` +
                  `👤 MEMBER ER NICKNAME:\n` +
                  `   /setname member <UID> <nickname>\n` +
                  `   /setname member <name> <nickname>\n` +
                  `   /setname member @mention <nickname>\n` +
                  `   /setname member clear <@mention/uid/name> - Nickname muche felun\n\n` +
                  `💡 Udhahoron:\n` +
                  `   /setname g Amar Groop\n` +
                  `   /setname bot Jarvis 2.0\n` +
                  `   /setname member @Imran Pro Trader\n` +
                  `   /setname member clear @Imran`,
            missing_args: "❌ Argumment missing. Babohar: /setname g [groupID] <name> | bot [groupID] <name> | member <@mention/uid/name> <nickname> | member clear <@mention/uid/name>",
            group_not_found: "❌ Bot oi groope nei ba groop ti nei!",
            not_admin: "❌ Group er naam poriborton korte apnake group admin hote hobe!",
            bot_not_admin: "❌ Group er naam poriborton korte bot ke group admin hote hobe!",
            group_name_changed: "✅ Group er naam poriborton kora hoyeche: {name}",
            group_name_changed_target: "✅ {targetName} group er naam poriborton kora hoyeche: {name}",
            bot_nick_changed: "✅ Bot er nickname poriborton kora hoyeche: {name}",
            bot_nick_changed_target: "✅ {targetName} e bot er nickname poriborton kora hoyeche: {name}",
            user_nick_changed: "✅ {user} er nickname poriborton kora hoyeche: {nick}",
            user_nick_cleared: "✅ {user} er nickname muche fela hoyeche (asol name e fire gache).",
            user_not_found: "❌ User ei groope nei!",
            cannot_change_admin: "❌ Group admin er nickname poriborton/muchano jabe na!",
            no_bot_admin: "❌ Nickname poriborton korte bot ke group admin hote hobe!",
            invalid_target: "❌ Sothik target din. @mention, UID, ba nam use korun.",
            cannot_nick_self: "❌ Apni nijer nickname eivabe poriborton korte parben na!",
            no_permission: "❌ Shudhu group adminra nickname poriborton korte paren!",
            bot_nick_failed: "❌ Bot er nickname poriborton korte byartho. Bot admin ache kina nishchit korun.",
            user_nick_failed: "❌ Nickname poriborton korte byartho. Bot admin ache kina nishchit korun.",
            multiple: "🔍 \"{name}\" name er onek user ache:\n\n{list}\n\n💡 Nickname \"{nick}\" set korte number reply korun",
            multiple_clear: "🔍 \"{name}\" name er onek user ache:\n\n{list}\n\n💡 Nickname MUCHTE number reply korun",
            no_user_found: "❌ \"{name}\" name er kono user nei",
            searching: "⏳ User khujchi..."
        },
        hi: {
            help: `📖 SETNAME COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `👥 GROUP KA NAAM:\n` +
                  `   /setname g <name> - Current group ka naam badle\n` +
                  `   /setname g <groupID> <name> - Target group ka naam badle\n\n` +
                  `🤖 BOT KA NICKNAME:\n` +
                  `   /setname bot <name> - Current group mein bot ka nickname\n` +
                  `   /setname bot <groupID> <name> - Target group mein bot ka nickname\n\n` +
                  `👤 MEMBER KA NICKNAME:\n` +
                  `   /setname member <UID> <nickname>\n` +
                  `   /setname member <name> <nickname>\n` +
                  `   /setname member @mention <nickname>\n` +
                  `   /setname member clear <@mention/uid/name> - Nickname hatayein\n\n` +
                  `💡 Udaharan:\n` +
                  `   /setname g Mera Group\n` +
                  `   /setname bot Jarvis 2.0\n` +
                  `   /setname member @Imran Pro Trader\n` +
                  `   /setname member clear @Imran`,
            missing_args: "❌ Arguments missing. Upyog: /setname g [groupID] <name> | bot [groupID] <name> | member <@mention/uid/name> <nickname> | member clear <@mention/uid/name>",
            group_not_found: "❌ Bot us group mein nahi hai ya group maujood nahi hai!",
            not_admin: "❌ Group ka naam badalne ke liye aapko group admin hona chahiye!",
            bot_not_admin: "❌ Group ka naam badalne ke liye bot ko group admin hona chahiye!",
            group_name_changed: "✅ Group ka naam badal diya gaya: {name}",
            group_name_changed_target: "✅ {targetName} group ka naam badal diya gaya: {name}",
            bot_nick_changed: "✅ Bot ka nickname badal diya gaya: {name}",
            bot_nick_changed_target: "✅ {targetName} mein bot ka nickname badal diya gaya: {name}",
            user_nick_changed: "✅ {user} ka nickname badal diya gaya: {nick}",
            user_nick_cleared: "✅ {user} ka nickname hata diya gaya (asli naam wapas).",
            user_not_found: "❌ User is group mein nahi hai!",
            cannot_change_admin: "❌ Group admin ka nickname nahi badal/hataya sakte!",
            no_bot_admin: "❌ Nickname badalne ke liye bot ko group admin hona chahiye!",
            invalid_target: "❌ Sahi target dein. @mention, UID, ya naam use karein.",
            cannot_nick_self: "❌ Aap apna nickname aise nahi badal sakte!",
            no_permission: "❌ Sirf group admin hi nickname badal sakte hain!",
            bot_nick_failed: "❌ Bot ka nickname badalne mein asafal. Bot admin hai ya nahi check karein.",
            user_nick_failed: "❌ Nickname badalne mein asafal. Bot admin hai ya nahi check karein.",
            multiple: "🔍 \"{name}\" naam ke multiple users mile:\n\n{list}\n\n💡 Nickname \"{nick}\" set karne ke liye number reply karein",
            multiple_clear: "🔍 \"{name}\" naam ke multiple users mile:\n\n{list}\n\n💡 Nickname HATANE ke liye number reply karein",
            no_user_found: "❌ \"{name}\" naam ka koi user nahi mila",
            searching: "⏳ User dhundh rahe hain..."
        }
    };
    const msg = messages[lang] || messages.en;

    if (!args[0]) {
        return api.sendMessage(msg.help, threadID, messageID);
    }

    const subCmd = args[0].toLowerCase();
    const restArgs = args.slice(1);

    // ========== GROUP NAME ==========
    if (subCmd === "g") {
        const isSuperAdmin = global.config.ADMINBOT.includes(senderID);
        let targetID = threadID;
        let targetName = "this group";
        let nameStartIndex = 1;

        if (restArgs[0] && /^\d+$/.test(restArgs[0])) {
            targetID = restArgs[0];
            nameStartIndex = 2;
            const targetInfo = await getTargetThread(targetID);
            if (!targetInfo || !targetInfo.isGroup) {
                return api.sendMessage(msg.group_not_found, threadID, messageID);
            }
            targetName = targetInfo.threadName || targetID;
        }

        const newName = restArgs.slice(nameStartIndex - 1).join(" ").trim();
        if (!newName) {
            return api.sendMessage(msg.missing_args, threadID, messageID);
        }

        const targetInfo = await getTargetThread(targetID);
        if (!targetInfo) return api.sendMessage(msg.group_not_found, threadID, messageID);

        const isUserAdmin = targetInfo.adminIDs.some(item => item.id == senderID);
        const isBotAdmin = targetInfo.adminIDs.some(item => item.id == botID);

        if (!isSuperAdmin && !isUserAdmin) {
            return api.sendMessage(msg.not_admin, threadID, messageID);
        }
        if (!isBotAdmin) {
            return api.sendMessage(msg.bot_not_admin, threadID, messageID);
        }

        api.setTitle(newName, targetID, (err) => {
            if (err) {
                return api.sendMessage(`❌ Failed: ${err.message}`, threadID, messageID);
            }
            if (targetID === threadID) {
                api.sendMessage(msg.group_name_changed.replace("{name}", newName), threadID, messageID);
            } else {
                api.sendMessage(msg.group_name_changed_target.replace("{targetName}", targetName).replace("{name}", newName), threadID, messageID);
            }
        });
        return;
    }

    // ========== BOT NICKNAME ==========
    if (subCmd === "bot") {
        const isSuperAdmin = global.config.ADMINBOT.includes(senderID);
        let targetID = threadID;
        let targetName = "this group";
        let nameStartIndex = 1;

        if (restArgs[0] && /^\d+$/.test(restArgs[0])) {
            targetID = restArgs[0];
            nameStartIndex = 2;
            const targetInfo = await getTargetThread(targetID);
            if (!targetInfo || !targetInfo.isGroup) {
                return api.sendMessage(msg.group_not_found, threadID, messageID);
            }
            targetName = targetInfo.threadName || targetID;
        }

        const newNick = restArgs.slice(nameStartIndex - 1).join(" ").trim();
        if (!newNick) {
            return api.sendMessage(msg.missing_args, threadID, messageID);
        }

        const targetInfo = await getTargetThread(targetID);
        if (!targetInfo) return api.sendMessage(msg.group_not_found, threadID, messageID);

        const isUserAdmin = targetInfo.adminIDs.some(item => item.id == senderID);
        const isBotAdmin = targetInfo.adminIDs.some(item => item.id == botID);

        if (!isSuperAdmin && !isUserAdmin) {
            return api.sendMessage(msg.no_permission, threadID, messageID);
        }
        if (!isBotAdmin) {
            return api.sendMessage(msg.bot_nick_failed, threadID, messageID);
        }

        api.changeNickname(newNick, targetID, botID, (err) => {
            if (err) {
                return api.sendMessage(`❌ Failed: ${err.message}`, threadID, messageID);
            }
            if (targetID === threadID) {
                api.sendMessage(msg.bot_nick_changed.replace("{name}", newNick), threadID, messageID);
            } else {
                api.sendMessage(msg.bot_nick_changed_target.replace("{targetName}", targetName).replace("{name}", newNick), threadID, messageID);
            }
        });
        return;
    }

    // ========== MEMBER NICKNAME ==========
    if (subCmd === "member") {
        const threadInfo = await getTargetThread(threadID);
        const isUserAdmin = threadInfo.adminIDs.some(item => item.id == senderID);
        const isSuperAdmin = global.config.ADMINBOT.includes(senderID);
        const isBotAdmin = threadInfo.adminIDs.some(item => item.id == botID);

        if (!isUserAdmin && !isSuperAdmin) {
            return api.sendMessage(msg.no_permission, threadID, messageID);
        }
        if (!isBotAdmin) {
            return api.sendMessage(msg.no_bot_admin, threadID, messageID);
        }

        async function buildUserCache(participantIDs, threadInfo) {
            const userCache = [];
            for (const uid of participantIDs) {
                if (uid == botID) continue;
                if (uid == senderID) continue;
                try {
                    const userInfo = await api.getUserInfo(uid);
                    const user = userInfo[uid];
                    const userName = user.name || "";
                    const userNickname = threadInfo.nicknames && threadInfo.nicknames[uid] ? threadInfo.nicknames[uid] : "";
                    const isAdmin = threadInfo.adminIDs.some(admin => admin.id == uid);
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

        if (restArgs.length < 1) {
            return api.sendMessage(msg.missing_args, threadID, messageID);
        }

        let isClear = false;
        let targetStartIdx = 0;
        if (restArgs[0].toLowerCase() === "clear") {
            isClear = true;
            targetStartIdx = 1;
            if (restArgs.length < 2) {
                return api.sendMessage(msg.missing_args, threadID, messageID);
            }
        }

        let targetUserID = null;
        let targetUserName = "";
        let nickname = "";
        
        if (!isClear) {
            if (restArgs.length < 2) {
                return api.sendMessage(msg.missing_args, threadID, messageID);
            }
        }

        const firstTargetArg = restArgs[targetStartIdx];

        if (/^\d+$/.test(firstTargetArg)) {
            targetUserID = firstTargetArg;
            if (!isClear) {
                nickname = restArgs.slice(targetStartIdx + 1).join(" ").trim();
            }
            try {
                const userInfo = await api.getUserInfo(targetUserID);
                targetUserName = userInfo[targetUserID].name;
            } catch (e) {
                targetUserName = targetUserID;
            }
        }
        else if (Object.keys(mentions).length > 0 && firstTargetArg.startsWith('@')) {
            targetUserID = Object.keys(mentions)[0];
            targetUserName = mentions[targetUserID].replace('@', '');
            if (!isClear) {
                nickname = restArgs.slice(targetStartIdx + 1).join(" ").trim();
            }
        }
        else {
            const participants = threadInfo.participantIDs;
            const userCache = await buildUserCache(participants, threadInfo);
            
            let searchName = "";
            let matchedUsers = [];
            
            if (isClear) {
                searchName = restArgs.slice(targetStartIdx).join(" ").trim();
                matchedUsers = searchInCache(userCache, searchName);
            } else {
                const argsForSearch = restArgs.slice(targetStartIdx);
                let foundNickname = "";
                for (let i = argsForSearch.length - 1; i >= 1; i--) {
                    const potentialSearch = argsForSearch.slice(0, i).join(" ").trim();
                    const potentialNick = argsForSearch.slice(i).join(" ").trim();
                    if (!potentialSearch || !potentialNick) continue;
                    
                    const matches = searchInCache(userCache, potentialSearch);
                    if (matches.length > 0) {
                        searchName = potentialSearch;
                        foundNickname = potentialNick;
                        matchedUsers = matches;
                        break;
                    }
                }
                nickname = foundNickname;
            }
            
            if (matchedUsers.length === 0) {
                return api.sendMessage(msg.no_user_found.replace("{name}", searchName || restArgs.join(" ")), threadID, messageID);
            }
            
            if (matchedUsers.length === 1) {
                targetUserID = matchedUsers[0].id;
                targetUserName = matchedUsers[0].name;
            } else {
                let listMsg = "";
                for (let i = 0; i < matchedUsers.length; i++) {
                    const user = matchedUsers[i];
                    listMsg += `${i+1}. ${user.name}\n`;
                    listMsg += `   🆔 ID: ${user.id}\n`;
                    if (user.username) listMsg += `   📛 Username: @${user.username}\n`;
                    if (user.nickname) listMsg += `   🏷️ Nickname: ${user.nickname}\n`;
                    listMsg += `   ───────────────────\n`;
                }
                
                const replyMsg = isClear 
                    ? msg.multiple_clear.replace("{name}", searchName).replace("{list}", listMsg)
                    : msg.multiple.replace("{name}", searchName).replace("{list}", listMsg).replace("{nick}", nickname);
                
                api.sendMessage(replyMsg, threadID, (error, info) => {
                    if (!error) {
                        global.client.handleReply.push({
                            name: this.config.name,
                            messageID: info.messageID,
                            author: senderID,
                            users: matchedUsers,
                            nickname: isClear ? "" : nickname
                        });
                    }
                }, messageID);
                return;
            }
        }

        if (isClear) {
            nickname = "";
        }

        if (!isClear && !nickname) {
            return api.sendMessage(msg.missing_args, threadID, messageID);
        }

        if (targetUserID === senderID) {
            return api.sendMessage(msg.cannot_nick_self, threadID, messageID);
        }

        if (targetUserID === botID) {
            return api.sendMessage("Use /setname bot <name> to change bot nickname.", threadID, messageID);
        }

        if (!threadInfo.participantIDs.includes(targetUserID)) {
            return api.sendMessage(msg.user_not_found, threadID, messageID);
        }

        const isTargetAdmin = threadInfo.adminIDs.some(item => item.id == targetUserID);
        if (isTargetAdmin && !isSuperAdmin) {
            return api.sendMessage(msg.cannot_change_admin, threadID, messageID);
        }

        api.changeNickname(nickname, threadID, targetUserID, (err) => {
            if (err) {
                return api.sendMessage(msg.user_nick_failed + `\n${err.message}`, threadID, messageID);
            }
            const response = isClear 
                ? msg.user_nick_cleared.replace("{user}", targetUserName)
                : msg.user_nick_changed.replace("{user}", targetUserName).replace("{nick}", nickname);
            api.sendMessage(response, threadID, messageID);
        });
        return;
    }

    return api.sendMessage(msg.help, threadID, messageID);
};