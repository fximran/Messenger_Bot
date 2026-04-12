const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "friends",
    version: "5.1.0",
    hasPermssion: 2,
    credits: "MQL1 Community",
    description: "Smart friend request automation with separate check and request intervals",
    commandCategory: "Admin",
    usages: "list | start <file> [reqMin] [checkMin] | stop <file> | status | reset <file> | report [date] | errors",
    cooldowns: 5
};

// Paths
const boxExportPath = path.join(__dirname, "cache", "box_exports");
const logsPath = path.join(__dirname, "cache", "friends_logs");
const errorsLogPath = path.join(logsPath, "errors.json");

if (!fs.existsSync(boxExportPath)) fs.mkdirSync(boxExportPath, { recursive: true });
if (!fs.existsSync(logsPath)) fs.mkdirSync(logsPath, { recursive: true });
if (!fs.existsSync(errorsLogPath)) fs.writeFileSync(errorsLogPath, JSON.stringify([]));

// Global state for jobs (per file)
if (!global.friendManager) {
    global.friendManager = {
        jobs: new Map() // filename -> { checkIntervalId, requestIntervalId, checkMinutes, requestMinutes, running }
    };
}

// ========== HELPERS ==========
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

// Migrate old member format to multi-bot format
function migrateMember(member, botId) {
    if (!member.bots) {
        member.bots = {};
        if (member.hasOwnProperty('isFriend') || member.hasOwnProperty('requestSent')) {
            member.bots[botId] = {
                isFriend: member.isFriend || false,
                requestSent: member.requestSent || false,
                lastChecked: member.lastChecked || null
            };
        }
        delete member.isFriend;
        delete member.requestSent;
        delete member.lastChecked;
    }
    if (!member.bots[botId]) {
        member.bots[botId] = { isFriend: false, requestSent: false, lastChecked: null };
    }
}

// Check if member should be skipped for REQUEST
function shouldSkipForRequest(member, botId) {
    const botData = member.bots[botId];
    if (!botData) return false;
    if (botData.isFriend) return true;
    if (botData.requestSent) return true;
    // 5-day cooldown for checking? We'll apply to request as well
    if (botData.lastChecked) {
        const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
        if (Date.now() - botData.lastChecked < fiveDaysMs) return true;
    }
    return false;
}

// Check if member is already friend or requested by ANY bot (but not current)
function isProcessedByOtherBot(member, currentBotId) {
    if (!member.bots) return false;
    for (const [botId, data] of Object.entries(member.bots)) {
        if (botId !== currentBotId && (data.isFriend || data.requestSent)) {
            return true;
        }
    }
    return false;
}

