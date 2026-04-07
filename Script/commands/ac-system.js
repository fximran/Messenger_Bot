const os = require("os");
const moment = require("moment-timezone");
const { exec } = require("child_process");
const axios = require("axios");

const startTime = Date.now();

module.exports.config = {
    name: "system",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "View system information (CPU, RAM, OS, uptime, ping)",
    commandCategory: "system",
    usages: "system",
    cooldowns: 5
};

// Function to get Windows CPU load
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

// Function to get Linux/Mac CPU load
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
╔═══════════════════════╗
║        💻 SYSTEM INFORMATION     ║
╚═══════════════════════╝

📅 Time: ${currentTime}
⏱️ Uptime: ${uptimeString}

━━━━━━━━━━━━━━━━━━━━

🖥️ CPU INFORMATION:
   • Model: ${cpuModel}
   • Cores: ${cpuCores}
   • Load: ${cpuLoad}

━━━━━━━━━━━━━━━━━━━━

💾 MEMORY INFORMATION:
   • Total: ${formatBytes(totalMem)}
   • Used: ${formatBytes(usedMem)}
   • Free: ${formatBytes(freeMem)}
   • Usage: ${memUsagePercent}%

━━━━━━━━━━━━━━━━━━━━

💿 OPERATING SYSTEM:
   • Type: ${osType}
   • Platform: ${platform}
   • Version: ${osRelease}
   • Arch: ${arch}
   • Host: ${hostname}

━━━━━━━━━━━━━━━━━━━━

⚡ RUNTIME:
   • Node.JS: ${nodeVersion}
   • Ping: ${ping}

━━━━━━━━━━━━━━━━━━━━
        `;
        
        api.sendMessage(message, threadID, messageID);
        
    } catch (error) {
        console.error("System error:", error);
        api.sendMessage("❌ Failed to get system information.\n\n" + error.message, threadID, messageID);
    }
};