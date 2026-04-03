const chalk = require('chalk');
const moment = require('moment-timezone');

module.exports.config = {
    name: "console",
    version: "1.0.0",
    hasPermssion: 3,
    credits: "MQL1 Community",
    description: "Console log system",
    commandCategory: "system",
    usages: "",
    cooldowns: 0
};

// রঙের লিস্ট
const colors = [
    '#FF0066', '#FF3366', '#FF6699', '#FF0099', '#FF66CC',
    '#FF00FF', '#CC33FF', '#9900FF', '#6600CC', '#3333FF',
    '#0066FF', '#0099FF', '#00CCFF', '#00FFFF', '#33FFFF',
    '#66FFFF', '#99FFFF', '#CCFFFF', '#FFFFFF', '#FFCCFF',
    '#FF99FF', '#FF66FF', '#FF33CC', '#FF00AA', '#FF0088',
    '#FF0066', '#FF0044', '#FF0022', '#FF0000', '#FF2200',
    '#FF4400', '#FF6600', '#FF8800', '#FFAA00', '#FFCC00',
    '#FFFF00', '#CCFF00', '#99FF00', '#66FF00', '#33FF00',
    '#00FF00', '#00FF33', '#00FF66', '#00FF99', '#00FFCC',
    '#00FFFF', '#00CCFF', '#0099FF', '#0066FF', '#0033FF'
];

function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

module.exports.handleEvent = async function({ api, event, Users }) {
    const { threadID, senderID, body, attachments } = event;
    
    if (senderID == api.getCurrentUserID()) return;
    
    const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
    if (typeof threadSetting["console"] != "undefined" && threadSetting["console"] == false) return;
    
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const threadName = threadInfo.threadName || "Unknown Group";
        const userName = await Users.getNameUser(senderID);
        const content = body || (attachments.length > 0 ? `${attachments.length} attachment(s)` : "No content");
        
        const color1 = getRandomColor();
        const color2 = getRandomColor();
        const color3 = getRandomColor();
        const color4 = getRandomColor();
        
        const time = moment.tz("Asia/Dhaka").format("DD/MM/YYYY hh:mm:ss A");
        
        console.log(chalk.hex(color1)("══════════════════════════════════════════════════════════════════════════"));
        console.log(chalk.hex(color2)("💬 MESSAGE LOG"));
        console.log(chalk.hex(color1)("══════════════════════════════════════════════════════════════════════════"));
        console.log(chalk.hex(color3)(`📁 Group : ${threadName}`));
        console.log(chalk.hex(color3)(`🆔 Group ID : ${threadID}`));
        console.log(chalk.hex(color3)(`👤 User : ${userName}`));
        console.log(chalk.hex(color3)(`🆔 User ID : ${senderID}`));
        console.log(chalk.hex(color3)(`💬 Content : ${content}`));
        console.log(chalk.hex(color4)(`⏰ Time : ${time}`));
        console.log(chalk.hex(color2)(`🏷️ MQL1 COMMUNITY`));
        console.log(chalk.hex(color1)("══════════════════════════════════════════════════════════════════════════"));
        console.log("");
        
    } catch (error) {
        console.log(chalk.red("[ERROR]"), error);
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
    } else {
        data["console"] = true;
    }
    
    await Threads.setData(threadID, { data });
    global.data.threadData.set(threadID, data);
    
    api.sendMessage(
        `${(data["console"] == false) ? getText("on") : getText("off")} ${getText("successText")}`,
        threadID,
        messageID
    );
};