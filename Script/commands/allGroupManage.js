const fs = require("fs-extra");
const moment = require("moment-timezone");

module.exports.config = {
  name: 'allgroup',
  version: '4.5.0',
  credits: "MQL1 Community",
  hasPermssion: 1,
  description: 'List groups - Bot Admins see all, Group Admins see only their groups',
  commandCategory: 'Admin',
  usages: '[page/all]',
  cooldowns: 5
};

module.exports.handleReply = async function ({ api, event, args, Threads, handleReply }) {
  const { threadID, messageID, senderID } = event;
  
  if (parseInt(senderID) !== parseInt(handleReply.author)) {
    return;
  }
  
  const isBotAdmin = global.config.ADMINBOT.includes(senderID);
  const time = moment.tz("Asia/Dhaka").format("HH:MM:ss L");
  var arg = event.body.trim().split(" ");
  var cmd = arg[0].toLowerCase();
  var num = parseInt(arg[1]);
  
  if (isNaN(num) || num < 1 || num > handleReply.groupid.length) {
    return api.sendMessage("❌ Invalid number. Please reply with: ban [number], unban [number], out [number], del [number], join [number], promote [number], or delmsg [number]", threadID, messageID);
  }
  
  var idgr = handleReply.groupid[num - 1];
  var groupName = handleReply.groupName[num - 1];
  
  if (cmd === "join" || cmd === "promote") {
    if (!isBotAdmin) {
      return api.sendMessage("❌ This command is only for Bot Admins!", threadID, messageID);
    }
  }
  
  switch (cmd) {
    case "ban":
      {
        const data = (await Threads.getData(idgr)).data || {};
        data.banned = 1;
        data.dateAdded = time;
        await Threads.setData(idgr, { data });
        global.data.threadBanned.set(idgr, { dateAdded: data.dateAdded });
        api.sendMessage(`✅ Group "${groupName}" has been BANNED from using the bot.`, threadID, messageID);
        api.sendMessage(`⚠️ This group has been banned by admin.`, idgr);
        break;
      }

    case "unban":
      {
        const data = (await Threads.getData(idgr)).data || {};
        data.banned = 0;
        data.dateAdded = null;
        await Threads.setData(idgr, { data });
        global.data.threadBanned.delete(idgr);
        api.sendMessage(`✅ Group "${groupName}" has been UNBANNED.`, threadID, messageID);
        api.sendMessage(`✅ This group has been unbanned. Bot will work now.`, idgr);
        break;
      }

    case "del":
      {
        await Threads.delData(idgr);
        api.sendMessage(`🗑️ Data for group "${groupName}" (${idgr}) has been DELETED.`, threadID, messageID);
        break;
      }

    case "out":
      {
        api.sendMessage(`👋 Bot is leaving group "${groupName}". Goodbye!`, threadID, messageID);
        api.sendMessage(`👋 Bot is leaving this group.`, idgr, () => {
          api.removeUserFromGroup(api.getCurrentUserID(), idgr);
        });
        break;
      }

    case "join":
      {
        try {
          const threadInfo = await api.getThreadInfo(idgr);
          if (threadInfo.participantIDs.includes(senderID)) {
            return api.sendMessage(`⚠️ You are already in "${groupName}" group!`, threadID, messageID);
          }
          
          await api.addUserToGroup(senderID, idgr);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const updatedThreadInfo = await api.getThreadInfo(idgr);
          const isBotAdminInGroup = updatedThreadInfo.adminIDs.some(admin => admin.id == api.getCurrentUserID());
          
          if (isBotAdminInGroup) {
            try {
              await api.changeAdminStatus(idgr, senderID, true);
              const successMsg = `✅ Successfully added you to "${groupName}" group and promoted you to ADMIN!\n\n👑 You are now an admin of this group.\n📌 Check your groups section.`;
              return api.sendMessage(successMsg, threadID, messageID);
            } catch (promoteError) {
              const partialMsg = `⚠️ Added you to "${groupName}" group, but failed to promote you to admin.\n\nReason: ${promoteError.message || "Unknown error"}`;
              return api.sendMessage(partialMsg, threadID, messageID);
            }
          } else {
            const botNotAdminMsg = `✅ Added you to "${groupName}" group!\n\n⚠️ Bot is not an admin in this group, so couldn't promote you.\n💡 Ask an admin to promote you manually.`;
            return api.sendMessage(botNotAdminMsg, threadID, messageID);
          }
        } catch (error) {
          return api.sendMessage(`❌ Failed to add you to "${groupName}".\nReason: ${error.message || "Bot may not be admin or group is full"}`, threadID, messageID);
        }
      }
    
    case "promote":
      {
        try {
          const threadInfo = await api.getThreadInfo(idgr);
          
          if (!threadInfo.participantIDs.includes(senderID)) {
            return api.sendMessage(`❌ You are not in "${groupName}" group!`, threadID, messageID);
          }
          
          if (threadInfo.adminIDs.some(admin => admin.id == senderID)) {
            return api.sendMessage(`👑 You are already an ADMIN in "${groupName}" group!`, threadID, messageID);
          }
          
          const isBotAdminInGroup = threadInfo.adminIDs.some(admin => admin.id == api.getCurrentUserID());
          if (!isBotAdminInGroup) {
            return api.sendMessage(`❌ Bot is not an admin in "${groupName}" group!\n\nCannot promote you to admin without bot being admin.`, threadID, messageID);
          }
          
          await api.changeAdminStatus(idgr, senderID, true);
          
          return api.sendMessage(
            `✅ PROMOTED TO ADMIN!\n\n` +
            `📛 Group: ${groupName}\n` +
            `👑 You are now an admin of this group.\n\n` +
            `💡 You can now manage members and group settings.`,
            threadID, messageID
          );
          
        } catch (error) {
          console.log("Promote error:", error);
          return api.sendMessage(`❌ Failed to promote you in "${groupName}".\nReason: ${error.message || "Unknown error"}`, threadID, messageID);
        }
      }

    case "delmsg":
      {
        try {
          api.sendMessage(`🗑️ Deleting bot's messages in "${groupName}"... This may take a while.`, threadID, messageID);
          
          api.getThreadList(1000, null, ["INBOX"], async (err, list) => {
            if (err) {
              return api.sendMessage(`❌ Failed to delete messages in "${groupName}"!`, threadID, messageID);
            }
            
            let deletedCount = 0;
            let failedCount = 0;
            
            for (const thread of list) {
              if (thread.threadID == idgr) {
                try {
                  const messages = await api.getThreadHistory(idgr, 100);
                  for (const msg of messages) {
                    if (msg.senderID == api.getCurrentUserID()) {
                      try {
                        await api.unsendMessage(msg.messageID);
                        deletedCount++;
                        await new Promise(resolve => setTimeout(resolve, 200));
                      } catch(e) {
                        failedCount++;
                      }
                    }
                  }
                } catch(e) {
                  failedCount++;
                }
                break;
              }
            }
            
            api.sendMessage(
              `✅ Message deletion completed in "${groupName}"!\n\n` +
              `📊 Deleted: ${deletedCount} messages\n` +
              `❌ Failed: ${failedCount} messages`,
              threadID, messageID
            );
          });
        } catch (error) {
          api.sendMessage(`❌ Failed to delete messages in "${groupName}"!\nReason: ${error.message}`, threadID, messageID);
        }
        break;
      }

    default:
      {
        let validCommands = "ban, unban, del, out, join, promote, delmsg";
        if (!isBotAdmin) {
          validCommands = "ban, unban, del, out, delmsg";
        }
        api.sendMessage(`❌ Invalid command. Use: ${validCommands} [number]`, threadID, messageID);
      }
      break;
  }
};

