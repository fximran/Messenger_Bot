module.exports.config = {
    name: "ckbot",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Get group and user information",
    commandCategory: "Media",
    usages: "user / box / admin",
    cooldowns: 4,
    dependencies: {
        "request": "",
        "fs": ""
    }
};

module.exports.run = async({api, event, args, Threads, Users}) => {
    const fs = global.nodemodule["fs-extra"];
    const request = global.nodemodule["request"];
    const threadSetting = global.data.threadData.get(parseInt(event.threadID)) || {};
    const prefix = (threadSetting.hasOwnProperty("PREFIX")) ? threadSetting.PREFIX : global.config.PREFIX;
    
    if (args.length == 0) return api.sendMessage(`You can use:\n\n${prefix}${this.config.name} user => get your own information.\n\n${prefix}${this.config.name} user @[Tag] => get tagged person information.\n\n${prefix}${this.config.name} box => get group information.\n\n${prefix}${this.config.name} admin => get group admin list.`, event.threadID, event.messageID);
    
    // BOX INFORMATION
    if (args[0] == "box") {
        if(args[1]){ 
            let threadInfo = await api.getThreadInfo(args[1]);
            let imgg = threadInfo.imageSrc;
            var gendernam = [];
            var gendernu = [];
            for (let z in threadInfo.userInfo) {
                var gioitinhone = threadInfo.userInfo[z].gender;
                if(gioitinhone == "MALE"){gendernam.push(gioitinhone)}
                else{gendernu.push(gioitinhone)}
            };
            var nam = gendernam.length;
            var nu = gendernu.length;
            let sex = threadInfo.approvalMode;
            var pd = sex == false ? "Turn off" : sex == true ? "Turn on" : "NS";
            if(!imgg) api.sendMessage(`Group name: ${threadInfo.threadName}\nTID: ${args[1]}\nApproved: ${pd}\nEmoji: ${threadInfo.emoji}\nInformation: \n» ${threadInfo.participantIDs.length} members and ${threadInfo.adminIDs.length} administrators.\n» Including ${nam} boy and ${nu} female.\n» Total messages: ${threadInfo.messageCount}.`,event.threadID,event.messageID);
            else var callback = () => api.sendMessage({body:`Group name: ${threadInfo.threadName}\nTID: ${args[1]}\nApproved: ${pd}\nEmoji: ${threadInfo.emoji}\nInformation: \n» ${threadInfo.participantIDs.length} members and ${threadInfo.adminIDs.length} administrators.\n» Including ${nam} boy and ${nu} female.\n» Total messages: ${threadInfo.messageCount}.`,attachment: fs.createReadStream(__dirname + "/cache/1.png")}, event.threadID, () => fs.unlinkSync(__dirname + "/cache/1.png"), event.messageID); 
            return request(encodeURI(`${threadInfo.imageSrc}`)).pipe(fs.createWriteStream(__dirname+'/cache/1.png')).on('close',() => callback());
        }
        
        let threadInfo = await api.getThreadInfo(event.threadID);
        let img = threadInfo.imageSrc;
        var gendernam = [];
        var gendernu = [];
        for (let z in threadInfo.userInfo) {
            var gioitinhone = threadInfo.userInfo[z].gender;
            if(gioitinhone == "MALE"){gendernam.push(gioitinhone)}
            else{gendernu.push(gioitinhone)}
        };
        var nam = gendernam.length;
        var nu = gendernu.length;
        let sex = threadInfo.approvalMode;
        var pd = sex == false ? "Turn off" : sex == true ? "Turn on" : "NS";
        if(!img) api.sendMessage(`Group name: ${threadInfo.threadName}\nTID: ${event.threadID}\nApproved: ${pd}\nEmoji: ${threadInfo.emoji}\nInformation: \n» ${threadInfo.participantIDs.length} members and ${threadInfo.adminIDs.length} administrators.\n» Including ${nam} boy and ${nu} female.\n» Total messages: ${threadInfo.messageCount}.`,event.threadID,event.messageID)
        else var callback = () => api.sendMessage({body:`Group name: ${threadInfo.threadName}\nTID: ${event.threadID}\nApproved: ${pd}\nEmoji: ${threadInfo.emoji}\nInformation: \n» ${threadInfo.participantIDs.length} members and ${threadInfo.adminIDs.length} administrators.\n» Including ${nam} boy and ${nu} female.\n» Total messages: ${threadInfo.messageCount}.`,attachment: fs.createReadStream(__dirname + "/cache/1.png")}, event.threadID, () => fs.unlinkSync(__dirname + "/cache/1.png"), event.messageID);   
        return request(encodeURI(`${threadInfo.imageSrc}`)).pipe(fs.createWriteStream(__dirname+'/cache/1.png')).on('close',() => callback());
    }
    
    // ADMIN INFORMATION (UPDATED - SHOWS GROUP ADMINS)
    if (args[0] == "admin") {
        let threadInfo = await api.getThreadInfo(event.threadID);
        let adminIDs = threadInfo.adminIDs || [];
        
        if (adminIDs.length === 0) {
            return api.sendMessage("No admin found in this group", event.threadID, event.messageID);
        }
        
        let msg = "👑 GROUP ADMIN LIST 👑\n\n";
        let count = 1;
        
        for (let admin of adminIDs) {
            let adminId = admin.id;
            try {
                let userInfo = await api.getUserInfo(adminId);
                let name = userInfo[adminId].name || "Unknown";
                let vanity = userInfo[adminId].vanity || "";
                let profileUrl = userInfo[adminId].profileUrl || "";
                
                msg += `${count}. 👤 Name: ${name}\n`;
                msg += `   🆔 ID: ${adminId}\n`;
                if (vanity) {
                    msg += `   📛 Username: @${vanity}\n`;
                }
                msg += `   🔗 Profile: ${profileUrl}\n`;
                msg += `   ${adminId == event.senderID ? "⭐ YOU ARE HERE ⭐" : ""}\n`;
                msg += `   ┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
                count++;
            } catch(e) {
                msg += `${count}. 👤 Name: Unknown\n`;
                msg += `   🆔 ID: ${adminId}\n`;
                msg += `   ┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
                count++;
            }
        }
        
        msg += `\n📊 Total Admin: ${adminIDs.length}`;
        return api.sendMessage(msg, event.threadID, event.messageID);
    }
    
    // USER INFORMATION (FIXED - @mention now works)
    if (args[0] == "user") { 
        let targetId = null;
        
        // Check if reply
        if(event.type == "message_reply" && !args[1]) {
            targetId = event.messageReply.senderID;
        }
        // Check if mention
        else if(Object.keys(event.mentions).length > 0) {
            targetId = Object.keys(event.mentions)[0];
        }
        // Check if ID provided
        else if(args[1]) {
            if(!isNaN(args[1])) {
                targetId = args[1];
            }
            else {
                targetId = event.senderID;
            }
        }
        // Default to self
        else {
            targetId = event.senderID;
        }
        
        try {
            let data = await api.getUserInfo(targetId);
            let user = data[targetId];
            if(!user) {
                return api.sendMessage("User not found!", event.threadID, event.messageID);
            }
            
            let url = user.profileUrl || "No profile URL";
            let b = user.isFriend ? "Yes" : "No";
            let sn = user.vanity || "No username";
            let name = user.name || "Unknown";
            let gender = user.gender == 2 ? "Male" : user.gender == 1 ? "Female" : "Not specified";
            
            var callback = () => api.sendMessage({
                body: `👤 USER INFORMATION 👤\n\n📛 Name: ${name}\n🔗 Profile: ${url}\n💦 Username: ${sn}\n🆔 UID: ${targetId}\n⚧ Gender: ${gender}\n🤝 Friend with bot: ${b}`,
                attachment: fs.createReadStream(__dirname + "/cache/1.png")
            }, event.threadID, () => fs.unlinkSync(__dirname + "/cache/1.png"), event.messageID);
            
            return request(encodeURI(`https://graph.facebook.com/${targetId}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`))
                .pipe(fs.createWriteStream(__dirname+'/cache/1.png'))
                .on('close',() => callback());
        } catch(e) {
            return api.sendMessage("Error fetching user information. Please try again.", event.threadID, event.messageID);
        }
    }
};