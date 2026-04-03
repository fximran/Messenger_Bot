module.exports.config = {
  name: 'allbox',
  version: '1.0.0',
    credits: "MQL1 Community",
  hasPermssion: 1,
  description: '[Ban/Unban/Del/Remove] List[Data] thread The bot has joined in.',
  commandCategory: 'Admin',
  usages: '[page number/all]',
  cooldowns: 5
};

module.exports.handleReply = async function ({ api, event, args, Threads, handleReply }) {
  const { threadID, messageID, senderID } = event;
  
  // Debug log
  console.log("HandleReply triggered");
  console.log("Sender:", senderID);
  console.log("Author:", handleReply.author);
  console.log("Body:", event.body);
  
  if (parseInt(senderID) !== parseInt(handleReply.author)) {
    console.log("Author mismatch, ignoring");
    return;
  }
  
  const moment = require("moment-timezone");
  const time = moment.tz("Asia/Dhaka").format("HH:MM:ss L");
  var arg = event.body.trim().split(" ");
  var cmd = arg[0].toLowerCase();
  var num = parseInt(arg[1]);
  
  if (isNaN(num) || num < 1 || num > handleReply.groupid.length) {
    return api.sendMessage("Invalid number. Please reply with: ban [number], unban [number], out [number], or del [number]", threadID, messageID);
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
        api.sendMessage(`Group ${groupName} has been BANNED from using the bot.`, threadID, messageID);
        api.sendMessage(`This group has been banned by admin.`, idgr);
        break;
      }

    case "unban":
      {
        const data = (await Threads.getData(idgr)).data || {};
        data.banned = 0;
        data.dateAdded = null;
        await Threads.setData(idgr, { data });
        global.data.threadBanned.delete(idgr);
        api.sendMessage(`Group ${groupName} has been UNBANNED.`, threadID, messageID);
        api.sendMessage(`This group has been unbanned.`, idgr);
        break;
      }

    case "del":
      {
        await Threads.delData(idgr);
        api.sendMessage(`Data for group ${groupName} (${idgr}) has been DELETED.`, threadID, messageID);
        break;
      }

    case "out":
      {
        api.sendMessage(`Bot is leaving group ${groupName}. Goodbye!`, threadID, messageID);
        api.sendMessage(`Bot is leaving this group.`, idgr, () => {
          api.removeUserFromGroup(api.getCurrentUserID(), idgr);
        });
        break;
      }

    default:
      api.sendMessage("Invalid command. Use: ban, unban, del, or out", threadID, messageID);
      break;
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  
  if (args[0] && args[0].toLowerCase() === "all") {
    var threadList = [];
    try {
      var data = await api.getThreadList(100, null, ["INBOX"]);
    } catch (e) {
      console.log(e);
      return api.sendMessage("Error fetching thread list.", threadID, messageID);
    }
    
    for (const thread of data) {
      if (thread.isGroup == true) {
        threadList.push({ 
          threadName: thread.name, 
          threadID: thread.threadID, 
          messageCount: thread.messageCount 
        });
      }
    }
    
    threadList.sort((a, b) => b.messageCount - a.messageCount);
    
    var groupid = [];
    var groupName = [];
    var msg = "🎭 ALL GROUPS [Data] 🎭\n\n";
    
    for (let i = 0; i < threadList.length; i++) {
      let group = threadList[i];
      msg += `${i + 1}. ${group.threadName}\n🔰 TID: ${group.threadID}\n💌 Messages: ${group.messageCount}\n\n`;
      groupid.push(group.threadID);
      groupName.push(group.threadName);
    }
    
    msg += `\nTotal: ${threadList.length} groups\n`;
    msg += `Reply with: ban [number], unban [number], out [number], or del [number]`;
    
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
    // Page view
    var threadList = [];
    try {
      var data = await api.getThreadList(100, null, ["INBOX"]);
    } catch (e) {
      console.log(e);
      return api.sendMessage("Error fetching thread list.", threadID, messageID);
    }
    
    for (const thread of data) {
      if (thread.isGroup == true) {
        threadList.push({ 
          threadName: thread.name, 
          threadID: thread.threadID, 
          messageCount: thread.messageCount 
        });
      }
    }
    
    threadList.sort((a, b) => b.messageCount - a.messageCount);
    
    var groupid = [];
    var groupName = [];
    var page = parseInt(args[0]) || 1;
    var limit = 10;
    var numPage = Math.ceil(threadList.length / limit);
    
    if (page < 1) page = 1;
    if (page > numPage) page = numPage;
    
    var msg = `🎭 GROUPS - Page ${page}/${numPage} 🎭\n\n`;
    
    for (let i = (page - 1) * limit; i < page * limit && i < threadList.length; i++) {
      let group = threadList[i];
      msg += `${i + 1}. ${group.threadName}\n🔰 TID: ${group.threadID}\n💌 Messages: ${group.messageCount}\n\n`;
      groupid.push(group.threadID);
      groupName.push(group.threadName);
    }
    
    msg += `Use /allbox all to see all groups\n`;
    msg += `Reply with: ban [number], unban [number], out [number], or del [number]`;
    
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