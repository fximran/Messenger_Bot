const os = require("os");
const fs = require("fs-extra");
const moment = require("moment-timezone");

const startTime = new Date();

module.exports.config = {
    name: "uptime",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "View bot system information",
    commandCategory: "system",
    usages: "uptime",
    cooldowns: 5
};

module.exports.run = async function({ api, event }) {
    const { threadID, messageID } = event;
    
    try {
        // বট কতক্ষণ ধরে চলছে
        const uptimeMs = Date.now() - startTime;
        const uptimeSeconds = Math.floor(uptimeMs / 1000);
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        
        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        
        // CPU তথ্য
        const cpus = os.cpus();
        const cpuModel = cpus[0] ? cpus[0].model : "Unknown";
        const cpuCores = cpus.length;
        
        // CPU লোড
        const loadAvg = os.loadavg();
        const cpuLoad = (loadAvg[0] / cpuCores * 100).toFixed(1);
        
        // মেমোরি তথ্য
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsagePercent = (usedMem / totalMem * 100).toFixed(1);
        
        // মেমোরি ফরম্যাট করা (GB/MB)
        const formatBytes = (bytes) => {
            if (bytes >= 1073741824) {
                return (bytes / 1073741824).toFixed(2) + " GB";
            } else if (bytes >= 1048576) {
                return (bytes / 1048576).toFixed(2) + " MB";
            } else {
                return (bytes / 1024).toFixed(2) + " KB";
            }
        };
        
        // ওএস তথ্য
        const platform = os.platform();
        const osType = os.type();
        const osRelease = os.release();
        const arch = os.arch();
        
        // হোস্টনেম
        const hostname = os.hostname();
        
        // নোড.জেএস ভার্সন
        const nodeVersion = process.version;
        
        // পিং টাইম
        const pingStart = Date.now();
        // পিং পরিমাপের জন্য একটি ডামি অপারেশন
        const ping = Date.now() - pingStart;
        
        // বর্তমান সময়
        const currentTime = moment().tz("Asia/Dhaka").format("DD/MM/YYYY HH:mm:ss");
        
        // মেসেজ তৈরি
        const message = `
╔══════════════════════════════════════╗
        💻 𝐒𝐘𝐒𝐓𝐄𝐌 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍
╚══════════════════════════════════════╝

📅 𝐂𝐮𝐫𝐫𝐞𝐧𝐭 𝐓𝐢𝐦𝐞: ${currentTime}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️ 𝐔𝐩𝐭𝐢𝐦𝐞: ${uptimeString}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖥️ 𝐂𝐏𝐔 𝐈𝐧𝐟𝐨:
   • 𝐌𝐨𝐝𝐞𝐥: ${cpuModel}
   • 𝐂𝐨𝐫𝐞𝐬: ${cpuCores}
   • 𝐋𝐨𝐚𝐝: ${cpuLoad}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 𝐌𝐞𝐦𝐨𝐫𝐲 𝐈𝐧𝐟𝐨:
   • 𝐓𝐨𝐭𝐚𝐥: ${formatBytes(totalMem)}
   • 𝐔𝐬𝐞𝐝: ${formatBytes(usedMem)}
   • 𝐅𝐫𝐞𝐞: ${formatBytes(freeMem)}
   • 𝐔𝐬𝐚𝐠𝐞: ${memUsagePercent}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💿 𝐎𝐒 𝐈𝐧𝐟𝐨:
   • 𝐓𝐲𝐩𝐞: ${osType}
   • 𝐏𝐥𝐚𝐭𝐟𝐨𝐫𝐦: ${platform}
   • 𝐑𝐞𝐥𝐞𝐚𝐬𝐞: ${osRelease}
   • 𝐀𝐫𝐜𝐡𝐢𝐭𝐞𝐜𝐭𝐮𝐫𝐞: ${arch}
   • 𝐇𝐨𝐬𝐭𝐧𝐚𝐦𝐞: ${hostname}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ 𝐑𝐮𝐧𝐭𝐢𝐦𝐞:
   • 𝐍𝐨𝐝𝐞.𝐉𝐒: ${nodeVersion}
   • 𝐏𝐢𝐧𝐠: ${ping}ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `;
        
        api.sendMessage(message, threadID, messageID);
        
    } catch (error) {
        console.error("Uptime error:", error);
        api.sendMessage("❌ Failed to get system information.", threadID, messageID);
    }
};