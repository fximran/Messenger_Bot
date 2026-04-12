const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "friends",
    version: "2.1.0",
    hasPermssion: 2,
    credits: "MQL1 Community",
    description: "Auto send friend requests to users from box_exports files (per file)",
    commandCategory: "Admin",
    usages: "list | start <filename/number> [minutes] | stop <filename/number> | reset <filename/number> | status",
    cooldowns: 5
};

// Path to box_exports folder
const boxExportPath = path.join(__dirname, "cache", "box_exports");
if (!fs.existsSync(boxExportPath)) {
    fs.mkdirSync(boxExportPath, { recursive: true });
}

// Global state for cron jobs
if (!global.friendManager) {
    global.friendManager = {
        jobs: new Map(), // key: filename, value: { running: true, intervalId, intervalMinutes }
        sentThisSession: new Set()
    };
}

// Helper: get sorted list of JSON files
function getSortedFiles() {
    return fs.readdirSync(boxExportPath)
        .filter(f => f.endsWith('.json'))
        .sort();
}

// Helper: resolve target to filename (accepts number or filename)
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

// Helper: load a file
function loadFile(filename) {
    return JSON.parse(fs.readFileSync(path.join(boxExportPath, filename), 'utf8'));
}

// Helper: save a file
function saveFile(filename, data) {
    fs.writeFileSync(path.join(boxExportPath, filename), JSON.stringify(data, null, 2));
}

// Update missing fields and fetch names/isFriend
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

// Process a single file: update friend status, send one request if possible
async function processFile(api, filename) {
    const data = loadFile(filename);
    let changed = false;

    // Update friend status for non-friends
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
            } catch(e) {}
        }
    }

    // Try to send one friend request
    for (const member of data.members) {
        if (!member.isFriend && !member.requestSent && !global.friendManager.sentThisSession.has(member.id)) {
            try {
                await api.addFriend(member.id);
                member.requestSent = true;
                member.lastChecked = Date.now();
                global.friendManager.sentThisSession.add(member.id);
                changed = true;
                console.log(`[Friends] Sent request to ${member.name} (${member.id}) from ${filename}`);
                break;
            } catch(e) {
                console.error(`[Friends] Failed to send to ${member.id}:`, e.message);
            }
        }
    }

    if (changed) saveFile(filename, data);
}

// Start automation for a specific file
function startJobForFile(api, filename, minutes) {
    if (global.friendManager.jobs.has(filename)) {
        stopJobForFile(filename);
    }
    const intervalId = setInterval(() => {
        global.friendManager.sentThisSession.clear();
        processFile(api, filename);
    }, minutes * 60 * 1000);
    global.friendManager.jobs.set(filename, { running: true, intervalId, intervalMinutes: minutes });
    processFile(api, filename);
}

// Stop automation for a specific file
function stopJobForFile(filename) {
    const job = global.friendManager.jobs.get(filename);
    if (job) {
        clearInterval(job.intervalId);
        global.friendManager.jobs.delete(filename);
        return true;
    }
    return false;
}

// Reset lastChecked only (keep requestSent)
function resetFile(filename) {
    const data = loadFile(filename);
    for (const member of data.members) {
        member.lastChecked = null;
    }
    saveFile(filename, data);
}

// Get statistics for a single file
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

