const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "friends",
    version: "3.1.0",
    hasPermssion: 2,
    credits: "MQL1 Community",
    description: "Auto send friend requests with interactive controls and auto-remove on failure",
    commandCategory: "Admin",
    usages: "list | start <file> [min] | stop <file> | reset <file> | status | report [date] | errors",
    cooldowns: 5
};

// Paths
const boxExportPath = path.join(__dirname, "cache", "box_exports");
const logsPath = path.join(__dirname, "cache", "friends_logs");
const errorsLogPath = path.join(logsPath, "errors.json");

if (!fs.existsSync(boxExportPath)) fs.mkdirSync(boxExportPath, { recursive: true });
if (!fs.existsSync(logsPath)) fs.mkdirSync(logsPath, { recursive: true });
if (!fs.existsSync(errorsLogPath)) fs.writeFileSync(errorsLogPath, JSON.stringify([]));

// Global state
if (!global.friendManager) {
    global.friendManager = {
        jobs: new Map(),
        sentThisSession: new Set()
    };
}

// ========== HELPERS ==========
function getTodayDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getLogPath(date) {
    return path.join(logsPath, `${date}.json`);
}

function loadLogs(date) {
    const p = getLogPath(date);
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveLogs(date, logs) {
    fs.writeFileSync(getLogPath(date), JSON.stringify(logs, null, 2));
}

function addLogEntry(userId, name, sourceFile) {
    const date = getTodayDate();
    const logs = loadLogs(date);
    logs.push({ timestamp: Date.now(), userId, name, sourceFile });
    saveLogs(date, logs);
}

function addErrorEntry(userId, name, sourceFile, errorMsg) {
    const errors = JSON.parse(fs.readFileSync(errorsLogPath, 'utf8'));
    errors.push({
        timestamp: Date.now(),
        userId,
        name: name || "Unknown",
        sourceFile,
        error: errorMsg
    });
    if (errors.length > 100) errors.shift();
    fs.writeFileSync(errorsLogPath, JSON.stringify(errors, null, 2));
}

function getSortedFiles() {
    return fs.readdirSync(boxExportPath)
        .filter(f => f.endsWith('.json'))
        .sort();
}

function resolveFilename(target) {
    const files = getSortedFiles();
    if (/^\d+$/.test(target)) {
        const num = parseInt(target);
        if (num < 1 || num > files.length) return null;
        return files[num - 1];
    }
    if (files.includes(target)) return target;
    if (files.includes(target + '.json')) return target + '.json';
    return null;
}

function loadFile(filename) {
    return JSON.parse(fs.readFileSync(path.join(boxExportPath, filename), 'utf8'));
}

function saveFile(filename, data) {
    fs.writeFileSync(path.join(boxExportPath, filename), JSON.stringify(data, null, 2));
}

function removeUserFromFile(filename, userId) {
    const data = loadFile(filename);
    const before = data.members.length;
    data.members = data.members.filter(m => m.id !== userId);
    if (data.members.length < before) {
        data.totalMembers = data.members.length;
        saveFile(filename, data);
        return true;
    }
    return false;
}

async function scanFile(api, filename) {
    const data = loadFile(filename);
    let changed = false;
    for (const member of data.members) {
        if (typeof member.isFriend === 'undefined') member.isFriend = false;
        if (typeof member.requestSent === 'undefined') member.requestSent = false;
        if (!member.name) {
            try {
                const info = await api.getUserInfo(member.id);
                member.name = info[member.id]?.name || "Unknown";
                member.isFriend = info[member.id]?.isFriend || false;
                member.lastChecked = Date.now();
                changed = true;
            } catch(e) {}
        }
    }
    if (changed) saveFile(filename, data);
}

async function processFile(api, filename) {
    const data = loadFile(filename);
    let changed = false;

    // 1. Update friend status for non-friends
    for (const member of data.members) {
        if (!member.isFriend) {
            try {
                const info = await api.getUserInfo(member.id);
                const isFriendNow = info[member.id]?.isFriend || false;
                if (isFriendNow !== member.isFriend) {
                    member.isFriend = isFriendNow;
                    if (isFriendNow) member.requestSent = false;
                    member.lastChecked = Date.now();
                    changed = true;
                }
                if (!member.name && info[member.id]?.name) {
                    member.name = info[member.id].name;
                    changed = true;
                }
            } catch(e) {}
        }
    }

    // 2. Send one request (using callback-based addFriend)
    for (const member of data.members) {
        if (!member.isFriend && !member.requestSent && !global.friendManager.sentThisSession.has(member.id)) {
            let userName = member.name;
            if (!userName) {
                try {
                    const info = await api.getUserInfo(member.id);
                    userName = info[member.id]?.name || "Unknown";
                    member.name = userName;
                    changed = true;
                } catch(e) {
                    userName = "Unknown";
                }
            }

            // Use callback-based addFriend
            await new Promise((resolve) => {
                api.addFriend(member.id, (err, data) => {
                    if (err) {
                        let errorMsg = err.message || String(err);
                        if (err.error) errorMsg = err.error;
                        if (err.errorDescription) errorMsg = err.errorDescription;
                        if (data && data.error) errorMsg = data.error;
                        console.error(`[Friends] Failed to send to ${member.id}:`, errorMsg);
                        addErrorEntry(member.id, userName, filename, errorMsg);
                        removeUserFromFile(filename, member.id);
                        console.log(`[Friends] Removed failed user ${member.id} (${userName}) from ${filename}`);
                        resolve();
                    } else {
                        member.requestSent = true;
                        member.lastChecked = Date.now();
                        global.friendManager.sentThisSession.add(member.id);
                        changed = true;
                        addLogEntry(member.id, userName, filename);
                        console.log(`[Friends] Sent to ${userName} (${member.id}) from ${filename}`);
                        resolve();
                    }
                });
            });
            break; // Only one request per cycle
        }
    }

    if (changed) saveFile(filename, data);
}

function startJobForFile(api, filename, minutes) {
    if (global.friendManager.jobs.has(filename)) stopJobForFile(filename);
    const intervalId = setInterval(() => {
        global.friendManager.sentThisSession.clear();
        processFile(api, filename);
    }, minutes * 60 * 1000);
    global.friendManager.jobs.set(filename, { running: true, intervalId, intervalMinutes: minutes });
    processFile(api, filename);
}

function stopJobForFile(filename) {
    const job = global.friendManager.jobs.get(filename);
    if (job) {
        clearInterval(job.intervalId);
        global.friendManager.jobs.delete(filename);
        return true;
    }
    return false;
}

function resetFile(filename) {
    const data = loadFile(filename);
    for (const member of data.members) member.lastChecked = null;
    saveFile(filename, data);
}

function getFileStats(filename) {
    const data = loadFile(filename);
    let total = data.members.length;
    let friends = 0, requested = 0;
    for (const m of data.members) {
        if (m.isFriend) friends++;
        else if (m.requestSent) requested++;
    }
    return { total, friends, requested, pending: total - friends - requested };
}

// ========== MAIN COMMAND ==========
module.exports.run = async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const isAdmin = global.config.ADMINBOT.includes(senderID);
    if (!isAdmin) return api.sendMessage("❌ Only bot admins can use this command!", threadID, messageID);

    const cmd = args[0]?.toLowerCase();
    const target = args[1];
    const option = args[2];

    // ========== REPORT ==========
    if (cmd === "report") {
        let date = target;
        if (!date) date = getTodayDate();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return api.sendMessage("❌ Invalid date format. Use YYYY-MM-DD", threadID, messageID);
        }
        const logs = loadLogs(date);
        if (logs.length === 0) {
            return api.sendMessage(`📋 No friend requests sent on ${date}.`, threadID, messageID);
        }
        let msg = `📋 REPORT - ${date}\n━━━━━━━━━━━━━━━━━━━━\n📊 Total Sent: ${logs.length}\n\n`;
        for (let i = 0; i < logs.length; i++) {
            const l = logs[i];
            const time = new Date(l.timestamp).toLocaleTimeString();
            msg += `${i+1}. ${l.name} (${l.userId})\n   📁 ${l.sourceFile} at ${time}\n\n`;
        }
        return api.sendMessage(msg, threadID, messageID);
    }

    // ========== ERRORS ==========
    if (cmd === "errors") {
        if (target === "clear") {
            fs.writeFileSync(errorsLogPath, JSON.stringify([]));
            return api.sendMessage("✅ Error log cleared.", threadID, messageID);
        }
        const errors = JSON.parse(fs.readFileSync(errorsLogPath, 'utf8'));
        if (errors.length === 0) return api.sendMessage("📋 No errors recorded.", threadID, messageID);
        let msg = `📋 ERROR LOG (Last 20)\n━━━━━━━━━━━━━━━━━━━━\n`;
        const recent = errors.slice(-20).reverse();
        for (const e of recent) {
            msg += `❌ ${e.name} (${e.userId})\n   📁 ${e.sourceFile}\n   ⚠️ ${e.error}\n   🕒 ${new Date(e.timestamp).toLocaleString()}\n\n`;
        }
        return api.sendMessage(msg, threadID, messageID);
    }

    // ========== LIST ==========
    if (cmd === "list") {
        const files = getSortedFiles();
        if (files.length === 0) return api.sendMessage("📁 No exported files found.", threadID, messageID);
        let msg = `📁 EXPORTED FILES (Friend Status)\n━━━━━━━━━━━━━━━━━━━━\n📊 Total: ${files.length} files\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const data = loadFile(file);
            const stats = getFileStats(file);
            const active = global.friendManager.jobs.has(file) ? "🟢" : "⚪";
            msg += `${i+1}. ${active} 📛 ${data.groupName || "Unknown"}\n   📦 ${file}\n   👥 Total: ${stats.total} | ✅ Friends: ${stats.friends} | ⏳ Req: ${stats.requested} | ⏰ Pending: ${stats.pending}\n   ───────────────────\n`;
        }
        msg += `\n💡 /friends start <number> [min]`;
        return api.sendMessage(msg, threadID, messageID);
    }

    // ========== START ==========
    if (cmd === "start") {
        if (!target) return api.sendMessage("❌ Usage: /friends start <file> [minutes]", threadID, messageID);
        const filename = resolveFilename(target);
        if (!filename) return api.sendMessage("❌ Invalid file.", threadID, messageID);
        const minutes = parseInt(option) || 15;
        if (minutes < 1 || minutes > 1440) return api.sendMessage("❌ Minutes 1-1440.", threadID, messageID);
        await scanFile(api, filename);
        startJobForFile(api, filename, minutes);
        return api.sendMessage(`✅ Started ${filename} (every ${minutes} min).`, threadID, messageID);
    }

    // ========== STOP ==========
    if (cmd === "stop") {
        if (!target) return api.sendMessage("❌ Usage: /friends stop <file>", threadID, messageID);
        const filename = resolveFilename(target);
        if (!filename) return api.sendMessage("❌ Invalid file.", threadID, messageID);
        const stopped = stopJobForFile(filename);
        return api.sendMessage(stopped ? `✅ Stopped ${filename}.` : `⚠️ Not running.`, threadID, messageID);
    }

    // ========== RESET ==========
    if (cmd === "reset") {
        if (!target) return api.sendMessage("❌ Usage: /friends reset <file>", threadID, messageID);
        const filename = resolveFilename(target);
        if (!filename) return api.sendMessage("❌ Invalid file.", threadID, messageID);
        resetFile(filename);
        return api.sendMessage(`✅ Reset lastChecked for ${filename}.`, threadID, messageID);
    }

    // ========== STATUS (interactive) ==========
    if (cmd === "0" || cmd === "status") {
        const files = getSortedFiles();
        const fileStats = [];
        let totalUsers = 0, totalFriends = 0, totalRequested = 0;
        for (const file of files) {
            const stats = getFileStats(file);
            totalUsers += stats.total;
            totalFriends += stats.friends;
            totalRequested += stats.requested;
            fileStats.push({ file, stats, active: global.friendManager.jobs.has(file) });
        }
        const todayLogs = loadLogs(getTodayDate());
        const errors = JSON.parse(fs.readFileSync(errorsLogPath, 'utf8'));
        let msg = `📊 FRIEND MANAGER STATUS\n━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `👥 Total Users: ${totalUsers}\n✅ Friends: ${totalFriends}\n⏳ Req Sent: ${totalRequested}\n📅 Today: ${todayLogs.length}\n⚠️ Errors: ${errors.length}\n⏰ Pending: ${totalUsers - totalFriends - totalRequested}\n`;
        msg += `\n⚙️ ACTIVE JOBS:\n`;
        for (let i = 0; i < fileStats.length; i++) {
            const f = fileStats[i];
            if (f.active) {
                const job = global.friendManager.jobs.get(f.file);
                msg += `   ${i+1}. ${f.file} (${job.intervalMinutes} min)\n`;
            }
        }
        msg += `\n💡 Reply with:\n   stop <number> - Stop a job\n   reset <number> - Reset lastChecked\n   timer <number> <min> - Change interval\n   remove <fileNum> <userNum> - Delete pending user`;
        return api.sendMessage(msg, threadID, (err, info) => {
            if (!err) {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    type: "status_control",
                    fileStats,
                    files
                });
            }
        }, messageID);
    }

    // ========== HELP ==========
    return api.sendMessage(
        `📖 FRIENDS COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 /friends list - Show all files\n` +
        `🔹 /friends start <file> [min]\n` +
        `🔹 /friends stop <file>\n` +
        `🔹 /friends reset <file>\n` +
        `🔹 /friends status - Interactive control\n` +
        `🔹 /friends report [date]\n` +
        `🔹 /friends errors [clear]`,
        threadID, messageID
    );
};

