const fs = require("fs-extra");
const pathFile = __dirname + "/cache/autoseen.txt";

// কনফিগারেশন ফাইল
module.exports.config = {
    name: "autoseen",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "MQL1 Community",
    description: "Auto seen on/off system",
    commandCategory: "tools",
    usages: "on/off",
    cooldowns: 5
};

// অটোসেন ফাইল না থাকলে তৈরি করা
if (!fs.existsSync(pathFile)) {
    fs.writeFileSync(pathFile, "false");
}

// ইভেন্ট হ্যান্ডলার (মেসেজ সিন করার জন্য)
module.exports.handleEvent = async ({ api, event }) => {
    const data = fs.readFileSync(pathFile, "utf-8");
    
    // অটোসেন অন থাকলে সব মেসেজ সিন করে
    if (data == "true") {
        api.markAsReadAll(() => {});
    }
};

// মেইন কমান্ড রান ফাংশন
module.exports.run = async ({ api, event, args }) => {
    try {
        if (args[0] == "on") {
            // অটোসেন চালু করা
            fs.writeFileSync(pathFile, "true");
            api.sendMessage("✅ Auto seen turn on successfully.", event.threadID, event.messageID);
        }
        else if (args[0] == "off") {
            // অটোসেন বন্ধ করা
            fs.writeFileSync(pathFile, "false");
            api.sendMessage("✅ Auto seen turn off successfully.", event.threadID, event.messageID);
        }
        else {
            // ভুল কমান্ড দিলে হেল্প মেসেজ
            api.sendMessage(
                "Wrong format\n" +
                "Use: " + global.config.PREFIX + this.config.name + " on\n" +
                "Or: " + global.config.PREFIX + this.config.name + " off",
                event.threadID,
                event.messageID
            );
        }
    } catch (error) {
        console.log(error);
    }
};