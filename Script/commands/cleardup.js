const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "cleardup",
    version: "2.1.0",
    hasPermssion: 2,
    credits: "MQL1 Community",
    description: "Remove duplicate user IDs across all box_exports JSON files (background batch mode, auto-resume)",
    commandCategory: "Admin",
    usages: "scan | start | stop | status | reset",
    cooldowns: 5
};

const boxExportPath = path.join(__dirname, "cache", "box_exports");
const statePath = path.join(__dirname, "cache", "cleardup_state.json");

if (!fs.existsSync(boxExportPath)) fs.mkdirSync(boxExportPath, { recursive: true });

// Global manager for background job
if (!global.cleardupManager) {
    global.cleardupManager = {
        running: false,
        intervalId: null,
        processedSet: new Set(),
        queue: [],
        currentFile: null,
        stats: { totalFiles: 0, processedFiles: 0, removedCount: 0 }
    };
}

// Helper: get all JSON files sorted
function getAllFiles() {
    return fs.readdirSync(boxExportPath)
        .filter(f => f.endsWith('.json'))
        .sort();
}

// Load state from disk (if exists)
function loadState() {
    if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        global.cleardupManager.processedSet = new Set(state.processedSet);
        global.cleardupManager.queue = state.queue;
        global.cleardupManager.stats = state.stats;
        global.cleardupManager.running = state.running;
        if (state.currentFile) global.cleardupManager.currentFile = state.currentFile;
        return true;
    }
    return false;
}

