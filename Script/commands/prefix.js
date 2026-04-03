const fs = require("fs");
const request = require("request");
const moment = require("moment-timezone");

module.exports.config = {
    name: "prefix",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Show bot prefix and information",
    commandCategory: "prefix",
    usages: "",
    cooldowns: 5
};

module.exports.handleEvent = async function({ api, event }) {
    const { threadID, messageID, body } = event;
    
    if (!body) return;
    
    const lowerBody = body.toLowerCase();
    if (lowerBody === "prefix" || lowerBody === "help prefix") {
        const timeStart = Date.now();
        const currentTime = moment().tz("Asia/Dhaka").format("HH:mm:ss");
        const currentDate = moment().tz("Asia/Dhaka").format("dddd, DD/MM/YYYY");
        
        const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
        const groupPrefix = threadSetting.PREFIX || global.config.PREFIX;
        const botPrefix = global.config.PREFIX;
        const botName = global.config.BOTNAME || "Bot";
        const totalCommands = global.client.commands.size;
        
        const ping = Date.now() - timeStart;
        
        const message = `╔══════════════════════════╗
         💫 𝗕𝗢𝗧 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡
╚══════════════════════════╝

📅 𝗗𝗮𝘁𝗲: ${currentDate}
⏰ 𝗧𝗶𝗺𝗲: ${currentTime}

━━━━━━━━━━━━━━━━━━━━

📛 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲: ${botName}
⚡ 𝗧𝗼𝘁𝗮𝗹 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀: ${totalCommands}
📌 𝗣𝗶𝗻𝗴: ${ping}ms

━━━━━━━━━━━━━━━━━━━━

🔧 𝗦𝘆𝘀𝘁𝗲𝗺 𝗣𝗿𝗲𝗳𝗶𝘅: ${botPrefix}
📍 𝗚𝗿𝗼𝘂𝗽 𝗣𝗿𝗲𝗳𝗶𝘅: ${groupPrefix}

━━━━━━━━━━━━━━━━━━━━
💡 𝗨𝘀𝗲: ${groupPrefix}help to see all commands
━━━━━━━━━━━━━━━━━━━━`;

        api.sendMessage(message, threadID, messageID);
    }
};

module.exports.run = async function({ api, event }) {
    const { threadID, messageID } = event;
    const timeStart = Date.now();
    const currentTime = moment().tz("Asia/Dhaka").format("HH:mm:ss");
    const currentDate = moment().tz("Asia/Dhaka").format("dddd, DD/MM/YYYY");
    
    const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
    const groupPrefix = threadSetting.PREFIX || global.config.PREFIX;
    const botPrefix = global.config.PREFIX;
    const botName = global.config.BOTNAME || "Bot";
    const totalCommands = global.client.commands.size;
    
    const ping = Date.now() - timeStart;
    
    const message = `╔══════════════════════════╗
         💫 𝗕𝗢𝗧 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡
╚══════════════════════════╝

📅 𝗗𝗮𝘁𝗲: ${currentDate}
⏰ 𝗧𝗶𝗺𝗲: ${currentTime}

━━━━━━━━━━━━━━━━━━━━

📛 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲: ${botName}
⚡ 𝗧𝗼𝘁𝗮𝗹 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀: ${totalCommands}
📌 𝗣𝗶𝗻𝗴: ${ping}ms

━━━━━━━━━━━━━━━━━━━━

🔧 𝗦𝘆𝘀𝘁𝗲𝗺 𝗣𝗿𝗲𝗳𝗶𝘅: ${botPrefix}
📍 𝗚𝗿𝗼𝘂𝗽 𝗣𝗿𝗲𝗳𝗶𝘅: ${groupPrefix}

━━━━━━━━━━━━━━━━━━━━
💡 𝗨𝘀𝗲: ${groupPrefix}help to see all commands
━━━━━━━━━━━━━━━━━━━━`;
    
    api.sendMessage(message, threadID, messageID);
};