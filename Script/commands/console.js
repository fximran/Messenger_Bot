const chalk = require('chalk');
const moment = require('moment-timezone');
const branding = require('../utils/branding');

module.exports.config = {
    name: "console",
    version: "1.0.0",
    hasPermssion: 3,
    credits: branding.credits || "MQL1 Community",
    description: "Toggle console log on/off for current group",
    commandCategory: "system",
    usages: "console",
    cooldowns: 0
};

module.exports.handleEvent = async function({ api, event, Users }) {
    const { threadID, senderID, body, attachments } = event;
    
    if (senderID == api.getCurrentUserID()) return;
    
    const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
    if (threadSetting["console"] == false) return;
    
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const threadName = threadInfo.threadName || "Unknown Group";
        const userName = await Users.getNameUser(senderID);
        const content = body || (attachments.length > 0 ? `${attachments.length} attachment(s)` : "No content");
        const time = moment().tz("Asia/Dhaka").format("DD/MM/YYYY hh:mm:ss A");
        
        const logo = branding.consoleLogo || "💬 MESSAGE LOG";
        const footer = branding.consoleFooter || "══════════════════════════════════════════════════════════════════════════";
        
        console.log(`\n${footer}`);
        console.log(logo);
        console.log(footer);
        console.log(`📁 Group : ${threadName}`);
        console.log(`🆔 Group ID : ${threadID}`);
        console.log(`👤 User : ${userName}`);
        console.log(`🆔 User ID : ${senderID}`);
        console.log(`💬 Content : ${content}`);
        console.log(`⏰ Time : ${time}`);
        if (branding.consoleBrand) {
            console.log(branding.consoleBrand);
        }
        console.log(`${footer}\n`);
        
    } catch (error) {
        console.log("Console log error:", error.message);
    }
};

module.exports.languages = {
    "vi": {
        "on": "Bật",
        "off": "Tắt",
        "successText": "console thành công!"
    },
    "en": {
        "on": "on",
        "off": "off",
        "successText": "success!"
    }
};

module.exports.run = async function({ api, event, Threads, getText }) {
    const { threadID, messageID } = event;
    let data = (await Threads.getData(threadID)).data;
    
    if (typeof data["console"] == "undefined" || data["console"] == true) {
        data["console"] = false;
        await Threads.setData(threadID, { data });
        global.data.threadData.set(threadID, data);
        return api.sendMessage(`❌ Console log DISABLED for this group`, threadID, messageID);
    } else {
        data["console"] = true;
        await Threads.setData(threadID, { data });
        global.data.threadData.set(threadID, data);
        return api.sendMessage(`✅ Console log ENABLED for this group`, threadID, messageID);
    }
};