// Save state to disk
function saveState() {
    const state = {
        processedSet: Array.from(global.cleardupManager.processedSet),
        queue: global.cleardupManager.queue,
        stats: global.cleardupManager.stats,
        running: global.cleardupManager.running,
        currentFile: global.cleardupManager.currentFile
    };
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

// Reset state
function resetState() {
    global.cleardupManager.running = false;
    if (global.cleardupManager.intervalId) {
        clearInterval(global.cleardupManager.intervalId);
        global.cleardupManager.intervalId = null;
    }
    global.cleardupManager.processedSet.clear();
    global.cleardupManager.queue = [];
    global.cleardupManager.stats = { totalFiles: 0, processedFiles: 0, removedCount: 0 };
    global.cleardupManager.currentFile = null;
    if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
}

// Process one file from queue
async function processNextFile() {
    if (!global.cleardupManager.running) return;
    if (global.cleardupManager.queue.length === 0) {
        global.cleardupManager.running = false;
        clearInterval(global.cleardupManager.intervalId);
        global.cleardupManager.intervalId = null;
        global.cleardupManager.currentFile = null;
        saveState();
        console.log("[ClearDup] Background cleanup completed.");
        return;
    }

    const filename = global.cleardupManager.queue.shift();
    global.cleardupManager.currentFile = filename;
    saveState();

    try {
        const filePath = path.join(boxExportPath, filename);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const originalLength = data.members.length;
        const newMembers = [];
        let removedFromThisFile = 0;

        for (const member of data.members) {
            if (!global.cleardupManager.processedSet.has(member.id)) {
                newMembers.push(member);
                global.cleardupManager.processedSet.add(member.id);
            } else {
                removedFromThisFile++;
            }
        }

        if (removedFromThisFile > 0) {
            data.members = newMembers;
            data.totalMembers = newMembers.length;
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            global.cleardupManager.stats.removedCount += removedFromThisFile;
        }

        global.cleardupManager.stats.processedFiles++;
        saveState();
        console.log(`[ClearDup] Processed ${filename}: removed ${removedFromThisFile} duplicates. (${global.cleardupManager.stats.processedFiles}/${global.cleardupManager.stats.totalFiles})`);
    } catch (e) {
        console.error(`[ClearDup] Error processing ${filename}:`, e);
    }

    global.cleardupManager.currentFile = null;
    saveState();
}

// Start background job
function startBackgroundJob(intervalMs = 10000) {
    if (global.cleardupManager.running) return false;
    const files = getAllFiles();
    if (files.length === 0) return false;

    // Reset only if no previous state or explicitly starting fresh
    if (global.cleardupManager.queue.length === 0) {
        global.cleardupManager.queue = [...files];
        global.cleardupManager.stats.totalFiles = files.length;
        global.cleardupManager.stats.processedFiles = 0;
        global.cleardupManager.stats.removedCount = 0;
    }

    global.cleardupManager.running = true;
    saveState();

    global.cleardupManager.intervalId = setInterval(() => processNextFile(), intervalMs);
    processNextFile();
    return true;
}

// Stop background job
function stopBackgroundJob() {
    if (!global.cleardupManager.running) return false;
    global.cleardupManager.running = false;
    clearInterval(global.cleardupManager.intervalId);
    global.cleardupManager.intervalId = null;
    global.cleardupManager.currentFile = null;
    saveState();
    return true;
}

// ========== ONLOAD: AUTO-RESUME IF WAS RUNNING ==========
module.exports.onLoad = function() {
    if (loadState() && global.cleardupManager.running) {
        // Restore interval using default 10s (or last used? we store intervalMinutes in state? not yet, so default 10s)
        if (global.cleardupManager.intervalId) clearInterval(global.cleardupManager.intervalId);
        global.cleardupManager.intervalId = setInterval(() => processNextFile(), 10000);
        console.log("[ClearDup] Auto-resumed background cleanup.");
    }
};

// ========== MAIN COMMAND ==========
module.exports.run = async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const isAdmin = global.config.ADMINBOT.includes(senderID);
    if (!isAdmin) return api.sendMessage("❌ Only bot admins can use this command!", threadID, messageID);

    const cmd = args[0]?.toLowerCase();

    // ========== SCAN ==========
    if (cmd === "scan") {
        api.sendMessage("⏳ Scanning for duplicate user IDs...", threadID, messageID);
        const files = getAllFiles();
        const map = new Map();
        let totalUsers = 0;
        for (const file of files) {
            const data = JSON.parse(fs.readFileSync(path.join(boxExportPath, file), 'utf8'));
            totalUsers += data.members.length;
            for (const m of data.members) {
                if (!map.has(m.id)) map.set(m.id, []);
                map.get(m.id).push(file);
            }
        }
        const duplicates = [];
        for (const [uid, fArr] of map.entries()) {
            if (fArr.length > 1) duplicates.push({ userId: uid, files: fArr });
        }
        let msg = `📊 DUPLICATE SCAN REPORT\n━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `📁 Total Files: ${files.length}\n`;
        msg += `👥 Total User Entries: ${totalUsers}\n`;
        msg += `🔄 Duplicate Users: ${duplicates.length}\n`;
        if (duplicates.length > 0) {
            msg += `\n📋 Top 10 Duplicates:\n`;
            duplicates.slice(0, 10).forEach((d, i) => {
                msg += `${i+1}. ${d.userId} - appears in ${d.files.length} files\n`;
            });
            msg += `\n💡 Use /cleardup start to begin background cleanup.`;
        } else {
            msg += `\n✅ No duplicates found!`;
        }
        return api.sendMessage(msg, threadID, messageID);
    }

    // ========== START ==========
    if (cmd === "start") {
        const intervalSec = parseInt(args[1]) || 10;
        if (intervalSec < 5 || intervalSec > 60) {
            return api.sendMessage("❌ Interval must be between 5 and 60 seconds.", threadID, messageID);
        }
        if (global.cleardupManager.running) {
            return api.sendMessage("⚠️ Cleanup is already running. Use /cleardup status.", threadID, messageID);
        }
        const started = startBackgroundJob(intervalSec * 1000);
        if (!started) return api.sendMessage("❌ No files found to process.", threadID, messageID);
        return api.sendMessage(`✅ Background cleanup started (every ${intervalSec}s). Use /cleardup status to monitor.`, threadID, messageID);
    }

    // ========== STOP ==========
    if (cmd === "stop") {
        const stopped = stopBackgroundJob();
        if (stopped) {
            api.sendMessage("✅ Cleanup stopped. Progress saved. Use /cleardup start to resume.", threadID, messageID);
        } else {
            api.sendMessage("⚠️ Cleanup is not running.", threadID, messageID);
        }
        return;
    }

    // ========== STATUS ==========
    if (cmd === "status") {
        loadState();
        const stats = global.cleardupManager.stats;
        const running = global.cleardupManager.running;
        const queueLen = global.cleardupManager.queue.length;
        const currentFile = global.cleardupManager.currentFile;
        let msg = `📊 CLEARDUP STATUS\n━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `⚙️ Running: ${running ? "✅ YES" : "❌ NO"}\n`;
        msg += `📁 Total Files: ${stats.totalFiles || "N/A"}\n`;
        msg += `✅ Processed: ${stats.processedFiles || 0}\n`;
        msg += `⏳ Remaining: ${queueLen}\n`;
        msg += `🗑️ Duplicates Removed: ${stats.removedCount || 0}\n`;
        if (running && currentFile) {
            msg += `📄 Current: ${currentFile}\n`;
        }
        if (!running && stats.totalFiles > 0 && stats.processedFiles === stats.totalFiles) {
            msg += `\n🎉 Cleanup complete!`;
        } else if (!running && stats.processedFiles > 0) {
            msg += `\n💡 Use /cleardup start to resume.`;
        }
        return api.sendMessage(msg, threadID, messageID);
    }

    // ========== RESET ==========
    if (cmd === "reset") {
        resetState();
        return api.sendMessage("✅ Cleanup state reset.", threadID, messageID);
    }

    // ========== HELP ==========
    return api.sendMessage(
        `📖 CLEARDUP COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 /cleardup scan - Quick scan for duplicates (no changes)\n` +
        `🔹 /cleardup start [sec] - Start background cleanup (default 10s interval)\n` +
        `🔹 /cleardup stop - Pause cleanup (progress saved)\n` +
        `🔹 /cleardup status - Show current progress\n` +
        `🔹 /cleardup reset - Reset all progress (start fresh)`,
        threadID, messageID
    );
};