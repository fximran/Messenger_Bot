const fs = require("fs-extra");
const moment = require("moment-timezone");

module.exports.config = {
    name: "box",
    version: "4.2.0",
    hasPermssion: 2,
    credits: "MQL1 Community",
    description: "Import/Export group members (batch mode - safe) + friend-only import",
    commandCategory: "Admin",
    usages: "active list | file list | export [num] | show id [num] | create [num] [name] | import [num] | fimport [num] | queue | stop import [num]",
    cooldowns: 5
};

// Path to store exported files
const exportPath = __dirname + "/cache/box_exports/";

// Ensure export directory exists
if (!fs.existsSync(exportPath)) {
    fs.mkdirSync(exportPath, { recursive: true });
}

// ========== QUEUE SYSTEM FOR IMPORT ==========
let importQueue = [];
let isImportRunning = false;

// Save queue state to file
const queuePath = __dirname + "/cache/box_queue.json";

function saveQueue() {
    const queueData = { importQueue, isImportRunning };
    fs.writeFileSync(queuePath, JSON.stringify(queueData, null, 2));
}

function loadQueue() {
    if (fs.existsSync(queuePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(queuePath, "utf8"));
            importQueue = data.importQueue || [];
            isImportRunning = data.isImportRunning || false;
        } catch(e) {}
    }
}
loadQueue();

// ========== AUTO IMPORT PROCESSOR ==========
async function processImportQueue(api) {
    if (importQueue.length === 0) { isImportRunning = false; saveQueue(); return; }
    if (isImportRunning) return;
    isImportRunning = true;
    saveQueue();

    while (importQueue.length > 0) {
        const task = importQueue[0];
        try {
            const { filename, targetThreadID, members, currentIndex, addedCount, failedCount, startTime, requestThreadID } = task;
            if (!task.currentIndex) {
                task.currentIndex = 0; task.addedCount = 0; task.failedCount = 0; task.startTime = Date.now();
                try {
                    const threadInfo = await api.getThreadInfo(targetThreadID);
                    task.existingMembers = new Set(threadInfo.participantIDs || []);
                    const newMembers = [];
                    for (const uid of members) if (!task.existingMembers.has(uid)) newMembers.push(uid);
                    task.members = newMembers;
                    task.totalToAdd = newMembers.length;
                    task.skippedCount = members.length - newMembers.length;
                    if (requestThreadID) {
                        let msg = `🔄 Started background import from "${filename}"\n📊 Total in file: ${members.length} members\n👥 Already in group: ${task.skippedCount} (skipped)\n✅ Need to add: ${task.totalToAdd}\n⚡ Random batch mode: 2-7 members every 20-70 seconds`;
                        api.sendMessage(msg, requestThreadID);
                    }
                    if (task.totalToAdd === 0) {
                        if (requestThreadID) api.sendMessage(`✅ No new members to add!`, requestThreadID);
                        importQueue.shift(); saveQueue(); continue;
                    }
                } catch (error) {
                    if (requestThreadID) api.sendMessage(`⚠️ Could not fetch group members. Will try to add all.`, requestThreadID);
                    task.members = members; task.totalToAdd = members.length; task.skippedCount = 0;
                }
            }

            if (task.currentIndex < task.members.length) {
                const batchSize = Math.floor(Math.random() * 6) + 2;
                const endIndex = Math.min(task.currentIndex + batchSize, task.members.length);
                const batchMembers = task.members.slice(task.currentIndex, endIndex);
                let batchAdded = 0, batchFailed = 0;
                for (const uid of batchMembers) {
                    try { await api.addUserToGroup(uid, targetThreadID); batchAdded++; } catch(e) { batchFailed++; }
                }
                task.addedCount += batchAdded; task.failedCount += batchFailed; task.currentIndex = endIndex;
                importQueue[0] = task; saveQueue();
                if (requestThreadID) {
                    const percent = Math.floor((task.currentIndex / task.members.length) * 100);
                    api.sendMessage(`📊 Import progress: ${task.currentIndex}/${task.members.length} (${percent}%)\n📦 Batch: +${batchAdded} members\n✅ Total added: ${task.addedCount}\n❌ Failed: ${task.failedCount}`, requestThreadID);
                }
                const randomDelay = Math.floor(Math.random() * 50000) + 20000;
                await new Promise(resolve => setTimeout(resolve, randomDelay));
            }

            if (task.currentIndex >= task.members.length) {
                const elapsed = Math.floor((Date.now() - task.startTime) / 1000);
                const minutes = Math.floor(elapsed / 60), seconds = elapsed % 60;
                if (requestThreadID) {
                    api.sendMessage(`✅ IMPORT COMPLETED!\n\n📛 File: ${filename}\n📊 Total in file: ${members.length}\n👥 Already in group: ${task.skippedCount || 0}\n✅ Newly added: ${task.addedCount}\n❌ Failed: ${task.failedCount}\n⏱️ Time: ${minutes}m ${seconds}s`, requestThreadID);
                }
                importQueue.shift(); saveQueue();
            }
        } catch (error) {
            console.log("Import error:", error);
            if (task.requestThreadID) api.sendMessage(`❌ Import failed: ${error.message}`, task.requestThreadID);
            importQueue.shift(); saveQueue();
        }
    }
    isImportRunning = false; saveQueue();
}