module.exports.run = async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const isAdmin = global.config.ADMINBOT.includes(senderID);
    if (!isAdmin) return api.sendMessage("❌ Only bot admins can use this command!", threadID, messageID);

    const cmd = args[0]?.toLowerCase();
    const target = args[1];
    const option = args[2];

    // ========== LIST (show files like /box file list) ==========
    if (cmd === "list") {
        const files = getSortedFiles();
        if (files.length === 0) {
            return api.sendMessage("📁 No exported files found.\n\nUse /box active list or /fbbox export to create files first.", threadID, messageID);
        }
        let msg = `📁 EXPORTED FILES LIST (Friend Status)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `📊 Total: ${files.length} files\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const data = loadFile(file);
            const stats = getFileStats(file);
            const active = global.friendManager.jobs.has(file) ? "🟢" : "⚪";
            msg += `${i+1}. ${active} 📛 ${data.groupName || "Unknown"}\n`;
            msg += `   📦 ${file}\n`;
            msg += `   👥 Total: ${stats.total} | ✅ Friends: ${stats.friends} | ⏳ Requested: ${stats.requested} | ⏰ Pending: ${stats.pending}\n`;
            msg += `   ───────────────────\n`;
        }
        msg += `\n💡 Use /friends start <number/filename> [minutes] to begin.`;
        return api.sendMessage(msg, threadID, messageID);
    }

    // ========== START ==========
    if (cmd === "start") {
        if (!target) return api.sendMessage("❌ Usage: /friends start <filename/number> [minutes]", threadID, messageID);
        const filename = resolveFilename(target);
        if (!filename) return api.sendMessage("❌ Invalid file number or filename.", threadID, messageID);
        const minutes = parseInt(option) || 15;
        if (minutes < 1 || minutes > 1440) return api.sendMessage("❌ Invalid minutes (1-1440).", threadID, messageID);

        await scanFile(api, filename);
        startJobForFile(api, filename, minutes);
        return api.sendMessage(`✅ Automation started for ${filename} (every ${minutes} min).`, threadID, messageID);
    }

    // ========== STOP ==========
    if (cmd === "stop") {
        if (!target) return api.sendMessage("❌ Usage: /friends stop <filename/number>", threadID, messageID);
        const filename = resolveFilename(target);
        if (!filename) return api.sendMessage("❌ Invalid file number or filename.", threadID, messageID);
        const stopped = stopJobForFile(filename);
        if (stopped) {
            api.sendMessage(`✅ Automation stopped for ${filename}.`, threadID, messageID);
        } else {
            api.sendMessage(`⚠️ Automation was not running for ${filename}.`, threadID, messageID);
        }
        return;
    }

    // ========== RESET (lastChecked only) ==========
    if (cmd === "reset") {
        if (!target) return api.sendMessage("❌ Usage: /friends reset <filename/number>", threadID, messageID);
        const filename = resolveFilename(target);
        if (!filename) return api.sendMessage("❌ Invalid file number or filename.", threadID, messageID);
        resetFile(filename);
        return api.sendMessage(`✅ Reset lastChecked for ${filename}. (requestSent unchanged)`, threadID, messageID);
    }

    // ========== STATUS (overall) ==========
    if (cmd === "status") {
        const files = getSortedFiles();
        let totalUsers = 0, totalFriends = 0, totalRequested = 0;
        for (const file of files) {
            const stats = getFileStats(file);
            totalUsers += stats.total;
            totalFriends += stats.friends;
            totalRequested += stats.requested;
        }
        const activeJobs = Array.from(global.friendManager.jobs.entries()).map(([f, j]) => `• ${f} (every ${j.intervalMinutes} min)`).join('\n');
        let msg = `📊 FRIEND MANAGER STATUS\n━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `👥 Total Users: ${totalUsers}\n`;
        msg += `✅ Friends: ${totalFriends}\n`;
        msg += `⏳ Requests Sent: ${totalRequested}\n`;
        msg += `⏰ Pending: ${totalUsers - totalFriends - totalRequested}\n`;
        msg += `\n⚙️ Active Jobs:\n${activeJobs || 'None'}`;
        return api.sendMessage(msg, threadID, messageID);
    }

    // ========== HELP ==========
    return api.sendMessage(
        `📖 FRIENDS COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 /friends list - Show all exported files with friend stats\n` +
        `🔹 /friends start <file> [min] - Start automation for a file (default 15 min)\n` +
        `🔹 /friends stop <file> - Stop automation for a file\n` +
        `🔹 /friends reset <file> - Reset lastChecked only (keeps requestSent)\n` +
        `🔹 /friends status - Show overall statistics`,
        threadID, messageID
    );
};