// ========== HANDLE REPLY (only status_control) ==========
module.exports.handleReply = async function({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    const { author, type, files } = handleReply;
    if (senderID != author) return;

    if (type !== "status_control") return;
    const parts = body.toLowerCase().trim().split(/\s+/);
    const action = parts[0];
    const num = parseInt(parts[1]);
    if (isNaN(num) || num < 1 || num > files.length) {
        return api.sendMessage("❌ Invalid file number.", threadID, messageID);
    }
    const targetFile = files[num - 1];

    if (action === "stop") {
        const stopped = stopJobForFile(targetFile);
        return api.sendMessage(stopped ? `✅ Stopped ${targetFile}.` : `⚠️ Not running.`, threadID, messageID);
    }

    if (action === "reset") {
        resetFile(targetFile);
        return api.sendMessage(`✅ Reset lastChecked for ${targetFile}.`, threadID, messageID);
    }

    if (action === "timer") {
        const minutes = parseInt(parts[2]);
        if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
            return api.sendMessage("❌ Invalid minutes (1-1440).", threadID, messageID);
        }
        if (global.friendManager.jobs.has(targetFile)) {
            startJobForFile(api, targetFile, minutes);
            return api.sendMessage(`✅ Timer updated for ${targetFile} (every ${minutes} min).`, threadID, messageID);
        } else {
            return api.sendMessage(`❌ Job not running for ${targetFile}. Start it first.`, threadID, messageID);
        }
    }

    if (action === "remove") {
        const userNum = parseInt(parts[2]);
        if (isNaN(userNum)) return api.sendMessage("❌ Usage: remove <fileNum> <userNum>", threadID, messageID);
        const data = loadFile(targetFile);
        const pending = data.members.filter(m => !m.isFriend && !m.requestSent);
        if (userNum < 1 || userNum > pending.length) {
            return api.sendMessage(`❌ Invalid user number. Pending users: ${pending.length}`, threadID, messageID);
        }
        const user = pending[userNum - 1];
        removeUserFromFile(targetFile, user.id);
        return api.sendMessage(`✅ Removed ${user.name} (${user.id}) from ${targetFile}.`, threadID, messageID);
    }

    return api.sendMessage("❌ Unknown action. Use: stop/reset/timer/remove", threadID, messageID);
};