// ========== HELPERS ==========
function getFilePathByGroupId(groupId) {
    const files = fs.readdirSync(exportPath).filter(f => f.endsWith(".json"));
    for (const file of files) {
        const filepath = exportPath + file;
        try {
            const data = JSON.parse(fs.readFileSync(filepath, "utf8"));
            if (data.groupId === groupId) return { filepath, filename: file, data };
        } catch(e) {}
    }
    return null;
}

async function saveOrUpdateExport(groupId, groupName, membersData) {
    const existing = getFilePathByGroupId(groupId);
    const safeName = groupName.replace(/[\\/:*?"<>|]/g, "_");
    const newFilename = `${groupId}_${safeName}.json`;
    const newFilepath = exportPath + newFilename;
    const exportData = {
        exportedAt: moment().tz("Asia/Dhaka").format("DD/MM/YYYY hh:mm:ss A"),
        groupId, groupName,
        totalMembers: membersData.length,
        members: membersData
    };
    if (existing) {
        if (existing.filepath !== newFilepath) fs.unlinkSync(existing.filepath);
        fs.writeFileSync(newFilepath, JSON.stringify(exportData, null, 2));
        return { updated: true, filename: newFilename, isNew: false };
    } else {
        fs.writeFileSync(newFilepath, JSON.stringify(exportData, null, 2));
        return { updated: false, filename: newFilename, isNew: true };
    }
}

// ========== HANDLE REPLY ==========
module.exports.handleReply = async function ({ api, event, Threads, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    const { author, type, groups, exportData } = handleReply;
    if (senderID != author) return;
    const isBotAdmin = global.config.ADMINBOT.includes(senderID);
    let num = null;
    const numberMatch = body.match(/\d+/);
    if (numberMatch) num = parseInt(numberMatch[0]);
    const isDeleteFile = body.toLowerCase().includes("delete") || body.toLowerCase().includes("del");
    const isDeleteAll = body.toLowerCase().includes("all");
    const isStop = body.toLowerCase().includes("stop");

    if (isStop && type === "queue_action") {
        if (!isBotAdmin) return;
        const parts = body.toLowerCase().split(" ");
        const taskNum = parseInt(parts[2]);
        if (isNaN(taskNum) || taskNum < 1 || taskNum > importQueue.length) return api.sendMessage(`❌ Import task #${taskNum} not found!`, threadID, messageID);
        const task = importQueue[taskNum - 1];
        importQueue.splice(taskNum - 1, 1); saveQueue();
        return api.sendMessage(`✅ Stopped import: ${task.filename}`, threadID, messageID);
    }

    if (isDeleteFile && type === "file_list_action") {
        if (!isBotAdmin) return;
        if (isDeleteAll) {
            const files = fs.readdirSync(exportPath).filter(f => f.endsWith(".json"));
            let deletedCount = 0;
            for (const file of files) { try { fs.unlinkSync(exportPath + file); deletedCount++; } catch(e) {} }
            return api.sendMessage(`✅ Deleted ${deletedCount} file(s)!`, threadID, messageID);
        }
        if (isNaN(num) || num < 1 || num > exportData.files.length) return api.sendMessage(`❌ Invalid number!`, threadID, messageID);
        const selectedFile = exportData.files[num - 1];
        const filepath = exportPath + selectedFile;
        if (!fs.existsSync(filepath)) return api.sendMessage(`❌ File not found!`, threadID, messageID);
        try { fs.unlinkSync(filepath); return api.sendMessage(`✅ Deleted "${selectedFile}"!`, threadID, messageID); }
        catch (error) { return api.sendMessage(`❌ Failed: ${error.message}`, threadID, messageID); }
    }

    if (type === "active_list_export") {
        if (!isBotAdmin) return;
        if (isNaN(num) || num < 1 || num > groups.length) return api.sendMessage(`❌ Invalid number!`, threadID, messageID);
        const selectedGroup = groups[num - 1];
        api.sendMessage(`⏳ Exporting "${selectedGroup.name}"...`, threadID, messageID);
        try {
            const threadInfo = await api.getThreadInfo(selectedGroup.id);
            const participants = threadInfo.participantIDs || [];
            const membersData = participants.map(uid => ({ id: uid, bots: {} }));
            const result = await saveOrUpdateExport(selectedGroup.id, selectedGroup.name, membersData);
            api.sendMessage(`✅ EXPORT COMPLETED!\n\n📛 Group: ${selectedGroup.name}\n🆔 ID: ${selectedGroup.id}\n📦 File: ${result.filename}\n👥 Total: ${membersData.length}\n💡 Use /box file list.`, threadID, messageID);
        } catch (error) { api.sendMessage(`❌ Export failed: ${error.message}`, threadID, messageID); }
        return;
    }

    if (type === "file_list_action") {
        const isShowId = body.toLowerCase().includes("show id") || body.toLowerCase().includes("showid");
        const isCreate = body.toLowerCase().includes("create");
        const isImport = body.toLowerCase().includes("import");
        const isFriendImport = body.toLowerCase().includes("fimport");

        if (isShowId) {
            if (isNaN(num) || num < 1 || num > exportData.files.length) return api.sendMessage(`❌ Invalid number!`, threadID, messageID);
            const selectedFile = exportData.files[num - 1];
            const filepath = exportPath + selectedFile;
            if (!fs.existsSync(filepath)) return api.sendMessage(`❌ File not found!`, threadID, messageID);
            const data = JSON.parse(fs.readFileSync(filepath, "utf8"));
            let idList = "";
            for (const m of data.members) idList += m.id + " ";
            return api.sendMessage(`📋 MEMBERS ID LIST\n━━━━━━━━━━━━━━━━━━━━\n📛 ${data.groupName}\n👥 Total: ${data.totalMembers}\n━━━━━━━━━━━━━━━━━━━━\n\n${idList.trim()}`, threadID, messageID);
        }

        if (!isBotAdmin) return;

        if (isCreate || isImport || isFriendImport || isDeleteFile) {
            if (isNaN(num) || num < 1 || num > exportData.files.length) return api.sendMessage(`❌ Invalid number!`, threadID, messageID);
            const selectedFile = exportData.files[num - 1];
            const filepath = exportPath + selectedFile;
            if (!fs.existsSync(filepath)) return api.sendMessage(`❌ File not found!`, threadID, messageID);
            const data = JSON.parse(fs.readFileSync(filepath, "utf8"));

            if (isCreate) {
                let groupName = body.replace(/create\s+\d+/i, "").trim();
                if (!groupName) return api.sendMessage(`❌ Provide a group name! Example: create 1 My Group`, threadID, messageID);
                const memberIds = data.members.map(m => m.id);
                api.sendMessage(`⏳ Creating "${groupName}" with ${memberIds.length} members...`, threadID, messageID);
                try {
                    const newGroup = await api.createNewGroup(memberIds, groupName);
                    let newThreadID = newGroup.threadID || newGroup.id;
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    if (newThreadID) await api.changeAdminStatus(newThreadID, senderID, true);
                    return api.sendMessage(`✅ Created "${groupName}"!\n👑 You are admin.\n👥 ${memberIds.length} members`, threadID, messageID);
                } catch (error) { return api.sendMessage(`❌ Failed: ${error.message}`, threadID, messageID); }
            }

            // Determine target group
            let targetGroupID = threadID;
            let targetGroupName = "current group";
            const parts = body.trim().split(/\s+/);
            if (parts.length >= 3) {
                const providedGroupID = parts[2];
                if (/^\d+$/.test(providedGroupID)) {
                    targetGroupID = providedGroupID;
                    targetGroupName = `group ${targetGroupID}`;
                    try {
                        const targetInfo = await api.getThreadInfo(targetGroupID);
                        if (!targetInfo) return api.sendMessage(`❌ Bot is not in group ${targetGroupID}!`, threadID, messageID);
                        targetGroupName = targetInfo.threadName || targetGroupID;
                    } catch(e) { return api.sendMessage(`❌ Cannot access group ${targetGroupID}.`, threadID, messageID); }
                }
            }

            try {
                const targetInfo = await api.getThreadInfo(targetGroupID);
                const isBotAdminInTarget = targetInfo.adminIDs.some(a => a.id == api.getCurrentUserID());
                if (!isBotAdminInTarget) return api.sendMessage(`❌ Bot needs to be admin in ${targetGroupName}!`, threadID, messageID);
            } catch(e) { return api.sendMessage(`❌ Cannot verify bot admin status.`, threadID, messageID); }

            const currentMembers = new Set((await api.getThreadInfo(targetGroupID)).participantIDs || []);
            const botId = api.getCurrentUserID();

            // Collect members to add
            let membersToAdd = [];
            if (isFriendImport) {
                // FRIEND IMPORT: only friends of current bot
                for (const m of data.members) {
                    if (m.id === botId) continue;
                    if (m.bots && m.bots[botId] && m.bots[botId].isFriend) membersToAdd.push(m.id);
                }
                if (membersToAdd.length === 0) return api.sendMessage(`❌ No friends found in this file for current bot!`, threadID, messageID);
            } else {
                // NORMAL IMPORT: all members
                for (const m of data.members) {
                    if (!currentMembers.has(m.id) && m.id !== botId) membersToAdd.push(m.id);
                }
            }

            membersToAdd = membersToAdd.filter(id => !currentMembers.has(id));
            if (membersToAdd.length === 0) return api.sendMessage(`✅ No new members to add!`, threadID, messageID);

            const alreadyInQueue = importQueue.some(q => q.filename === selectedFile && q.targetThreadID === targetGroupID);
            if (alreadyInQueue) return api.sendMessage(`⚠️ Already in queue for ${targetGroupName}!`, threadID, messageID);

            importQueue.push({
                filepath, filename: selectedFile, targetThreadID, authorID: senderID,
                members: membersToAdd, currentIndex: 0, addedCount: 0, failedCount: 0,
                startTime: null, requestThreadID: threadID
            });
            saveQueue();

            const importType = isFriendImport ? "friend import" : "import";
            api.sendMessage(
                `✅ Added "${selectedFile}" to ${importType} queue for ${targetGroupName}!\n\n` +
                `📊 Members to add: ${membersToAdd.length}\n⚡ Random batch mode: 2-7 members every 20-70s\n📌 Use /box queue to check status`,
                threadID, messageID
            );
            if (!isImportRunning) processImportQueue(api);
            return;
        }
    }
};

// ========== MAIN RUN ==========
module.exports.run = async function ({ api, event, args, Threads }) {
    const { threadID, messageID, senderID } = event;
    const isBotAdmin = global.config.ADMINBOT.includes(senderID);
    if (!isBotAdmin) return;

    // QUEUE STATUS
    if (args[0] === "queue") {
        let msg = `📋 QUEUE STATUS\n━━━━━━━━━━━━━━━━━━━━\n`;
        if (importQueue.length === 0) msg += `\n✅ No tasks in queue.`;
        else {
            msg += `\n📥 IMPORT QUEUE (${importQueue.length}):\n`;
            for (let i = 0; i < importQueue.length; i++) {
                const task = importQueue[i];
                const percent = task.currentIndex ? Math.floor((task.currentIndex / task.members.length) * 100) : 0;
                msg += `   ${i+1}. 📦 ${task.filename}\n      📊 Progress: ${task.currentIndex || 0}/${task.members.length} (${percent}%)\n      ✅ Added: ${task.addedCount || 0}\n      ❌ Failed: ${task.failedCount || 0}\n      ⏱️ Status: ${task.currentIndex && task.currentIndex < task.members.length ? 'Running' : 'Waiting'}\n`;
            }
        }
        msg += `\n━━━━━━━━━━━━━━━━━━━━\n💡 Reply with: stop import [number]`;
        return api.sendMessage(msg, threadID, (e, info) => {
            if (!e) global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: senderID, type: "queue_action", exportData: { items: [] } });
        }, messageID);
    }

    // ACTIVE LIST
    if (args[0] === "active" && args[1] === "list") {
        try {
            const data = await api.getThreadList(500, null, ["INBOX"]);
            let groups = [];
            for (const thread of data) {
                if (thread.isGroup && thread.isSubscribed) {
                    let memberCount = 0, male = 0, female = 0, unknown = 0;
                    try {
                        const fullInfo = await api.getThreadInfo(thread.threadID);
                        memberCount = fullInfo.participantIDs?.length || 0;
                        if (fullInfo.userInfo) {
                            for (let user of fullInfo.userInfo) {
                                if (user.gender === "MALE") male++; else if (user.gender === "FEMALE") female++; else unknown++;
                            }
                        }
                    } catch(e) { memberCount = thread.participantIDs?.length || 0; }
                    groups.push({ id: thread.threadID, name: thread.name || "Unknown", messageCount: thread.messageCount || 0, memberCount, male, female, unknown });
                }
            }
            if (groups.length === 0) return api.sendMessage("❌ Bot is not in any group!", threadID, messageID);
            groups.sort((a,b) => b.messageCount - a.messageCount);
            let msg = `📦 ACTIVE GROUPS LIST\n━━━━━━━━━━━━━━━━━━━━\n📊 Total: ${groups.length} groups\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            for (let i = 0; i < groups.length; i++) {
                const existing = getFilePathByGroupId(groups[i].id);
                msg += `${i+1}. 📛 ${groups[i].name}\n   🆔 ${groups[i].id}\n   💬 ${groups[i].messageCount} msgs\n   👥 Members: ${groups[i].memberCount}\n      👨 Male: ${groups[i].male}\n      👩 Female: ${groups[i].female}\n      ❓ Unknown: ${groups[i].unknown}\n   📁 Exported: ${existing ? '✅' : '❌'}\n   ───────────────────\n`;
            }
            msg += `\n💡 Reply with a number to export/update members of that group (1 API call only)`;
            return api.sendMessage(msg, threadID, (e, info) => {
                if (!e) global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: senderID, type: "active_list_export", groups });
            }, messageID);
        } catch (e) { return api.sendMessage("❌ Error fetching group list.", threadID, messageID); }
    }

    // FILE LIST
    if (args[0] === "file" && args[1] === "list") {
        try {
            const files = fs.readdirSync(exportPath).filter(f => f.endsWith(".json"));
            if (files.length === 0) return api.sendMessage("📁 No exported files found.\n\nUse /box active list to export first.", threadID, messageID);
            let msg = `📁 EXPORTED FILES LIST\n━━━━━━━━━━━━━━━━━━━━\n📊 Total: ${files.length} files\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            for (let i = 0; i < files.length; i++) {
                const filepath = exportPath + files[i];
                try {
                    const data = JSON.parse(fs.readFileSync(filepath, "utf8"));
                    msg += `${i+1}. 📛 ${data.groupName}\n   🆔 ${data.groupId}\n   📅 ${data.exportedAt}\n   👥 ${data.totalMembers} members\n   📦 ${files[i]}\n   ───────────────────\n`;
                } catch(e) { msg += `${i+1}. 📦 ${files[i]}\n   ───────────────────\n`; }
            }
            msg += `\n💡 Commands:\n   • show id [num] - Show all member IDs\n   • create [num] [name] - Create new group\n   • import [num] [groupID] - Add all members\n   • fimport [num] [groupID] - Add only FRIENDS of current bot\n   • delete [num] - Delete file\n   • delete all - Delete all files\n\n📌 /box queue - Check import progress`;
            return api.sendMessage(msg, threadID, (e, info) => {
                if (!e) global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: senderID, type: "file_list_action", exportData: { files } });
            }, messageID);
        } catch (e) { return api.sendMessage("❌ Error reading files.", threadID, messageID); }
    }

    // HELP
    return api.sendMessage(
        `📖 BOX MANAGEMENT\n━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📦 /box active list - Show groups (reply to export)\n\n` +
        `📁 /box file list - Show exported files\n   show id | create | import | fimport | delete\n\n` +
        `📋 /box queue - Check import progress\n   stop import [num] - Stop a task\n\n` +
        `⚡ Features:\n   • Export: 1 API call for all members (safe)\n   • Import: Random batch mode (2-7 members every 20-70s)\n   • fimport: Import only friends of current bot\n   • Auto-skip existing members\n   • Resume after bot restart\n\n👑 Bot Admins only`,
        threadID, messageID
    );
};