module.exports.run = async function ({ api, event, args, Threads }) {
  const { threadID, messageID, senderID } = event;
  
  const threadInfo = await api.getThreadInfo(threadID);
  const isGroupAdmin = threadInfo.adminIDs.some(item => item.id == senderID);
  const isBotAdmin = global.config.ADMINBOT.includes(senderID);
  
  if (!isGroupAdmin && !isBotAdmin) {
    return api.sendMessage("❌ Only Group Admins or Bot Admins can use this command!", threadID, messageID);
  }
  
  function getStatusText(value) {
    if (value === true) return "✅ ON";
    return "❌ OFF";
  }
  
  const langNames = { en: "English", bn: "বাংলা", hi: "हिंदी" };
  
  const botID = api.getCurrentUserID();
  const botInfo = await api.getUserInfo(botID);
  const originalName = botInfo[botID].name || "Bot";
  
  let botNickname = originalName;
  try {
    const threadInfoLocal = await api.getThreadInfo(threadID);
    if (threadInfoLocal.nicknames && threadInfoLocal.nicknames[botID]) {
      botNickname = threadInfoLocal.nicknames[botID];
    }
  } catch(e) {}
  
  const totalCommands = global.client.commands.size;
  const botPrefix = global.config.PREFIX || "/";
  const botLanguage = global.config.language || "en";
  
  const botInfoMsg = `
╔═════════════════╗
║    🤖 BOT INFO
╚═════════════════╝

📛 Name: ${botNickname}
🆔 ID: ${botID}
🔧 Prefix: ${botPrefix}
⚡ Commands: ${totalCommands}
🌐 Language: ${langNames[botLanguage] || botLanguage}
👑 Admins: ${global.config.ADMINBOT ? global.config.ADMINBOT.length : 0}

`;
  
  var allThreads = [];
  var failedGroups = [];
  
  try {
    var data = await api.getThreadList(500, null, ["INBOX"]);
  } catch (e) {
    console.log(e);
    return api.sendMessage("❌ Error fetching thread list.", threadID, messageID);
  }
  
  for (const thread of data) {
    if (thread.isGroup == true && thread.isSubscribed == true) {
      let fullInfo = null;
      let memberCount = 0;
      let adminCountInGroup = 0;
      let approvalMode = "Off";
      let userIsAdmin = false;
      let groupEmoji = "None";
      let groupLanguage = "English";
      let antiOutStatus = "❌ OFF";
      let messageCount = thread.messageCount || 0;
      let male = 0, female = 0, unknown = 0;
      
      try {
        fullInfo = await api.getThreadInfo(thread.threadID);
        memberCount = fullInfo.participantIDs ? fullInfo.participantIDs.length : 0;
        adminCountInGroup = fullInfo.adminIDs ? fullInfo.adminIDs.length : 0;
        approvalMode = fullInfo.approvalMode ? "On" : "Off";
        groupEmoji = fullInfo.emoji || "None";
        messageCount = fullInfo.messageCount || messageCount;
        
        userIsAdmin = fullInfo.adminIDs ? fullInfo.adminIDs.some(admin => admin.id == senderID) : false;
        
        if (fullInfo.userInfo) {
          for (let user of fullInfo.userInfo) {
            if (user.gender === "MALE") male++;
            else if (user.gender === "FEMALE") female++;
            else unknown++;
          }
        }
        
        const threadData = (await Threads.getData(thread.threadID)).data || {};
        antiOutStatus = getStatusText(threadData.antiout === true);
        
        const grpLang = threadData.language || global.config.language || "en";
        groupLanguage = langNames[grpLang] || grpLang;
        
        // Bot Admin সব গ্রুপ দেখতে পারে, অন্যথায় শুধু যেখানে user admin
        if (isBotAdmin || userIsAdmin) {
          allThreads.push({ 
            threadName: thread.name || "Unknown", 
            threadID: thread.threadID, 
            messageCount: messageCount,
            memberCount: memberCount,
            adminCount: adminCountInGroup,
            approvalMode: approvalMode,
            userIsAdmin: userIsAdmin,
            emoji: groupEmoji,
            language: groupLanguage,
            antiOut: antiOutStatus,
            male: male,
            female: female,
            unknown: unknown
          });
        }
        
      } catch(e) {
        // গ্রুপের তথ্য নিতে ব্যর্থ হয়েছে - লগ করুন
        console.log(`Failed to get info for group: ${thread.name} (${thread.threadID})`, e.message);
        failedGroups.push(thread.name || thread.threadID);
      }
    }
  }
  
  // যদি কিছু গ্রুপ ফেইল করে থাকে, তা রিপোর্ট করুন
  if (failedGroups.length > 0 && isBotAdmin) {
    console.log(`Failed to load ${failedGroups.length} groups:`, failedGroups);
  }
  
  allThreads.sort((a, b) => b.messageCount - a.messageCount);
  
  const totalGroups = allThreads.length;
  
  if (args[0] && args[0].toLowerCase() === "all") {
    var groupid = [];
    var groupName = [];
    
    var msg = botInfoMsg;
    msg += "╔══════════════════════════════════════════════════════════╗\n";
    
    if (isBotAdmin) {
      msg += "║              🎭 ALL GROUPS (Bot Admin View) 🎭               ║\n";
    } else {
      msg += "║            🎭 MY GROUPS (Group Admin View) 🎭             ║\n";
    }
    
    msg += "╚══════════════════════════════════════════════════════════╝\n\n";
    
    msg += "┌─────────────────── 📊 STATISTICS ───────────────────┐\n";
    msg += `│   📦 Total Groups  : ${totalGroups}                                              │\n`;
    if (failedGroups.length > 0 && isBotAdmin) {
      msg += `│   ⚠️ Failed to load : ${failedGroups.length} groups (check console)              │\n`;
    }
    msg += "└─────────────────────────────────────────────────────┘\n\n";
    
    for (let i = 0; i < allThreads.length; i++) {
      let group = allThreads[i];
      let serial = i + 1;
      
      msg += `┌───────────────── [ 🟢 GROUP ${serial} ] ─────────────────┐\n`;
      msg += `│ 📛 Name        : ${group.threadName}\n`;
      msg += `│ 🆔 ID          : ${group.threadID}\n`;
      msg += `│ 💬 Messages    : ${group.messageCount}\n`;
      msg += `│ 😀 Emoji       : ${group.emoji}\n`;
      msg += `│ ───────────────────────────────────────────────────\n`;
      msg += `│ 👥 Members     : ${group.memberCount}\n`;
      msg += `│    👨 Male     : ${group.male}\n`;
      msg += `│    👩 Female   : ${group.female}\n`;
      msg += `│    ❓ Unknown  : ${group.unknown}\n`;
      msg += `│ 👑 Admins      : ${group.adminCount}\n`;
      msg += `│ 🔒 Approval    : ${group.approvalMode === "On" ? "✅ On" : "❎ Off"}\n`;
      msg += `│ 🌐 Language    : ${group.language}\n`;
      msg += `│ 🚪 Anti Out    : ${group.antiOut}\n`;
      if (group.userIsAdmin) {
        msg += `│ 👑 You are an ADMIN in this group\n`;
      }
      msg += `└────────────────────────────────────────────────────────────┘\n\n`;
      
      groupid.push(group.threadID);
      groupName.push(group.threadName);
    }
    
    msg += "╔══════════════════════════════════════════════════════════╗\n";
    msg += `║                    📌 Total: ${totalGroups} group(s)                        ║\n`;
    msg += "╚══════════════════════════════════════════════════════════╝\n\n";
    
    if (isBotAdmin) {
      msg += "💬 Commands (Bot Admin):\n";
      msg += "   • ban [num] - Ban group\n";
      msg += "   • unban [num] - Unban group\n";
      msg += "   • out [num] - Bot leave group\n";
      msg += "   • del [num] - Delete group data\n";
      msg += "   • join [num] - Join group (auto-promote)\n";
      msg += "   • promote [num] - Promote yourself to admin\n";
      msg += "   • delmsg [num] - Delete bot's messages";
    } else {
      msg += "💬 Commands (Group Admin):\n";
      msg += "   • ban [num] - Ban group\n";
      msg += "   • unban [num] - Unban group\n";
      msg += "   • out [num] - Bot leave group\n";
      msg += "   • del [num] - Delete group data\n";
      msg += "   • delmsg [num] - Delete bot's messages";
    }
    
    api.sendMessage(msg, threadID, (e, info) => {
      global.client.handleReply.push({
        name: this.config.name,
        author: senderID,
        messageID: info.messageID,
        groupid: groupid,
        groupName: groupName
      });
    });
    
  } else {
    var groupid = [];
    var groupName = [];
    var page = parseInt(args[0]) || 1;
    var limit = 5;
    var numPage = Math.ceil(allThreads.length / limit);
    
    if (page < 1) page = 1;
    if (page > numPage) page = numPage;
    
    var msg = botInfoMsg;
    msg += "╔═══════════════════╗\n";
    
    if (isBotAdmin) {
      msg += `║🎭 ALL GROUPS - Page ${page}/${numPage} 🎭\n`;
    } else {
      msg += `║🎭 MY GROUPS - Page ${page}/${numPage} 🎭\n`;
    }
    
    msg += "╚═══════════════════╝\n\n";
    
    msg += "===== 📊 STATISTICS =====\n";
    msg += `📦 Total: ${totalGroups}\n`;
    if (failedGroups.length > 0 && isBotAdmin) {
      msg += `⚠️ Failed: ${failedGroups.length} groups (check console)\n`;
    }
    msg += `====================\n\n`;
    
    for (let i = (page - 1) * limit; i < page * limit && i < allThreads.length; i++) {
      let group = allThreads[i];
      let serial = i + 1;
      
      msg += `=====[ 🟢 GROUP ${serial} ]=====\n`;
      msg += `📛 ${group.threadName}\n`;
      msg += `🆔 ${group.threadID}\n`;
      msg += `💬 ${group.messageCount} msgs\n`;
      msg += `😀 Emoji: ${group.emoji}\n`;
      msg += `🔒 Approval: ${group.approvalMode === "On" ? "✅ On" : "❎ Off"}\n`;
      msg += `🌐 Language: ${group.language}\n`;
      msg += `🚪 Anti Out: ${group.antiOut}\n\n`;
      msg += `👥 ${group.memberCount} members\n`;
      msg += `   👨 Male: ${group.male}\n`;
      msg += `   👩 Female: ${group.female}\n`;
      msg += `   ❓ Unknown: ${group.unknown}\n`;
      msg += `👑 Admins: ${group.adminCount}\n`;
      if (group.userIsAdmin) {
        msg += `👑 You are an ADMIN here\n\n`;
      }
      groupid.push(group.threadID);
      groupName.push(group.threadName);
    }
    
    msg += "╔═════════════════════╗\n";
    msg += "║💡 Use /allgroup all to see all \n";
    msg += "╚═════════════════════╝\n\n";
    
    if (isBotAdmin) {
      msg += "💬 Commands (Bot Admin):\n";
      msg += "   • ban [num], unban [num], out [num], del [num]\n";
      msg += "   • join [num] - Join & auto-promote\n";
      msg += "   • promote [num] - Promote yourself to admin\n";
      msg += "   • delmsg [num]";
    } else {
      msg += "💬 Commands (Group Admin):\n";
      msg += "   • ban [num], unban [num], out [num], del [num]\n";
      msg += "   • delmsg [num]";
    }
    
    api.sendMessage(msg, threadID, (e, info) => {
      global.client.handleReply.push({
        name: this.config.name,
        author: senderID,
        messageID: info.messageID,
        groupid: groupid,
        groupName: groupName
      });
    });
  }
};