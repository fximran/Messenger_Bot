const fs = require("fs-extra");
const moment = require("moment-timezone");

module.exports.config = {
  name: 'allgroup',
  version: '3.3.0',
  credits: "MQL1 Community",
  hasPermssion: 1,
  description: 'List all groups with full details + Join/Leave/Ban/Unban + Change group name + Delete messages',
  commandCategory: 'Admin',
  usages: '[page/all]',
  cooldowns: 5
};

module.exports.handleReply = async function ({ api, event, args, Threads, handleReply }) {
  const { threadID, messageID, senderID } = event;
  
  if (parseInt(senderID) !== parseInt(handleReply.author)) {
    return;
  }
  
  const time = moment.tz("Asia/Dhaka").format("HH:MM:ss L");
  var arg = event.body.trim().split(" ");
  var cmd = arg[0].toLowerCase();
  var num = parseInt(arg[1]);
  
  if (isNaN(num) || num < 1 || num > handleReply.groupid.length) {
    return api.sendMessage("❌ Invalid number. Please reply with: ban [number], unban [number], out [number], del [number], join [number], name [number] [new name], or delmsg [number]", threadID, messageID);
  }
  
  var idgr = handleReply.groupid[num - 1];
  var groupName = handleReply.groupName[num - 1];
  
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

    // ========== JOIN GROUP WITH AUTO PROMOTE ==========
    case "join":
      {
        try {
          const threadInfo = await api.getThreadInfo(idgr);
          if (threadInfo.participantIDs.includes(senderID)) {
            return api.sendMessage(`⚠️ You are already in "${groupName}" group!`, threadID, messageID);
          }
          
          // প্রথমে ইউজারকে গ্রুপে যোগ করুন
          await api.addUserToGroup(senderID, idgr);
          
          // একটু অপেক্ষা করুন (API রেট লিমিট এভয়েড করার জন্য)
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // বট এডমিন কিনা চেক করুন
          const updatedThreadInfo = await api.getThreadInfo(idgr);
          const isBotAdmin = updatedThreadInfo.adminIDs.some(admin => admin.id == api.getCurrentUserID());
          
          if (isBotAdmin) {
            // বট এডমিন থাকলে ইউজারকে এডমিন বানানোর চেষ্টা করুন
            try {
              await api.changeAdminStatus(idgr, senderID, true);
              
              // সাফল্যের মেসেজ
              const successMsg = `✅ Successfully added you to "${groupName}" group and promoted you to ADMIN!\n\n` +
                                `👑 You are now an admin of this group.\n` +
                                `📌 Check your groups section.`;
              
              return api.sendMessage(successMsg, threadID, messageID);
              
            } catch (promoteError) {
              // এডমিন বানাতে ব্যর্থ হলে (নেটওয়ার্ক বা ফেসবুক এরর)
              console.log("Promote error:", promoteError);
              
              const partialMsg = `⚠️ Added you to "${groupName}" group, but failed to promote you to admin.\n\n` +
                                `Reason: ${promoteError.message || "Unknown error"}\n\n` +
                                `💡 You can ask a group admin to manually promote you.`;
              
              return api.sendMessage(partialMsg, threadID, messageID);
            }
          } else {
            // বট এডমিন না থাকলে শুধু যোগ করার মেসেজ
            const botNotAdminMsg = `✅ Added you to "${groupName}" group!\n\n` +
                                  `⚠️ Bot is not an admin in this group, so couldn't promote you.\n` +
                                  `💡 Ask an admin to promote you manually.\n\n` +
                                  `📌 Check your message requests if you don't see the group.`;
            
            return api.sendMessage(botNotAdminMsg, threadID, messageID);
          }
          
        } catch (error) {
          console.log("Join error:", error);
          return api.sendMessage(`❌ Failed to add you to "${groupName}".\nReason: ${error.message || "Bot may not be admin or group is full"}`, threadID, messageID);
        }
      }
    
    // ========== CHANGE GROUP NAME ==========
    case "name":
      {
        const newName = arg.slice(2).join(" ");
        
        if (!newName) {
          return api.sendMessage(`❌ Please provide a new name!\n\nExample: name 1 My New Group Name\n\nCurrent name: "${groupName}"`, threadID, messageID);
        }
        
        try {
          await api.setTitle(newName, idgr);
          api.sendMessage(`✅ Group name changed successfully!\n\n📛 Old name: ${groupName}\n📛 New name: ${newName}`, threadID, messageID);
          api.sendMessage(`📛 Group name has been changed to "${newName}" by admin.`, idgr);
        } catch (error) {
          console.log("Name change error:", error);
          api.sendMessage(`❌ Failed to change group name!\nReason: ${error.message || "Bot may not be admin in that group"}`, threadID, messageID);
        }
        break;
      }

    // ========== DELETE MESSAGES (BOT'S MESSAGES) ==========
    case "delmsg":
      {
        try {
          api.sendMessage(`🗑️ Deleting bot's messages in "${groupName}"... This may take a while.`, threadID, messageID);
          
          // Get thread list
          api.getThreadList(1000, null, ["INBOX"], async (err, list) => {
            if (err) {
              return api.sendMessage(`❌ Failed to delete messages in "${groupName}"!`, threadID, messageID);
            }
            
            let deletedCount = 0;
            let failedCount = 0;
            
            for (const thread of list) {
              if (thread.threadID == idgr) {
                // This is the target group - delete bot's messages
                try {
                  // Get messages from the thread
                  const messages = await api.getThreadHistory(idgr, 100);
                  for (const msg of messages) {
                    if (msg.senderID == api.getCurrentUserID()) {
                      try {
                        await api.unsendMessage(msg.messageID);
                        deletedCount++;
                        await new Promise(resolve => setTimeout(resolve, 200)); // Rate limit
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
          console.log("Delmsg error:", error);
          api.sendMessage(`❌ Failed to delete messages in "${groupName}"!\nReason: ${error.message}`, threadID, messageID);
        }
        break;
      }

    default:
      api.sendMessage("❌ Invalid command. Use: ban, unban, del, out, join, name [number] [new name], or delmsg [number]", threadID, messageID);
      break;
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  
  // Get all threads bot is in
  var threadList = [];
  try {
    var data = await api.getThreadList(500, null, ["INBOX"]);
  } catch (e) {
    console.log(e);
    return api.sendMessage("❌ Error fetching thread list.", threadID, messageID);
  }
  
  for (const thread of data) {
    if (thread.isGroup == true && thread.isSubscribed == true) {
      const isBanned = global.data.threadBanned.has(thread.threadID);
      const banInfo = isBanned ? global.data.threadBanned.get(thread.threadID) : null;
      
      let fullInfo = null;
      let male = 0, female = 0, unknown = 0;
      let approvalMode = "Off";
      let memberCount = 0;
      let adminCount = 0;
      
      try {
        fullInfo = await api.getThreadInfo(thread.threadID);
        memberCount = fullInfo.participantIDs ? fullInfo.participantIDs.length : 0;
        adminCount = fullInfo.adminIDs ? fullInfo.adminIDs.length : 0;
        approvalMode = fullInfo.approvalMode ? "On" : "Off";
        
        if (fullInfo.userInfo) {
          for (let user of fullInfo.userInfo) {
            if (user.gender == "MALE") male++;
            else if (user.gender == "FEMALE") female++;
            else unknown++;
          }
        }
      } catch(e) {}
      
      threadList.push({ 
        threadName: thread.name || "Unknown", 
        threadID: thread.threadID, 
        messageCount: thread.messageCount || 0,
        isBanned: isBanned,
        banDate: banInfo ? banInfo.dateAdded : null,
        memberCount: memberCount,
        adminCount: adminCount,
        approvalMode: approvalMode,
        male: male,
        female: female,
        unknown: unknown,
        emoji: fullInfo ? (fullInfo.emoji || "None") : "None"
      });
    }
  }
  
  threadList.sort((a, b) => b.messageCount - a.messageCount);
  
  const totalGroups = threadList.length;
  const bannedGroups = threadList.filter(g => g.isBanned).length;
  const activeGroups = totalGroups - bannedGroups;
  
  // ========== SHOW ALL GROUPS ==========
  if (args[0] && args[0].toLowerCase() === "all") {
    var groupid = [];
    var groupName = [];
    
    var msg = "╔══════════════════════════════════════════════════════════╗\n";
    msg += "║                    🎭 ALL GROUPS [DATA] 🎭                    ║\n";
    msg += "╚══════════════════════════════════════════════════════════╝\n\n";
    
    msg += "┌─────────────────── 📊 STATISTICS ───────────────────┐\n";
    msg += `│   📦 Total Groups  : ${totalGroups}                                              │\n`;
    msg += `│   ✅ Active Groups : ${activeGroups}                                              │\n`;
    msg += `│   ❌ Banned Groups : ${bannedGroups}                                              │\n`;
    msg += "└─────────────────────────────────────────────────────┘\n\n";
    
    for (let i = 0; i < threadList.length; i++) {
      let group = threadList[i];
      let statusIcon = group.isBanned ? "❌" : "✅";
      let statusText = group.isBanned ? "BANNED" : "ACTIVE";
      let statusColor = group.isBanned ? "🔴" : "🟢";
      
      msg += `┌───────────────── [ ${statusColor} GROUP ${i + 1} ] ─────────────────┐\n`;
      msg += `│ 📛 Name        : ${group.threadName}\n`;
      msg += `│ 🆔 ID          : ${group.threadID}\n`;
      msg += `│ 💬 Messages    : ${group.messageCount}\n`;
      msg += `│ 📊 Status      : ${statusIcon} ${statusText}\n`;
      if (group.banDate) {
        msg += `│ 📅 Banned on   : ${group.banDate}\n`;
      }
      msg += `│ ───────────────────────────────────────────────────\n`;
      msg += `│ 👥 Members     : ${group.memberCount}\n`;
      msg += `│ 👑 Admins      : ${group.adminCount}\n`;
      msg += `│ 🔒 Approval    : ${group.approvalMode}\n`;
      msg += `│ 😀 Emoji       : ${group.emoji}\n`;
      msg += `│ ───────────────────────────────────────────────────\n`;
      msg += `│ 👨 Male        : ${group.male}\n`;
      msg += `│ 👩 Female      : ${group.female}\n`;
      msg += `│ ❓ Unknown     : ${group.unknown}\n`;
      msg += `└────────────────────────────────────────────────────────────┘\n\n`;
      
      groupid.push(group.threadID);
      groupName.push(group.threadName);
    }
    
    msg += "╔══════════════════════════════════════════════════════════╗\n";
    msg += `║                    📌 Total: ${totalGroups} group(s)                        ║\n`;
    msg += "╚══════════════════════════════════════════════════════════╝\n\n";
    msg += "💬 Reply with: ban [number], unban [number], out [number], del [number], join [number], name [number] [new name], or delmsg [number]";
    
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
    // ========== PAGE VIEW ==========
    var groupid = [];
    var groupName = [];
    var page = parseInt(args[0]) || 1;
    var limit = 5;
    var numPage = Math.ceil(threadList.length / limit);
    
    if (page < 1) page = 1;
    if (page > numPage) page = numPage;
    
    var msg = "╔═══════════════════\n";
    msg += `║🎭 GROUPS - Page ${page}/${numPage} 🎭\n`;
    msg += "╚═══════════════════\n\n";
    
    msg += "=====📊 STATISTICS =====\n";
    msg += `📦 Total: ${totalGroups}\n`;
    msg += `✅ Active: ${activeGroups}\n`;
    msg += `❌ Banned: ${bannedGroups}\n`;
    msg += `------------------------------\n\n`;
    
    for (let i = (page - 1) * limit; i < page * limit && i < threadList.length; i++) {
      let group = threadList[i];
      let statusIcon = group.isBanned ? "❌" : "✅";
      let statusText = group.isBanned ? "BANNED" : "ACTIVE";
      
      msg += `=====[ 🟢 GROUP ${i + 1} ]=====\n`;
      msg += `📛 ${group.threadName}\n`;
      msg += `🆔 ${group.threadID}\n`;
      msg += `💬 ${group.messageCount} msgs\n`;
      msg += `📊 ${statusIcon} ${statusText}\n\n`;
      msg += `👥 ${group.memberCount} members\n`;
      msg += `👑 ${group.adminCount} admins\n`;
      msg += `🔒 Approval: ${group.approvalMode}  |  😀 ${group.emoji}\n`;
      msg += `👨 Male: ${group.male}\n`;
      msg += `👩 Female: ${group.female}\n`;
      msg += `❓ Unknown: ${group.unknown}\n`;
      msg += `------------------------------\n\n`;
      groupid.push(group.threadID);
      groupName.push(group.threadName);
    }
    
    msg += "╔═════════════════════╗\n";
    msg += "║💡 Use /allgroup all to see all \n";
    msg += "╚═════════════════════╝\n\n";
    msg += "💬 Reply: ban [num], unban [num], out [num], del [num], join [num], name [num] [new name], or delmsg [num]";
    
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