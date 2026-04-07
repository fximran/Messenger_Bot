module.exports.config = {
    name: "restrict",
    version: "3.0.0",
    hasPermssion: 1,
    credits: "MQL1 Community",
    description: "Ban/Unban members, admins, groups, and commands",
    commandCategory: "Admin",
    usages: "member | admin | box | command | unban | status",
    cooldowns: 5
};

module.exports.handleReply = async function ({ api, event, Threads, Users, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    const { author, type, bannedList, banType } = handleReply;
    
    if (senderID != author) return;
    
    const num = parseInt(body);
    if (isNaN(num) || num < 1 || num > bannedList.length) {
        return api.sendMessage("❌ Invalid number! Please reply with a valid number.", threadID, messageID);
    }
    
    const target = bannedList[num - 1];
    
    if (type === "unban_member") {
        const userData = (await Users.getData(target.id)).data || {};
        if (userData.banned !== 1) {
            return api.sendMessage(`❌ ${target.name} is not banned!`, threadID, messageID);
        }
        
        userData.banned = 0;
        userData.reason = null;
        userData.dateAdded = null;
        await Users.setData(target.id, { data: userData });
        global.data.userBanned.delete(target.id);
        
        return api.sendMessage(`✅ UNBANNED: ${target.name}\n━━━━━━━━━━━━━━━━\n\nUser has been unbanned and can now use the bot.`, threadID, messageID);
    }
    
    else if (type === "unban_admin") {
        const userData = (await Users.getData(target.id)).data || {};
        if (userData.banned !== 1) {
            return api.sendMessage(`❌ ${target.name} is not banned!`, threadID, messageID);
        }
        
        userData.banned = 0;
        userData.reason = null;
        userData.dateAdded = null;
        await Users.setData(target.id, { data: userData });
        global.data.userBanned.delete(target.id);
        
        return api.sendMessage(`✅ UNBANNED ADMIN: ${target.name}\n━━━━━━━━━━━━━━━━\n\nAdmin has been unbanned.`, threadID, messageID);
    }
    
    else if (type === "unban_command") {
        const threadData = (await Threads.getData(threadID)).data || {};
        const bannedCommands = threadData.bannedCommands || [];
        
        if (!bannedCommands.includes(target)) {
            return api.sendMessage(`❌ Command "${target}" is not banned in this group!`, threadID, messageID);
        }
        
        const index = bannedCommands.indexOf(target);
        bannedCommands.splice(index, 1);
        threadData.bannedCommands = bannedCommands;
        await Threads.setData(threadID, { data: threadData });
        global.data.threadData.set(threadID, threadData);
        
        return api.sendMessage(`✅ COMMAND UNBANNED\n━━━━━━━━━━━━━━━━\n\n🔓 "${target}" has been unbanned in this group.`, threadID, messageID);
    }
};

module.exports.run = async function ({ api, event, Threads, Users, args }) {
    const { threadID, messageID, senderID, type } = event;
    
    // Check if user is admin
    const threadInfo = await api.getThreadInfo(threadID);
    const isGroupAdmin = threadInfo.adminIDs.some(item => item.id == senderID);
    const isSuperAdmin = global.config.ADMINBOT.includes(senderID);
    
    if (!isGroupAdmin && !isSuperAdmin) {
        return api.sendMessage("❌ Only group admins can use restrict commands!", threadID, messageID);
    }
    
    // Get current language for this group
    const threadData = (await Threads.getData(threadID)).data || {};
    const lang = threadData.language || global.config.language || "en";
    
    // Language specific messages
    const messages = {
        en: {
            // Ban messages
            member_banned: "✅ BANNED: {name}\n━━━━━━━━━━━━━━━━\n\nUser has been banned from using the bot.",
            admin_banned: "✅ ADMIN BANNED: {name}\n━━━━━━━━━━━━━━━━\n\nAdmin has been banned from using the bot.",
            box_banned: "✅ GROUP BANNED\n━━━━━━━━━━━━━━━━\n\nThis group has been banned from using the bot.",
            already_banned: "⚠️ {name} is already banned!",
            already_box_banned: "⚠️ This group is already banned!",
            
            // Unban messages
            unbanned: "✅ UNBANNED: {name}\n━━━━━━━━━━━━━━━━\n\nUser has been unbanned.",
            admin_unbanned: "✅ ADMIN UNBANNED: {name}\n━━━━━━━━━━━━━━━━\n\nAdmin has been unbanned.",
            box_unbanned: "✅ GROUP UNBANNED\n━━━━━━━━━━━━━━━━\n\nThis group has been unbanned.",
            not_banned: "❌ {name} is not banned!",
            box_not_banned: "❌ This group is not banned!",
            
            // Command ban messages
            command_banned: "✅ COMMAND BANNED\n━━━━━━━━━━━━━━━━\n\n🔨 \"{command}\" has been banned in this group.",
            command_unbanned: "✅ COMMAND UNBANNED\n━━━━━━━━━━━━━━━━\n\n🔓 \"{command}\" has been unbanned.",
            command_already_banned: "⚠️ Command \"{command}\" is already banned!",
            command_not_banned: "❌ Command \"{command}\" is not banned!",
            command_not_exist: "❌ Command \"{command}\" does not exist!",
            command_banned_all: "✅ ALL COMMANDS BANNED\n━━━━━━━━━━━━━━━━\n\nAll {count} commands have been banned.",
            command_unbanned_all: "✅ ALL COMMANDS UNBANNED\n━━━━━━━━━━━━━━━━\n\nAll commands have been unbanned.",
            
            // Permission messages
            no_bot_admin: "❌ Bot needs to be group admin to ban members!",
            no_permission: "❌ Only group admins can use this command!",
            cannot_ban_admin: "❌ Cannot ban a group admin!",
            cannot_ban_self: "❌ You cannot ban yourself!",
            cannot_ban_bot: "❌ You cannot ban the bot!",
            
            // Invalid messages
            invalid: "❌ Invalid command!\n\nUse /restrict to see all commands.",
            
            // Help
            help: `📖 RESTRICT SYSTEM - BAN & UNBAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 MEMBER BAN:
   • /restrict member @user - Ban a member
   • /restrict member (reply) - Ban replied user
   • /restrict member id [ID] - Ban by ID
   • /restrict member - Show banned members list

👑 ADMIN BAN:
   • /restrict admin @user - Ban an admin
   • /restrict admin (reply) - Ban replied admin
   • /restrict admin id [ID] - Ban admin by ID
   • /restrict admin - Show banned admins list

📦 GROUP BAN:
   • /restrict box - Ban this group

🔨 COMMAND BAN:
   • /restrict command [cmd] - Ban a command
   • /restrict command all - Ban all commands
   • /restrict command - Show banned commands

🔓 UNBAN:
   • /restrict unban member @user - Unban member
   • /restrict unban member (reply) - Unban replied user
   • /restrict unban member id [ID] - Unban by ID
   • /restrict unban member - Show banned members list
   • /restrict unban admin @user - Unban admin
   • /restrict unban admin (reply) - Unban replied admin
   • /restrict unban admin id [ID] - Unban admin by ID
   • /restrict unban admin - Show banned admins list
   • /restrict unban box - Unban this group
   • /restrict unban command [cmd] - Unban a command
   • /restrict unban command all - Unban all commands

📊 STATUS:
   • /restrict status - Show all ban status

💡 Reply with number to unban from list
👑 Only group admins can use this command`
        },
        bn: {
            member_banned: "✅ BANNED: {name}\n━━━━━━━━━━━━━━━━\n\nUser ke bot use kora theke ban kora hoyeche.",
            admin_banned: "✅ ADMIN BANNED: {name}\n━━━━━━━━━━━━━━━━\n\nAdmin ke bot use kora theke ban kora hoyeche.",
            box_banned: "✅ GROUP BANNED\n━━━━━━━━━━━━━━━━\n\nEi group ke bot use kora theke ban kora hoyeche.",
            already_banned: "⚠️ {name} already banned!",
            already_box_banned: "⚠️ Ei group already banned!",
            
            unbanned: "✅ UNBANNED: {name}\n━━━━━━━━━━━━━━━━\n\nUser er ban remove kora hoyeche.",
            admin_unbanned: "✅ ADMIN UNBANNED: {name}\n━━━━━━━━━━━━━━━━\n\nAdmin er ban remove kora hoyeche.",
            box_unbanned: "✅ GROUP UNBANNED\n━━━━━━━━━━━━━━━━\n\nEi group er ban remove kora hoyeche.",
            not_banned: "❌ {name} banned na!",
            box_not_banned: "❌ Ei group banned na!",
            
            command_banned: "✅ COMMAND BANNED\n━━━━━━━━━━━━━━━━\n\n🔨 \"{command}\" ei group e ban kora hoyeche.",
            command_unbanned: "✅ COMMAND UNBANNED\n━━━━━━━━━━━━━━━━\n\n🔓 \"{command}\" er ban remove kora hoyeche.",
            command_already_banned: "⚠️ \"{command}\" command already banned!",
            command_not_banned: "❌ \"{command}\" command banned na!",
            command_not_exist: "❌ \"{command}\" command ta nei!",
            command_banned_all: "✅ ALL COMMANDS BANNED\n━━━━━━━━━━━━━━━━\n\nShob {count} ta command ban kora hoyeche.",
            command_unbanned_all: "✅ ALL COMMANDS UNBANNED\n━━━━━━━━━━━━━━━━\n\nShob command er ban remove kora hoyeche.",
            
            no_bot_admin: "❌ Member ban korte bot ke group admin hote hobe!",
            no_permission: "❌ Shudhu group adminra ei command use korte parben!",
            cannot_ban_admin: "❌ Group admin ke ban kora jabe na!",
            cannot_ban_self: "❌ Apni nijeke ban korte parben na!",
            cannot_ban_bot: "❌ Apni bot ke ban korte parben na!",
            
            invalid: "❌ Vul command!\n\nShob command dekhte /restrict use korun.",
            
            help: `📖 RESTRICT SYSTEM - BAN & UNBAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 MEMBER BAN:
   • /restrict member @user - Member ban korte
   • /restrict member (reply) - Reply kora user ke ban korte
   • /restrict member id [ID] - ID diye ban korte
   • /restrict member - Banned members list dekhte

👑 ADMIN BAN:
   • /restrict admin @user - Admin ban korte
   • /restrict admin (reply) - Reply kora admin ke ban korte
   • /restrict admin id [ID] - ID diye admin ban korte
   • /restrict admin - Banned admins list dekhte

📦 GROUP BAN:
   • /restrict box - Ei group ke ban korte

🔨 COMMAND BAN:
   • /restrict command [cmd] - Command ban korte
   • /restrict command all - Shob command ban korte
   • /restrict command - Banned commands list dekhte

🔓 UNBAN:
   • /restrict unban member @user - Member unban korte
   • /restrict unban member (reply) - Reply kora user unban korte
   • /restrict unban member id [ID] - ID diye unban korte
   • /restrict unban member - Banned members list dekhte
   • /restrict unban admin @user - Admin unban korte
   • /restrict unban admin (reply) - Reply kora admin unban korte
   • /restrict unban admin id [ID] - ID diye admin unban korte
   • /restrict unban admin - Banned admins list dekhte
   • /restrict unban box - Group unban korte
   • /restrict unban command [cmd] - Command unban korte
   • /restrict unban command all - Shob command unban korte

📊 STATUS:
   • /restrict status - Shob ban status dekhte

💡 List theke unban korte number diye reply korun
👑 Shudhu group adminra ei command use korte parben`
        },
        hi: {
            member_banned: "✅ BANNED: {name}\n━━━━━━━━━━━━━━━━\n\nUser ko bot use karne se ban kar diya gaya.",
            admin_banned: "✅ ADMIN BANNED: {name}\n━━━━━━━━━━━━━━━━\n\nAdmin ko bot use karne se ban kar diya gaya.",
            box_banned: "✅ GROUP BANNED\n━━━━━━━━━━━━━━━━\n\nIs group ko bot use karne se ban kar diya gaya.",
            already_banned: "⚠️ {name} already banned hai!",
            already_box_banned: "⚠️ Yeh group already banned hai!",
            
            unbanned: "✅ UNBANNED: {name}\n━━━━━━━━━━━━━━━━\n\nUser ka ban hataya gaya.",
            admin_unbanned: "✅ ADMIN UNBANNED: {name}\n━━━━━━━━━━━━━━━━\n\nAdmin ka ban hataya gaya.",
            box_unbanned: "✅ GROUP UNBANNED\n━━━━━━━━━━━━━━━━\n\nIs group ka ban hataya gaya.",
            not_banned: "❌ {name} banned nahi hai!",
            box_not_banned: "❌ Yeh group banned nahi hai!",
            
            command_banned: "✅ COMMAND BANNED\n━━━━━━━━━━━━━━━━\n\n🔨 \"{command}\" is group mein ban kar diya gaya.",
            command_unbanned: "✅ COMMAND UNBANNED\n━━━━━━━━━━━━━━━━\n\n🔓 \"{command}\" ka ban hataya gaya.",
            command_already_banned: "⚠️ \"{command}\" command already banned hai!",
            command_not_banned: "❌ \"{command}\" command banned nahi hai!",
            command_not_exist: "❌ \"{command}\" command exists nahi karta!",
            command_banned_all: "✅ ALL COMMANDS BANNED\n━━━━━━━━━━━━━━━━\n\nSaare {count} commands ban kar diye gaye.",
            command_unbanned_all: "✅ ALL COMMANDS UNBANNED\n━━━━━━━━━━━━━━━━\n\nSaare commands ka ban hata diya gaya.",
            
            no_bot_admin: "❌ Member ban karne ke liye bot ko group admin hona chahiye!",
            no_permission: "❌ Sirf group admin hi is command ka use kar sakte hain!",
            cannot_ban_admin: "❌ Group admin ko ban nahi kar sakte!",
            cannot_ban_self: "❌ Aap khud ko ban nahi kar sakte!",
            cannot_ban_bot: "❌ Aap bot ko ban nahi kar sakte!",
            
            invalid: "❌ Galat command!\n\nSaare commands dekhne ke liye /restrict use karein.",
            
            help: `📖 RESTRICT SYSTEM - BAN & UNBAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 MEMBER BAN:
   • /restrict member @user - Member ko ban karein
   • /restrict member (reply) - Reply kiye gaye user ko ban karein
   • /restrict member id [ID] - ID se ban karein
   • /restrict member - Banned members ki list dekhein

👑 ADMIN BAN:
   • /restrict admin @user - Admin ko ban karein
   • /restrict admin (reply) - Reply kiye gaye admin ko ban karein
   • /restrict admin id [ID] - ID se admin ban karein
   • /restrict admin - Banned admins ki list dekhein

📦 GROUP BAN:
   • /restrict box - Is group ko ban karein

🔨 COMMAND BAN:
   • /restrict command [cmd] - Command ko ban karein
   • /restrict command all - Saare commands ban karein
   • /restrict command - Banned commands ki list dekhein

🔓 UNBAN:
   • /restrict unban member @user - Member ka ban hatayein
   • /restrict unban member (reply) - Reply kiye gaye user ka ban hatayein
   • /restrict unban member id [ID] - ID se ban hatayein
   • /restrict unban member - Banned members ki list dekhein
   • /restrict unban admin @user - Admin ka ban hatayein
   • /restrict unban admin (reply) - Reply kiye gaye admin ka ban hatayein
   • /restrict unban admin id [ID] - ID se admin ka ban hatayein
   • /restrict unban admin - Banned admins ki list dekhein
   • /restrict unban box - Group ka ban hatayein
   • /restrict unban command [cmd] - Command ka ban hatayein
   • /restrict unban command all - Saare commands ka ban hatayein

📊 STATUS:
   • /restrict status - Sabhi ban status dekhein

💡 List se unban karne ke liye number se reply karein
👑 Sirf group admin hi is command ka use kar sakte hain`
        }
    };
    
    const msg = messages[lang] || messages.en;
    
    // ========== BAN MEMBER ==========
    if (args[0] === "member") {
        if (!threadInfo.adminIDs.some(item => item.id == api.getCurrentUserID())) {
            return api.sendMessage(msg.no_bot_admin, threadID, messageID);
        }
        
        let targetId = null;
        let targetName = "";
        
        // Get target from reply
        if (type === "message_reply") {
            targetId = event.messageReply.senderID;
            const userInfo = await api.getUserInfo(targetId);
            targetName = userInfo[targetId].name;
        }
        // Get target from mention
        else if (Object.keys(event.mentions).length > 0) {
            targetId = Object.keys(event.mentions)[0];
            targetName = event.mentions[targetId].replace("@", "");
        }
        // Get target from ID
        else if (args[1] === "id" && args[2]) {
            targetId = args[2];
            const userInfo = await api.getUserInfo(targetId);
            targetName = userInfo[targetId].name;
        }
        // Show banned members list
        else if (!args[1]) {
            const userBanned = global.data.userBanned.keys();
            let bannedList = [];
            let i = 1;
            
            for (const userId of userBanned) {
                try {
                    const userInfo = await api.getUserInfo(userId);
                    const name = userInfo[userId].name || "Unknown";
                    const isAdmin = threadInfo.adminIDs.some(a => a.id == userId);
                    if (!isAdmin) {
                        bannedList.push({ id: userId, name: name });
                    }
                } catch(e) {}
            }
            
            if (bannedList.length === 0) {
                return api.sendMessage("📋 No banned members found in this group.", threadID, messageID);
            }
            
            let listMsg = "📋 BANNED MEMBERS IN THIS GROUP\n━━━━━━━━━━━━━━━━━━━━\n\n";
            for (let i = 0; i < bannedList.length; i++) {
                listMsg += `${i+1}. ${bannedList[i].name}\n   🆔 ID: ${bannedList[i].id}\n\n`;
            }
            listMsg += "━━━━━━━━━━━━━━━━━━━━\n💡 Reply with number to UNBAN";
            
            return api.sendMessage(listMsg, threadID, (error, info) => {
                if (!error) {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID,
                        type: "unban_member",
                        bannedList: bannedList,
                        banType: "member"
                    });
                }
            }, messageID);
        }
        
        if (!targetId) {
            return api.sendMessage(msg.invalid, threadID, messageID);
        }
        
        // Validation checks
        if (targetId == senderID) return api.sendMessage(msg.cannot_ban_self, threadID, messageID);
        if (targetId == api.getCurrentUserID()) return api.sendMessage(msg.cannot_ban_bot, threadID, messageID);
        if (threadInfo.adminIDs.some(item => item.id == targetId)) return api.sendMessage(msg.cannot_ban_admin, threadID, messageID);
        
        const userData = (await Users.getData(targetId)).data || {};
        if (userData.banned === 1) {
            return api.sendMessage(msg.already_banned.replace("{name}", targetName), threadID, messageID);
        }
        
        userData.banned = 1;
        userData.dateAdded = Date.now();
        await Users.setData(targetId, { data: userData });
        global.data.userBanned.set(targetId, { dateAdded: userData.dateAdded });
        
        return api.sendMessage(msg.member_banned.replace("{name}", targetName), threadID, messageID);
    }
    
    // ========== BAN ADMIN ==========
    else if (args[0] === "admin") {
        if (!threadInfo.adminIDs.some(item => item.id == api.getCurrentUserID())) {
            return api.sendMessage(msg.no_bot_admin, threadID, messageID);
        }
        
        let targetId = null;
        let targetName = "";
        
        // Get target from reply
        if (type === "message_reply") {
            targetId = event.messageReply.senderID;
            const userInfo = await api.getUserInfo(targetId);
            targetName = userInfo[targetId].name;
        }
        // Get target from mention
        else if (Object.keys(event.mentions).length > 0) {
            targetId = Object.keys(event.mentions)[0];
            targetName = event.mentions[targetId].replace("@", "");
        }
        // Get target from ID
        else if (args[1] === "id" && args[2]) {
            targetId = args[2];
            const userInfo = await api.getUserInfo(targetId);
            targetName = userInfo[targetId].name;
        }
        // Show banned admins list
        else if (!args[1]) {
            const userBanned = global.data.userBanned.keys();
            let bannedList = [];
            let i = 1;
            
            for (const userId of userBanned) {
                try {
                    const userInfo = await api.getUserInfo(userId);
                    const name = userInfo[userId].name || "Unknown";
                    const isAdmin = threadInfo.adminIDs.some(a => a.id == userId);
                    if (isAdmin) {
                        bannedList.push({ id: userId, name: name });
                    }
                } catch(e) {}
            }
            
            if (bannedList.length === 0) {
                return api.sendMessage("📋 No banned admins found in this group.", threadID, messageID);
            }
            
            let listMsg = "📋 BANNED ADMINS IN THIS GROUP\n━━━━━━━━━━━━━━━━━━━━\n\n";
            for (let i = 0; i < bannedList.length; i++) {
                listMsg += `${i+1}. ${bannedList[i].name}\n   🆔 ID: ${bannedList[i].id}\n\n`;
            }
            listMsg += "━━━━━━━━━━━━━━━━━━━━\n💡 Reply with number to UNBAN";
            
            return api.sendMessage(listMsg, threadID, (error, info) => {
                if (!error) {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID,
                        type: "unban_admin",
                        bannedList: bannedList,
                        banType: "admin"
                    });
                }
            }, messageID);
        }
        
        if (!targetId) {
            return api.sendMessage(msg.invalid, threadID, messageID);
        }
        
        // Validation checks
        if (targetId == senderID) return api.sendMessage(msg.cannot_ban_self, threadID, messageID);
        if (targetId == api.getCurrentUserID()) return api.sendMessage(msg.cannot_ban_bot, threadID, messageID);
        if (!threadInfo.adminIDs.some(item => item.id == targetId)) return api.sendMessage("❌ This user is not an admin!", threadID, messageID);
        
        const userData = (await Users.getData(targetId)).data || {};
        if (userData.banned === 1) {
            return api.sendMessage(msg.already_banned.replace("{name}", targetName), threadID, messageID);
        }
        
        userData.banned = 1;
        userData.dateAdded = Date.now();
        await Users.setData(targetId, { data: userData });
        global.data.userBanned.set(targetId, { dateAdded: userData.dateAdded });
        
        return api.sendMessage(msg.admin_banned.replace("{name}", targetName), threadID, messageID);
    }
    
    // ========== BAN BOX/GROUP ==========
    else if (args[0] === "box") {
        const threadData = (await Threads.getData(threadID)).data || {};
        
        if (threadData.banned === 1) {
            return api.sendMessage(msg.already_box_banned, threadID, messageID);
        }
        
        threadData.banned = 1;
        threadData.dateAdded = Date.now();
        await Threads.setData(threadID, { data: threadData });
        global.data.threadBanned.set(threadID, { dateAdded: threadData.dateAdded });
        
        return api.sendMessage(msg.box_banned, threadID, messageID);
    }
    
    // ========== BAN COMMAND ==========
    else if (args[0] === "command") {
        const commandToBan = args[1];
        
        if (!commandToBan) {
            // Show banned commands list
            const threadData = (await Threads.getData(threadID)).data || {};
            const bannedCommands = threadData.bannedCommands || [];
            
            if (bannedCommands.length === 0) {
                return api.sendMessage("📋 No commands are banned in this group.", threadID, messageID);
            }
            
            let listMsg = "📋 BANNED COMMANDS IN THIS GROUP\n━━━━━━━━━━━━━━━━━━━━\n\n";
            for (let i = 0; i < bannedCommands.length; i++) {
                listMsg += `${i+1}. ${bannedCommands[i]}\n`;
            }
            listMsg += "\n━━━━━━━━━━━━━━━━━━━━\n💡 Reply with number to UNBAN";
            
            return api.sendMessage(listMsg, threadID, (error, info) => {
                if (!error) {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID,
                        type: "unban_command",
                        bannedList: bannedCommands,
                        banType: "command"
                    });
                }
            }, messageID);
        }
        
        if (commandToBan === "all") {
            const allCommands = [];
            for (const [name] of global.client.commands) {
                allCommands.push(name);
            }
            
            const threadData = (await Threads.getData(threadID)).data || {};
            threadData.bannedCommands = allCommands;
            await Threads.setData(threadID, { data: threadData });
            global.data.threadData.set(threadID, threadData);
            
            return api.sendMessage(msg.command_banned_all.replace("{count}", allCommands.length), threadID, messageID);
        }
        
        const commandExists = global.client.commands.has(commandToBan.toLowerCase());
        if (!commandExists) {
            return api.sendMessage(msg.command_not_exist.replace("{command}", commandToBan), threadID, messageID);
        }
        
        const threadData = (await Threads.getData(threadID)).data || {};
        const bannedCommands = threadData.bannedCommands || [];
        
        if (bannedCommands.includes(commandToBan.toLowerCase())) {
            return api.sendMessage(msg.command_already_banned.replace("{command}", commandToBan), threadID, messageID);
        }
        
        bannedCommands.push(commandToBan.toLowerCase());
        threadData.bannedCommands = bannedCommands;
        await Threads.setData(threadID, { data: threadData });
        global.data.threadData.set(threadID, threadData);
        
        return api.sendMessage(msg.command_banned.replace("{command}", commandToBan), threadID, messageID);
    }
    
    // ========== UNBAN ==========
    else if (args[0] === "unban") {
        // Unban member
        if (args[1] === "member") {
            let targetId = null;
            let targetName = "";
            
            if (type === "message_reply") {
                targetId = event.messageReply.senderID;
                const userInfo = await api.getUserInfo(targetId);
                targetName = userInfo[targetId].name;
            } else if (Object.keys(event.mentions).length > 0) {
                targetId = Object.keys(event.mentions)[0];
                targetName = event.mentions[targetId].replace("@", "");
            } else if (args[2] === "id" && args[3]) {
                targetId = args[3];
                const userInfo = await api.getUserInfo(targetId);
                targetName = userInfo[targetId].name;
            } else if (!args[2]) {
                const userBanned = global.data.userBanned.keys();
                let bannedList = [];
                
                for (const userId of userBanned) {
                    try {
                        const userInfo = await api.getUserInfo(userId);
                        const name = userInfo[userId].name || "Unknown";
                        const isAdmin = threadInfo.adminIDs.some(a => a.id == userId);
                        if (!isAdmin) {
                            bannedList.push({ id: userId, name: name });
                        }
                    } catch(e) {}
                }
                
                if (bannedList.length === 0) {
                    return api.sendMessage("📋 No banned members found in this group.", threadID, messageID);
                }
                
                let listMsg = "📋 BANNED MEMBERS IN THIS GROUP\n━━━━━━━━━━━━━━━━━━━━\n\n";
                for (let i = 0; i < bannedList.length; i++) {
                    listMsg += `${i+1}. ${bannedList[i].name}\n   🆔 ID: ${bannedList[i].id}\n\n`;
                }
                listMsg += "━━━━━━━━━━━━━━━━━━━━\n💡 Reply with number to UNBAN";
                
                return api.sendMessage(listMsg, threadID, (error, info) => {
                    if (!error) {
                        global.client.handleReply.push({
                            name: this.config.name,
                            messageID: info.messageID,
                            author: senderID,
                            type: "unban_member",
                            bannedList: bannedList
                        });
                    }
                }, messageID);
            }
            
            if (!targetId) {
                return api.sendMessage(msg.invalid, threadID, messageID);
            }
            
            const userData = (await Users.getData(targetId)).data || {};
            if (userData.banned !== 1) {
                return api.sendMessage(msg.not_banned.replace("{name}", targetName), threadID, messageID);
            }
            
            userData.banned = 0;
            userData.reason = null;
            userData.dateAdded = null;
            await Users.setData(targetId, { data: userData });
            global.data.userBanned.delete(targetId);
            
            return api.sendMessage(msg.unbanned.replace("{name}", targetName), threadID, messageID);
        }
        
        // Unban admin
        else if (args[1] === "admin") {
            let targetId = null;
            let targetName = "";
            
            if (type === "message_reply") {
                targetId = event.messageReply.senderID;
                const userInfo = await api.getUserInfo(targetId);
                targetName = userInfo[targetId].name;
            } else if (Object.keys(event.mentions).length > 0) {
                targetId = Object.keys(event.mentions)[0];
                targetName = event.mentions[targetId].replace("@", "");
            } else if (args[2] === "id" && args[3]) {
                targetId = args[3];
                const userInfo = await api.getUserInfo(targetId);
                targetName = userInfo[targetId].name;
            } else if (!args[2]) {
                const userBanned = global.data.userBanned.keys();
                let bannedList = [];
                
                for (const userId of userBanned) {
                    try {
                        const userInfo = await api.getUserInfo(userId);
                        const name = userInfo[userId].name || "Unknown";
                        const isAdmin = threadInfo.adminIDs.some(a => a.id == userId);
                        if (isAdmin) {
                            bannedList.push({ id: userId, name: name });
                        }
                    } catch(e) {}
                }
                
                if (bannedList.length === 0) {
                    return api.sendMessage("📋 No banned admins found in this group.", threadID, messageID);
                }
                
                let listMsg = "📋 BANNED ADMINS IN THIS GROUP\n━━━━━━━━━━━━━━━━━━━━\n\n";
                for (let i = 0; i < bannedList.length; i++) {
                    listMsg += `${i+1}. ${bannedList[i].name}\n   🆔 ID: ${bannedList[i].id}\n\n`;
                }
                listMsg += "━━━━━━━━━━━━━━━━━━━━\n💡 Reply with number to UNBAN";
                
                return api.sendMessage(listMsg, threadID, (error, info) => {
                    if (!error) {
                        global.client.handleReply.push({
                            name: this.config.name,
                            messageID: info.messageID,
                            author: senderID,
                            type: "unban_admin",
                            bannedList: bannedList
                        });
                    }
                }, messageID);
            }
            
            if (!targetId) {
                return api.sendMessage(msg.invalid, threadID, messageID);
            }
            
            const userData = (await Users.getData(targetId)).data || {};
            if (userData.banned !== 1) {
                return api.sendMessage(msg.not_banned.replace("{name}", targetName), threadID, messageID);
            }
            
            userData.banned = 0;
            userData.reason = null;
            userData.dateAdded = null;
            await Users.setData(targetId, { data: userData });
            global.data.userBanned.delete(targetId);
            
            return api.sendMessage(msg.admin_unbanned.replace("{name}", targetName), threadID, messageID);
        }
        
        // Unban box/group
        else if (args[1] === "box") {
            const threadData = (await Threads.getData(threadID)).data || {};
            
            if (threadData.banned !== 1) {
                return api.sendMessage(msg.box_not_banned, threadID, messageID);
            }
            
            threadData.banned = 0;
            threadData.reason = null;
            threadData.dateAdded = null;
            await Threads.setData(threadID, { data: threadData });
            global.data.threadBanned.delete(threadID);
            
            return api.sendMessage(msg.box_unbanned, threadID, messageID);
        }
        
        // Unban command
        else if (args[1] === "command") {
            const commandToUnban = args[2];
            
            if (!commandToUnban) {
                const threadData = (await Threads.getData(threadID)).data || {};
                const bannedCommands = threadData.bannedCommands || [];
                
                if (bannedCommands.length === 0) {
                    return api.sendMessage("📋 No commands are banned in this group.", threadID, messageID);
                }
                
                let listMsg = "📋 BANNED COMMANDS IN THIS GROUP\n━━━━━━━━━━━━━━━━━━━━\n\n";
                for (let i = 0; i < bannedCommands.length; i++) {
                    listMsg += `${i+1}. ${bannedCommands[i]}\n`;
                }
                listMsg += "\n━━━━━━━━━━━━━━━━━━━━\n💡 Reply with number to UNBAN";
                
                return api.sendMessage(listMsg, threadID, (error, info) => {
                    if (!error) {
                        global.client.handleReply.push({
                            name: this.config.name,
                            messageID: info.messageID,
                            author: senderID,
                            type: "unban_command",
                            bannedList: bannedCommands
                        });
                    }
                }, messageID);
            }
            
            if (commandToUnban === "all") {
                const threadData = (await Threads.getData(threadID)).data || {};
                threadData.bannedCommands = [];
                await Threads.setData(threadID, { data: threadData });
                global.data.threadData.set(threadID, threadData);
                
                return api.sendMessage(msg.command_unbanned_all, threadID, messageID);
            }
            
            const threadData = (await Threads.getData(threadID)).data || {};
            const bannedCommands = threadData.bannedCommands || [];
            
            if (!bannedCommands.includes(commandToUnban.toLowerCase())) {
                return api.sendMessage(msg.command_not_banned.replace("{command}", commandToUnban), threadID, messageID);
            }
            
            const index = bannedCommands.indexOf(commandToUnban.toLowerCase());
            bannedCommands.splice(index, 1);
            threadData.bannedCommands = bannedCommands;
            await Threads.setData(threadID, { data: threadData });
            global.data.threadData.set(threadID, threadData);
            
            return api.sendMessage(msg.command_unbanned.replace("{command}", commandToUnban), threadID, messageID);
        }
        
        else {
            return api.sendMessage(msg.invalid, threadID, messageID);
        }
    }
    
    // ========== STATUS ==========
    else if (args[0] === "status") {
        const threadData = (await Threads.getData(threadID)).data || {};
        const isGroupBanned = threadData.banned === 1;
        
        let bannedAdmins = [];
        let bannedMembers = [];
        
        for (const participant of threadInfo.participantIDs) {
            const userData = (await Users.getData(participant)).data || {};
            if (userData.banned === 1) {
                const userInfo = await api.getUserInfo(participant);
                const name = userInfo[participant].name || "Unknown";
                const isAdmin = threadInfo.adminIDs.some(a => a.id == participant);
                
                if (isAdmin) {
                    bannedAdmins.push(name);
                } else {
                    bannedMembers.push(name);
                }
            }
        }
        
        const threadDataCmd = (await Threads.getData(threadID)).data || {};
        const bannedCommands = threadDataCmd.bannedCommands || [];
        const bannedCommandsText = bannedCommands.length > 0 ? bannedCommands.join(", ") : "None";
        
        return api.sendMessage(
            `📋 RESTRICT STATUS\n━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🔒 Group Ban: ${isGroupBanned ? "✅ BANNED" : "❌ NOT BANNED"}\n\n` +
            `👑 Banned Admins (${bannedAdmins.length}):\n   ${bannedAdmins.length > 0 ? bannedAdmins.join(", ") : "None"}\n\n` +
            `👥 Banned Members (${bannedMembers.length}):\n   ${bannedMembers.length > 0 ? bannedMembers.join(", ") : "None"}\n\n` +
            `🔨 Banned Commands (${bannedCommands.length}):\n   ${bannedCommandsText}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💡 Use /restrict to see all commands`,
            threadID, messageID
        );
    }
    
    // ========== HELP (default) ==========
    else {
        return api.sendMessage(msg.help, threadID, messageID);
    }
};