// Remove member from file
function removeMemberFromFile(filename, userId) {
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

// Update member after successful request
function updateMemberAfterRequest(filename, userId, botId) {
    const data = loadFile(filename);
    const member = data.members.find(m => m.id === userId);
    if (member) {
        migrateMember(member, botId);
        member.bots[botId].requestSent = true;
        member.bots[botId].lastChecked = Date.now();
        saveFile(filename, data);
    }
}

// ========== CYCLE FUNCTIONS ==========

// Check cycle: update friend status for members with pending requests
async function checkCycle(api, filename) {
    const botId = api.getCurrentUserID();
    const data = loadFile(filename);
    let changed = false;

    // Collect members that have requestSent but not isFriend
    const pendingMembers = data.members.filter(m => {
        if (!m.bots || !m.bots[botId]) return false;
        return m.bots[botId].requestSent && !m.bots[botId].isFriend;
    });

    if (pendingMembers.length === 0) return;

    // Batch get user info for all pending members (max 50 per batch to be safe)
    const batchSize = 50;
    for (let i = 0; i < pendingMembers.length; i += batchSize) {
        const batch = pendingMembers.slice(i, i + batchSize);
        const ids = batch.map(m => m.id);
        try {
            const info = await api.getUserInfo(ids);
            for (const member of batch) {
                const isFriendNow = info[member.id]?.isFriend || false;
                if (isFriendNow && !member.bots[botId].isFriend) {
                    member.bots[botId].isFriend = true;
                    member.bots[botId].lastChecked = Date.now();
                    changed = true;
                    console.log(`[Friends] Bot ${botId}: ${member.id} is now a friend.`);
                }
            }
        } catch(e) {
            console.error(`[Friends] Check batch error:`, e);
        }
    }

    if (changed) saveFile(filename, data);
}

// Request cycle: send one friend request
async function requestCycle(api, filename) {
    const botId = api.getCurrentUserID();
    const data = loadFile(filename);

    // Ensure all members have bot entry
    for (const member of data.members) {
        migrateMember(member, botId);
    }

    // Phase 1: Primary candidates (not skipped)
    for (const member of data.members) {
        if (!shouldSkipForRequest(member, botId)) {
            await sendRequestForMember(api, filename, member, botId);
            return;
        }
    }

    // Phase 2: Secondary candidates (processed by other bots)
    for (const member of data.members) {
        migrateMember(member, botId);
        if (member.bots[botId]?.isFriend) continue;
        if (member.bots[botId]?.requestSent) continue;
        if (!isProcessedByOtherBot(member, botId)) continue;
        await sendRequestForMember(api, filename, member, botId);
        return;
    }

    console.log(`[Friends] No candidates in ${filename} for bot ${botId}`);
}

async function sendRequestForMember(api, filename, member, botId) {
    try {
        await api.sendFriendRequest(member.id);
        updateMemberAfterRequest(filename, member.id, botId);
        addLogEntry(member.id, filename, botId);
        console.log(`[Friends] Bot ${botId} sent request to ${member.id} from ${filename}`);
    } catch(e) {
        let errorMsg = e.message || String(e);
        if (e.error) errorMsg = e.error;
        if (e.errorDescription) errorMsg = e.errorDescription;
        console.error(`[Friends] Bot ${botId} failed to send to ${member.id}:`, errorMsg);
        addErrorEntry(member.id, filename, errorMsg, botId);
        removeMemberFromFile(filename, member.id);
        console.log(`[Friends] Removed failed user ${member.id} from ${filename}`);
    }
}

// ========== LOGGING ==========
function getTodayDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addLogEntry(userId, sourceFile, botId) {
    const date = getTodayDate();
    const logPath = path.join(logsPath, `${date}.json`);
    const logs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : [];
    logs.push({ timestamp: Date.now(), userId, sourceFile, botId });
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
}

function addErrorEntry(userId, sourceFile, errorMsg, botId) {
    const errors = JSON.parse(fs.readFileSync(errorsLogPath, 'utf8'));
    errors.push({ timestamp: Date.now(), userId, sourceFile, error: errorMsg, botId });
    if (errors.length > 100) errors.shift();
    fs.writeFileSync(errorsLogPath, JSON.stringify(errors, null, 2));
}

// ========== JOB CONTROL ==========
function startJobForFile(api, filename, requestMinutes, checkMinutes) {
    if (global.friendManager.jobs.has(filename)) {
        stopJobForFile(filename);
    }
    const checkIntervalId = setInterval(() => checkCycle(api, filename), checkMinutes * 60 * 1000);
    const requestIntervalId = setInterval(() => requestCycle(api, filename), requestMinutes * 60 * 1000);
    global.friendManager.jobs.set(filename, {
        checkIntervalId,
        requestIntervalId,
        checkMinutes,
        requestMinutes,
        running: true
    });
    // Run check immediately, then request after a short delay (to avoid overlap)
    checkCycle(api, filename);
    setTimeout(() => requestCycle(api, filename), 5000);
}

function stopJobForFile(filename) {
    const job = global.friendManager.jobs.get(filename);
    if (job) {
        clearInterval(job.checkIntervalId);
        clearInterval(job.requestIntervalId);
        global.friendManager.jobs.delete(filename);
        return true;
    }
    return false;
}

// Statistics for current bot
function getFileStats(filename, botId) {
    const data = loadFile(filename);
    let total = data.members.length;
    let friends = 0, requested = 0;
    for (const m of data.members) {
        if (m.bots && m.bots[botId]) {
            if (m.bots[botId].isFriend) friends++;
            else if (m.bots[botId].requestSent) requested++;
        }
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
    const opt1 = args[2];
    const opt2 = args[3];

    // ========== LIST ==========
    if (cmd === "list") {
        const botId = api.getCurrentUserID();
        const files = getSortedFiles();
        if (files.length === 0) return api.sendMessage("📁 No exported files found.", threadID, messageID);
        let msg = `📁 EXPORTED FILES (Bot ${botId})\n━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `📊 Total: ${files.length} files\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const data = loadFile(file);
            const stats = getFileStats(file, botId);
            const active = global.friendManager.jobs.has(file) ? "🟢" : "⚪";
            msg += `${i+1}. ${active} 📛 ${data.groupName || "Unknown"}\n   📦 ${file}\n   👥 Total: ${stats.total} | ✅ Friends: ${stats.friends} | ⏳ Req: ${stats.requested} | ⏰ Pending: ${stats.pending}\n   ───────────────────\n`;
        }
        msg += `\n💡 /friends start <number> [reqMin] [checkMin]`;
        return api.sendMessage(msg, threadID, messageID);
    }

    // ========== START ==========
    if (cmd === "start") {
        if (!target) return api.sendMessage("❌ Usage: /friends start <file> [reqMinutes] [checkMinutes]", threadID, messageID);
        const filename = resolveFilename(target);
        if (!filename) return api.sendMessage("❌ Invalid file number or filename.", threadID, messageID);
        const requestMinutes = parseInt(opt1) || 15;
        const checkMinutes = parseInt(opt2) || 5;
        if (requestMinutes < 1 || requestMinutes > 1440) return api.sendMessage("❌ Request minutes 1-1440.", threadID, messageID);
        if (checkMinutes < 1 || checkMinutes > 1440) return api.sendMessage("❌ Check minutes 1-1440.", threadID, messageID);
        
        startJobForFile(api, filename, requestMinutes, checkMinutes);
        return api.sendMessage(`✅ Started ${filename}\n📤 Request: every ${requestMinutes} min\n🔍 Check: every ${checkMinutes} min`, threadID, messageID);
    }

    // ========== STOP ==========
    if (cmd === "stop") {
        if (!target) return api.sendMessage("❌ Usage: /friends stop <file>", threadID, messageID);
        const filename = resolveFilename(target);
        if (!filename) return api.sendMessage("❌ Invalid file.", threadID, messageID);
        const stopped = stopJobForFile(filename);
        return api.sendMessage(stopped ? `✅ Stopped ${filename}.` : `⚠️ Not running.`, threadID, messageID);
    }

    // ========== STATUS ==========
    if (cmd === "status") {
        const botId = api.getCurrentUserID();
        const jobs = Array.from(global.friendManager.jobs.entries());
        let msg = `📊 FRIEND MANAGER STATUS (Bot ${botId})\n━━━━━━━━━━━━━━━━━━━━\n`;
        if (jobs.length === 0) {
            msg += `No active jobs.`;
        } else {
            for (const [file, job] of jobs) {
                msg += `🟢 ${file}\n   📤 Request: ${job.requestMinutes} min\n   🔍 Check: ${job.checkMinutes} min\n`;
            }
        }
        return api.sendMessage(msg, threadID, messageID);
    }

    // ========== RESET ==========
    if (cmd === "reset") {
        if (!target) return api.sendMessage("❌ Usage: /friends reset <file>", threadID, messageID);
        const filename = resolveFilename(target);
        if (!filename) return api.sendMessage("❌ Invalid file.", threadID, messageID);
        const data = loadFile(filename);
        const botId = api.getCurrentUserID();
        for (const m of data.members) {
            if (m.bots && m.bots[botId]) {
                m.bots[botId].lastChecked = null;
                m.bots[botId].requestSent = false;
            }
        }
        saveFile(filename, data);
        return api.sendMessage(`✅ Reset state for current bot in ${filename}.`, threadID, messageID);
    }

    // ========== REPORT ==========
    if (cmd === "report") {
        let date = target;
        if (!date) date = getTodayDate();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return api.sendMessage("❌ Invalid date format. Use YYYY-MM-DD", threadID, messageID);
        const logPath = path.join(logsPath, `${date}.json`);
        if (!fs.existsSync(logPath)) return api.sendMessage(`📋 No requests sent on ${date}.`, threadID, messageID);
        const logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
        let msg = `📋 REPORT - ${date}\n━━━━━━━━━━━━━━━━━━━━\n📊 Total Sent: ${logs.length}\n\n`;
        for (let i = 0; i < logs.length; i++) {
            const l = logs[i];
            const time = new Date(l.timestamp).toLocaleTimeString();
            msg += `${i+1}. ${l.userId}\n   🤖 Bot: ${l.botId}\n   📁 ${l.sourceFile} at ${time}\n\n`;
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
            msg += `❌ ${e.userId}\n   🤖 Bot: ${e.botId}\n   📁 ${e.sourceFile}\n   ⚠️ ${e.error}\n   🕒 ${new Date(e.timestamp).toLocaleString()}\n\n`;
        }
        return api.sendMessage(msg, threadID, messageID);
    }

    // ========== HELP ==========
    return api.sendMessage(
        `📖 FRIENDS COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 /friends list - Show all exported files with stats\n` +
        `🔹 /friends start <file> [reqMin] [checkMin] - Start (default req 15, check 5)\n` +
        `🔹 /friends stop <file> - Stop automation\n` +
        `🔹 /friends status - Show running jobs\n` +
        `🔹 /friends reset <file> - Reset requestSent/lastChecked\n` +
        `🔹 /friends report [date] - Show sent requests\n` +
        `🔹 /friends errors [clear] - Show/clear error log`,
        threadID, messageID
    );
};