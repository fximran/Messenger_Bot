const os = require("os");
const fs = require("fs-extra");
const moment = require("moment-timezone");
const { exec } = require("child_process");
const axios = require("axios");

const startTime = Date.now();

module.exports.config = {
    name: "system",
    version: "1.1.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "View bot and system information (CPU, RAM, OS, uptime, ping)",
    commandCategory: "system",
    usages: "system",
    cooldowns: 5
};

// Windows এ CPU লোড বের করার ফাংশন
function getWindowsCpuLoad(callback) {
    exec('wmic cpu get loadpercentage /value', (error, stdout) => {
        if (error) {
            callback(null);
            return;
        }
        const match = stdout.match(/LoadPercentage=(\d+)/);
        if (match) {
            callback(parseFloat(match[0].split('=')[1]));
        } else {
            callback(null);
        }
    });
}

// Linux/Mac এ CPU লোড বের করার ফাংশন
function getLinuxCpuLoad(callback) {
    exec("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1", (error, stdout) => {
        if (error) {
            callback(null);
            return;
        }
        const load = parseFloat(stdout.trim());
        if (!isNaN(load)) {
            callback(load);
        } else {
            callback(null);
        }
    });
}

module.exports.run = async function({ api, event }) {
    const { threadID, messageID } = event;
    
    try {
        // ========== UPTIME ==========
        const uptimeMs = Date.now() - startTime;
        const uptimeSeconds = Math.floor(uptimeMs / 1000);
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        
        let uptimeString = "";
        if (days > 0) uptimeString += `${days}d `;
        if (hours > 0) uptimeString += `${hours}h `;
        if (minutes > 0) uptimeString += `${minutes}m `;
        uptimeString += `${seconds}s`;
        
        // ========== CPU INFO ==========
        const cpus = os.cpus();
        const cpuModel = cpus[0] ? cpus[0].model : "Unknown";
        const cpuCores = cpus.length;
        
        // প্ল্যাটফর্ম অনুযায়ী CPU লোড বের করা
        const platform = os.platform();
        let cpuLoad = "N/A";
        
        if (platform === "win32") {
            await new Promise((resolve) => {
                getWindowsCpuLoad((load) => {
                    if (load !== null) {
                        cpuLoad = load.toFixed(1) + "%";
                    }
                    resolve();
                });
            });
        } else {
            await new Promise((resolve) => {
                getLinuxCpuLoad((load) => {
                    if (load !== null) {
                        cpuLoad = load.toFixed(1) + "%";
                    } else {
                        const loadAvg = os.loadavg();
                        cpuLoad = ((loadAvg[0] / cpuCores) * 100).toFixed(1) + "%";
                    }
                    resolve();
                });
            });
        }
        
        // ========== MEMORY INFO ==========
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsagePercent = (usedMem / totalMem * 100).toFixed(1);
        
        const formatBytes = (bytes) => {
            if (bytes >= 1073741824) {
                return (bytes / 1073741824).toFixed(2) + " GB";
            } else if (bytes >= 1048576) {
                return (bytes / 1048576).toFixed(2) + " MB";
            } else {
                return (bytes / 1024).toFixed(2) + " KB";
            }
        };
        
        // ========== OS INFO ==========
        const osType = os.type();
        const osRelease = os.release();
        const arch = os.arch();
        const hostname = os.hostname();
        const nodeVersion = process.version;
        
        // ========== BOT INFO ==========
        const botName = global.config.BOTNAME || "Bot";
        const botPrefix = global.config.PREFIX || "/";
        const botLanguage = global.config.language || "en";
        const botID = api.getCurrentUserID();
        
        const langNames = {
            en: "English",
            bn: "বাংলা",
            hi: "हिंदी"
        };
        
        // ========== PING ==========
        let ping = "N/A";
        try {
            const pingStart = Date.now();
            await axios.get("https://www.google.com", { timeout: 5000 });
            ping = (Date.now() - pingStart) + "ms";
        } catch(e) {
            ping = "Timeout";
        }
        
        // ========== CURRENT TIME ==========
        const currentTime = moment().tz("Asia/Dhaka").format("DD/MM/YYYY hh:mm:ss A");
        
        // ========== CREATE MESSAGE ==========
        const message = `
╔══════════════════════════════════════════════╗
║              💻 𝐒𝐘𝐒𝐓𝐄𝐌 𝐈𝐍𝐅𝐎 💻               ║
╚══════════════════════════════════════════════╝

📅 𝐓𝐢𝐦𝐞: ${currentTime}
⏱️ 𝐔𝐩𝐭𝐢𝐦𝐞: ${uptimeString}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖥️ 𝐂𝐏𝐔 𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧:
   • 𝐌𝐨𝐝𝐞𝐥: ${cpuModel}
   • 𝐂𝐨𝐫𝐞𝐬: ${cpuCores}
   • 𝐋𝐨𝐚𝐝: ${cpuLoad}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 𝐌𝐞𝐦𝐨𝐫𝐲 𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧:
   • 𝐓𝐨𝐭𝐚𝐥: ${formatBytes(totalMem)}
   • 𝐔𝐬𝐞𝐝: ${formatBytes(usedMem)}
   • 𝐅𝐫𝐞𝐞: ${formatBytes(freeMem)}
   • 𝐔𝐬𝐚𝐠𝐞: ${memUsagePercent}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💿 𝐎𝐒 𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧:
   • 𝐓𝐲𝐩𝐞: ${osType}
   • 𝐏𝐥𝐚𝐭𝐟𝐨𝐫𝐦: ${platform}
   • 𝐕𝐞𝐫𝐬𝐢𝐨𝐧: ${osRelease}
   • 𝐀𝐫𝐜𝐡: ${arch}
   • 𝐇𝐨𝐬𝐭: ${hostname}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 𝐁𝐨𝐭 𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧:
   • 𝐍𝐚𝐦𝐞: ${botName}
   • 𝐈𝐃: ${botID}
   • 𝐏𝐫𝐞𝐟𝐢𝐱: ${botPrefix}
   • 𝐋𝐚𝐧𝐠𝐮𝐚𝐠𝐞: ${langNames[botLanguage] || botLanguage}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ 𝐑𝐮𝐧𝐭𝐢𝐦𝐞:
   • 𝐍𝐨𝐝𝐞.𝐉𝐒: ${nodeVersion}
   • 𝐏𝐢𝐧𝐠: ${ping}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `;
        
        api.sendMessage(message, threadID, messageID);
        
    } catch (error) {
        console.error("System error:", error);
        api.sendMessage("❌ Failed to get system information.\n\n" + error.message, threadID, messageID);
    }
};