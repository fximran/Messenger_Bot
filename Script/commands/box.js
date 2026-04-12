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
    const queueData = {
        importQueue,
        isImportRunning
    };
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

// ========== AUTO IMPORT PROCESSOR (RANDOM BATCH + RANDOM DELAY) ==========
async function processImportQueue(api) {
    if (importQueue.length === 0) {
        isImportRunning = false;
        saveQueue();
        return;
    }
    
    if (isImportRunning) return;
    isImportRunning = true;
    saveQueue();
    
    while (importQueue.length > 0) {
        const task = importQueue[0];
        
        try {
            const { filename, targetThreadID, members, currentIndex, addedCount, failedCount, startTime, requestThreadID } = task;
            
            if (!task.currentIndex) {
                task.currentIndex = 0;
                task.addedCount = 0;
                task.failedCount = 0;
                task.startTime = Date.now();
                
                // Get existing group members once
                try {
                    const threadInfo = await api.getThreadInfo(targetThreadID);
                    task.existingMembers = new Set(threadInfo.participantIDs || []);
                    
                    // Filter out users already in group
                    const newMembers = [];
                    for (const uid of members) {
                        if (!task.existingMembers.has(uid)) {
                            newMembers.push(uid);
                        }
                    }
                    
                    task.members = newMembers;
                    task.totalToAdd = newMembers.length;
                    task.skippedCount = members.length - newMembers.length;
                    
                    if (requestThreadID) {
                        let msg = `🔄 Started background import from "${filename}"\n`;
                        msg += `📊 Total in file: ${members.length} members\n`;
                        msg += `👥 Already in group: ${task.skippedCount} members (skipped)\n`;
                        msg += `✅ Need to add: ${task.totalToAdd} members\n`;
                        msg += `⚡ Random batch mode: 2-7 members every 20-70 seconds`;
                        api.sendMessage(msg, requestThreadID);
                    }
                    
                    if (task.totalToAdd === 0) {
                        if (requestThreadID) {
                            api.sendMessage(`✅ No new members to add! All ${members.length} members are already in the group.`, requestThreadID);
                        }
                        importQueue.shift();
                        saveQueue();
                        continue;
                    }
                    
                } catch (error) {
                    if (requestThreadID) {
                        api.sendMessage(`⚠️ Could not fetch group members. Will try to add all (may have duplicates).`, requestThreadID);
                    }
                    task.members = members;
                    task.totalToAdd = members.length;
                    task.skippedCount = 0;
                }
            }
            
            // Process random batch (2-7 members)
            if (task.currentIndex < task.members.length) {
                // Random batch size between 2 and 7
                const batchSize = Math.floor(Math.random() * 6) + 2; // 2,3,4,5,6,7
                const endIndex = Math.min(task.currentIndex + batchSize, task.members.length);
                const batchMembers = task.members.slice(task.currentIndex, endIndex);
                
                let batchAdded = 0;
                let batchFailed = 0;
                
                // Add all members in this batch
                for (const uid of batchMembers) {
                    try {
                        await api.addUserToGroup(uid, targetThreadID);
                        batchAdded++;
                    } catch(e) {
                        batchFailed++;
                    }
                }
                
                task.addedCount += batchAdded;
                task.failedCount += batchFailed;
                task.currentIndex = endIndex;
                importQueue[0] = task;
                saveQueue();
                
                // Send progress update after each batch
                if (requestThreadID) {
                    const percent = Math.floor((task.currentIndex / task.members.length) * 100);
                    api.sendMessage(
                        `📊 Import progress: ${task.currentIndex}/${task.members.length} (${percent}%)\n` +
                        `📦 Batch: +${batchAdded} members\n` +
                        `✅ Total added: ${task.addedCount}\n` +
                        `❌ Failed: ${task.failedCount}`,
                        requestThreadID
                    );
                }
                
                // Random delay between 20 and 70 seconds (20000 - 70000 ms)
                const randomDelay = Math.floor(Math.random() * 50000) + 20000;
                await new Promise(resolve => setTimeout(resolve, randomDelay));
            }
            
            // Task complete
            if (task.currentIndex >= task.members.length) {
                const elapsed = Math.floor((Date.now() - task.startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                
                if (requestThreadID) {
                    api.sendMessage(
                        `✅ IMPORT COMPLETED!\n\n` +
                        `📛 File: ${filename}\n` +
                        `📊 Total in file: ${members.length} members\n` +
                        `👥 Already in group: ${task.skippedCount || 0} (skipped)\n` +
                        `✅ Newly added: ${task.addedCount}\n` +
                        `❌ Failed: ${task.failedCount}\n` +
                        `⏱️ Time taken: ${minutes}m ${seconds}s`,
                        requestThreadID
                    );
                }
                
                importQueue.shift();
                saveQueue();
            }
            
        } catch (error) {
            console.log("Import error:", error);
            if (task.requestThreadID) {
                api.sendMessage(`❌ Import failed: ${error.message}`, task.requestThreadID);
            }
            importQueue.shift();
            saveQueue();
        }
    }
    
    isImportRunning = false;
    saveQueue();
}

// Function to get file path by group ID
function getFilePathByGroupId(groupId) {
    const files = fs.readdirSync(exportPath).filter(f => f.endsWith(".json"));
    for (const file of files) {
        const filepath = exportPath + file;
        try {
            const content = fs.readFileSync(filepath, "utf8");
            const data = JSON.parse(content);
            if (data.groupId === groupId) {
                return { filepath, filename: file, data };
            }
        } catch(e) {}
    }
    return null;
}

// Function to save or update export file
async function saveOrUpdateExport(groupId, groupName, membersData) {
    const existing = getFilePathByGroupId(groupId);
    
    const safeName = groupName.replace(/[\\/:*?"<>|]/g, "_");
    const newFilename = `${groupId}_${safeName}.json`;
    const newFilepath = exportPath + newFilename;
    
    const exportData = {
        exportedAt: moment().tz("Asia/Dhaka").format("DD/MM/YYYY hh:mm:ss A"),
        groupId: groupId,
        groupName: groupName,
        totalMembers: membersData.length,
        members: membersData
    };
    
    if (existing) {
        if (existing.filepath !== newFilepath) {
            await fs.unlinkSync(existing.filepath);
        }
        await fs.writeFileSync(newFilepath, JSON.stringify(exportData, null, 2));
        return { updated: true, filename: newFilename, isNew: false };
    } else {
        await fs.writeFileSync(newFilepath, JSON.stringify(exportData, null, 2));
        return { updated: false, filename: newFilename, isNew: true };
    }
}

module.exports.handleReply = async function ({ api, event, Threads, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    const { author, type, groups, exportData } = handleReply;
    
    if (senderID != author) return;
    
    const isBotAdmin = global.config.ADMINBOT.includes(senderID);
    
    let num = null;
    const numberMatch = body.match(/\d+/);
    if (numberMatch) {
        num = parseInt(numberMatch[0]);
    }
    
    const isDeleteFile = body.toLowerCase().includes("delete") || body.toLowerCase().includes("del");
    const isDeleteAll = body.toLowerCase().includes("all");
    const isStop = body.toLowerCase().includes("stop");
    
    // ========== STOP QUEUE ITEM ==========
    if (isStop && type === "queue_action") {
        if (!isBotAdmin) return;
        
        const parts = body.toLowerCase().split(" ");
        const taskNum = parseInt(parts[2]);
        
        if (isNaN(taskNum) || taskNum < 1 || taskNum > importQueue.length) {
            return api.sendMessage(`❌ Import task #${taskNum} not found! Only ${importQueue.length} import task(s) in queue.`, threadID, messageID);
        }
        
        const task = importQueue[taskNum - 1];
        importQueue.splice(taskNum - 1, 1);
        saveQueue();
        return api.sendMessage(`✅ Stopped import: ${task.filename}`, threadID, messageID);
    }
    
    // ========== DELETE FILE ==========
    if (isDeleteFile && type === "file_list_action") {
        if (!isBotAdmin) return;
        
        if (isDeleteAll) {
            const files = fs.readdirSync(exportPath).filter(f => f.endsWith(".json"));
            let deletedCount = 0;
            for (const file of files) {
                try {
                    await fs.unlinkSync(exportPath + file);
                    deletedCount++;
                } catch(e) {}
            }
            return api.sendMessage(`✅ Deleted ${deletedCount} file(s) successfully!`, threadID, messageID);
        }
        
        if (isNaN(num) || num < 1 || num > exportData.files.length) {
            return api.sendMessage(`❌ Invalid number!`, threadID, messageID);
        }
        
        const selectedFile = exportData.files[num - 1];
        const filepath = exportPath + selectedFile;
        
        if (!fs.existsSync(filepath)) {
            return api.sendMessage(`❌ File not found!`, threadID, messageID);
        }
        
        try {
            await fs.unlinkSync(filepath);
            return api.sendMessage(`✅ Deleted file "${selectedFile}" successfully!`, threadID, messageID);
        } catch (error) {
            return api.sendMessage(`❌ Failed to delete file.\nError: ${error.message}`, threadID, messageID);
        }
    }
    
    // ========== EXPORT (ACTIVE LIST REPLY) ==========
    if (type === "active_list_export") {
        if (!isBotAdmin) return;
        
        if (isNaN(num) || num < 1 || num > groups.length) {
            return api.sendMessage(`❌ Invalid number! Please reply with a valid group number.`, threadID, messageID);
        }
        
        const selectedGroup = groups[num - 1];
        
        api.sendMessage(`⏳ Exporting "${selectedGroup.name}"...\n📊 Fetching all member IDs in one request...`, threadID, messageID);
        
        try {
            const threadInfo = await api.getThreadInfo(selectedGroup.id);
            const participants = threadInfo.participantIDs || [];
            
            const membersData = [];
            for (const uid of participants) {
                membersData.push({ id: uid, bots: {} });
            }
            
            const result = await saveOrUpdateExport(selectedGroup.id, selectedGroup.name, membersData);
            
            api.sendMessage(
                `✅ EXPORT COMPLETED!\n\n` +
                `📛 Group: ${selectedGroup.name}\n` +
                `🆔 ID: ${selectedGroup.id}\n` +
                `📦 File: ${result.filename}\n` +
                `👥 Total Members: ${membersData.length}\n` +
                `⚡ API Calls: Only 1 (safe!)\n\n` +
                `💡 Use /box file list to see all exported files.`,
                threadID, messageID
            );
        } catch (error) {
            api.sendMessage(`❌ Export failed: ${error.message}`, threadID, messageID);
        }
        return;
    }
    
    // ========== FILE LIST ACTIONS ==========
    else if (type === "file_list_action") {
        const isShowId = body.toLowerCase().includes("show id") || body.toLowerCase().includes("showid");
        const isCreate = body.toLowerCase().includes("create");
        const isImport = body.toLowerCase().includes("import") && !body.toLowerCase().includes("fimport");
        const isFriendImport = body.toLowerCase().includes("fimport");
        
        // Show ID - anyone can view
        if (isShowId) {
            if (isNaN(num) || num < 1 || num > exportData.files.length) {
                return api.sendMessage(`❌ Invalid number!`, threadID, messageID);
            }
            
            const selectedFile = exportData.files[num - 1];
            const filepath = exportPath + selectedFile;
            
            if (!fs.existsSync(filepath)) {
                return api.sendMessage(`❌ File not found!`, threadID, messageID);
            }
            
            const fileContent = await fs.readFileSync(filepath, "utf8");
            const data = JSON.parse(fileContent);
            
            let idList = "";
            for (let i = 0; i < data.members.length; i++) {
                idList += data.members[i].id + " ";
            }
            const msg = `📋 MEMBERS ID LIST\n━━━━━━━━━━━━━━━━━━━━\n📛 ${data.groupName}\n👥 Total: ${data.totalMembers}\n━━━━━━━━━━━━━━━━━━━━\n\n${idList.trim()}`;
            return api.sendMessage(msg, threadID, messageID);
        }
        
        // Create, Import, Friend Import, Delete - require bot admin permission
        if (!isBotAdmin) return;
        
        if (isCreate || isImport || isFriendImport || isDeleteFile) {
            if (isNaN(num) || num < 1 || num > exportData.files.length) {
                return api.sendMessage(`❌ Invalid number!`, threadID, messageID);
            }
            
            const selectedFile = exportData.files[num - 1];
            const filepath = exportPath + selectedFile;
            
            if (!fs.existsSync(filepath)) {
                return api.sendMessage(`❌ File not found!`, threadID, messageID);
            }
            
            const fileContent = await fs.readFileSync(filepath, "utf8");
            const data = JSON.parse(fileContent);
            
            // CREATE NEW GROUP
            if (isCreate) {
                let groupName = body.replace(/create\s+\d+/i, "").trim();
                if (!groupName) {
                    return api.sendMessage(`❌ Please provide a group name!\nExample: create 1 My Group`, threadID, messageID);
                }
                
                const memberIds = data.members.map(m => m.id);
                api.sendMessage(`⏳ Creating group "${groupName}" with ${memberIds.length} members...`, threadID, messageID);
                
                try {
                    const newGroup = await api.createNewGroup(memberIds, groupName);
                    let newThreadID = newGroup.threadID || newGroup.id;
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    if (newThreadID) {
                        await api.changeAdminStatus(newThreadID, senderID, true);
                    }
                    return api.sendMessage(`✅ Created "${groupName}"!\n👑 You are admin.\n👥 ${memberIds.length} members`, threadID, messageID);
                } catch (error) {
                    return api.sendMessage(`❌ Failed: ${error.message}`, threadID, messageID);
                }
            }
            
            // IMPORT TO CURRENT GROUP OR SPECIFIED GROUP
            if (isImport || isFriendImport) {
                let targetGroupID = threadID;
                let targetGroupName = "current group";
                
                const parts = body.trim().split(/\s+/);
                if (parts.length >= 3) {
                    const providedGroupID = parts[2];
                    if (/^\d+$/.test(providedGroupID)) {
                        targetGroupID = providedGroupID;
                        targetGroupName = `group ${targetGroupID}`;
                        
                        try {
                            const targetThreadInfo = await api.getThreadInfo(targetGroupID);
                            if (!targetThreadInfo) {
                                return api.sendMessage(`❌ Bot is not in group ${targetGroupID} or group doesn't exist!`, threadID, messageID);
                            }
                            targetGroupName = targetThreadInfo.threadName || targetGroupID;
                        } catch(e) {
                            return api.sendMessage(`❌ Cannot access group ${targetGroupID}. Make sure bot is in that group.`, threadID, messageID);
                        }
                    } else {
                        return api.sendMessage(`❌ Invalid group ID! Please provide a numeric group ID.\nExample: import 1 123456789`, threadID, messageID);
                    }
                }
                
                try {
                    const targetGroupInfo = await api.getThreadInfo(targetGroupID);
                    const isBotAdminInTarget = targetGroupInfo.adminIDs.some(a => a.id == api.getCurrentUserID());
                    
                    if (!isBotAdminInTarget) {
                        return api.sendMessage(`❌ Bot needs to be admin in ${targetGroupName} to add members!`, threadID, messageID);
                    }
                } catch(e) {
                    return api.sendMessage(`❌ Cannot verify bot admin status in ${targetGroupName}.`, threadID, messageID);
                }
                
                const currentGroupInfo = await api.getThreadInfo(targetGroupID);
                const currentMembers = currentGroupInfo.participantIDs || [];
                
                const membersToAdd = [];
                const botId = api.getCurrentUserID();
                
                if (isFriendImport) {
                    // Friend import: only members who are friends of current bot
                    for (const member of data.members) {
                        if (member.id === botId) continue;
                        // Check if friend with current bot
                        if (member.bots && member.bots[botId] && member.bots[botId].isFriend) {
                            if (!currentMembers.includes(member.id)) {
                                membersToAdd.push(member.id);
                            }
                        }
                    }
                } else {
                    // Normal import: all members
                    for (const member of data.members) {
                        if (!currentMembers.includes(member.id) && member.id !== botId) {
                            membersToAdd.push(member.id);
                        }
                    }
                }
                
                if (membersToAdd.length === 0) {
                    const msgType = isFriendImport ? "friends" : "new members";
                    return api.sendMessage(`❌ No ${msgType} to add to ${targetGroupName}!`, threadID, messageID);
                }
                
                const alreadyInQueue = importQueue.some(q => q.filename === selectedFile && q.targetThreadID === targetGroupID);
                if (alreadyInQueue) {
                    return api.sendMessage(`⚠️ "${selectedFile}" is already in the import queue for ${targetGroupName}!`, threadID, messageID);
                }
                
                importQueue.push({
                    filepath: filepath,
                    filename: selectedFile,
                    targetThreadID: targetGroupID,
                    authorID: senderID,
                    members: membersToAdd,
                    currentIndex: 0,
                    addedCount: 0,
                    failedCount: 0,
                    startTime: null,
                    requestThreadID: threadID
                });
                
                saveQueue();
                
                const importType = isFriendImport ? "friend import" : "import";
                api.sendMessage(
                    `✅ Added "${selectedFile}" to ${importType} queue for ${targetGroupName}!\n\n` +
                    `📊 Members to add: ${membersToAdd.length}\n` +
                    `⚡ Random batch mode: 2-7 members every 20-70 seconds\n` +
                    `📌 Use /box queue to check status`,
                    threadID, messageID
                );
                
                if (!isImportRunning) {
                    processImportQueue(api);
                }
                return;
            }
        }
    }
};

module.exports.run = async function ({ api, event, args, Threads }) {
    const { threadID, messageID, senderID } = event;
    
    const isBotAdmin = global.config.ADMINBOT.includes(senderID);
    
    if (!isBotAdmin) return;
    
    // ========== QUEUE STATUS ==========
    if (args[0] === "queue") {
        let msg = `📋 QUEUE STATUS\n━━━━━━━━━━━━━━━━━━━━\n`;
        
        if (importQueue.length === 0) {
            msg += `\n✅ No tasks in queue.`;
        }
        
        if (importQueue.length > 0) {
            msg += `\n📥 IMPORT QUEUE (${importQueue.length}):\n`;
            for (let i = 0; i < importQueue.length; i++) {
                const task = importQueue[i];
                const percent = task.currentIndex ? Math.floor((task.currentIndex / task.members.length) * 100) : 0;
                msg += `   ${i+1}. 📦 ${task.filename}\n`;
                msg += `      📊 Progress: ${task.currentIndex || 0}/${task.members.length} (${percent}%)\n`;
                msg += `      ✅ Added: ${task.addedCount || 0}\n`;
                msg += `      ❌ Failed: ${task.failedCount || 0}\n`;
                if (task.currentIndex && task.currentIndex < task.members.length) {
                    msg += `      ⏱️ Status: Running (random batch mode)\n`;
                } else {
                    msg += `      ⏱️ Status: Waiting\n`;
                }
            }
        }
        
        msg += `\n━━━━━━━━━━━━━━━━━━━━\n💡 Reply with: stop import [number]`;
        
        api.sendMessage(msg, threadID, (error, info) => {
            if (!error) {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    type: "queue_action",
                    exportData: { items: [] }
                });
            }
        }, messageID);
        return;
    }
    
    // ========== ACTIVE LIST ==========
    if (args[0] === "active" && args[1] === "list") {
        try {
            var data = await api.getThreadList(500, null, ["INBOX"]);
            let groups = [];
            
            for (const thread of data) {
                if (thread.isGroup == true && thread.isSubscribed == true) {
                    let memberCount = 0;
                    let male = 0, female = 0, unknown = 0;
                    
                    try {
                        const fullInfo = await api.getThreadInfo(thread.threadID);
                        memberCount = fullInfo.participantIDs ? fullInfo.participantIDs.length : 0;
                        if (fullInfo.userInfo) {
                            for (let user of fullInfo.userInfo) {
                                if (user.gender === "MALE") male++;
                                else if (user.gender === "FEMALE") female++;
                                else unknown++;
                            }
                        }
                    } catch(e) {
                        memberCount = thread.participantIDs ? thread.participantIDs.length : 0;
                    }
                    
                    groups.push({
                        id: thread.threadID,
                        name: thread.name || "Unknown",
                        messageCount: thread.messageCount || 0,
                        memberCount: memberCount,
                        male: male,
                        female: female,
                        unknown: unknown
                    });
                }
            }
            
            if (groups.length === 0) {
                return api.sendMessage("❌ Bot is not in any group!", threadID, messageID);
            }
            
            groups.sort((a, b) => b.messageCount - a.messageCount);
            
            let msg = `📦 ACTIVE GROUPS LIST\n━━━━━━━━━━━━━━━━━━━━\n`;
            msg += `📊 Total: ${groups.length} groups\n`;
            msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            for (let i = 0; i < groups.length; i++) {
                const existing = getFilePathByGroupId(groups[i].id);
                const hasExport = existing ? "✅" : "❌";
                
                msg += `${i+1}. 📛 ${groups[i].name}\n`;
                msg += `   🆔 ${groups[i].id}\n`;
                msg += `   💬 ${groups[i].messageCount} msgs\n`;
                msg += `   👥 Members: ${groups[i].memberCount}\n`;
                msg += `      👨 Male: ${groups[i].male}\n`;
                msg += `      👩 Female: ${groups[i].female}\n`;
                msg += `      ❓ Unknown: ${groups[i].unknown}\n`;
                msg += `   📁 Exported: ${hasExport}\n`;
                msg += `   ───────────────────\n`;
            }
            
            msg += `\n💡 Reply with a number to export/update members of that group (1 API call only)`;
            
            api.sendMessage(msg, threadID, (error, info) => {
                if (!error) {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID,
                        type: "active_list_export",
                        groups: groups
                    });
                }
            }, messageID);
            
        } catch (e) {
            console.log(e);
            return api.sendMessage("❌ Error fetching group list.", threadID, messageID);
        }
        return;
    }
    
    // ========== FILE LIST ==========
    if (args[0] === "file" && args[1] === "list") {
        try {
            const files = fs.readdirSync(exportPath).filter(f => f.endsWith(".json"));
            if (files.length === 0) {
                return api.sendMessage("📁 No exported files found.\n\nUse /box active list to export group members first.", threadID, messageID);
            }
            
            let msg = `📁 EXPORTED FILES LIST\n━━━━━━━━━━━━━━━━━━━━\n📊 Total: ${files.length} files\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            for (let i = 0; i < files.length; i++) {
                const filepath = exportPath + files[i];
                try {
                    const content = await fs.readFileSync(filepath, "utf8");
                    const data = JSON.parse(content);
                    msg += `${i+1}. 📛 ${data.groupName}\n`;
                    msg += `   🆔 ${data.groupId}\n`;
                    msg += `   📅 ${data.exportedAt}\n`;
                    msg += `   👥 ${data.totalMembers} members (IDs only)\n`;
                    msg += `   📦 ${files[i]}\n`;
                    msg += `   ───────────────────\n`;
                } catch(e) {
                    msg += `${i+1}. 📦 ${files[i]}\n`;
                    msg += `   ───────────────────\n`;
                }
            }
            
            msg += `\n💡 Commands:\n   • show id [num] - Show all member IDs\n   • create [num] [name] - Create new group\n   • import [num] - Add all members to current group\n   • import [num] [groupID] - Add all members to specific group\n   • fimport [num] - Add only FRIENDS to current group\n   • fimport [num] [groupID] - Add only FRIENDS to specific group\n   • delete [num] - Delete file\n   • delete all - Delete all files\n\n📌 /box queue - Check import progress`;
            
            api.sendMessage(msg, threadID, (error, info) => {
                if (!error) {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID,
                        type: "file_list_action",
                        exportData: { files: files }
                    });
                }
            }, messageID);
        } catch (e) {
            console.log(e);
            return api.sendMessage("❌ Error reading files.", threadID, messageID);
        }
        return;
    }
    
    // ========== HELP ==========
    else {
        return api.sendMessage(
            `📖 BOX MANAGEMENT\n━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📦 /box active list - Show groups\n   Reply number - Export (1 API call, safe)\n\n` +
            `📁 /box file list - Show exported files\n   show id | create | import | fimport | delete\n\n` +
            `📋 /box queue - Check import progress\n   stop import [num] - Stop a task\n\n` +
            `⚡ Features:\n   • Export: 1 API call for all members (safe)\n   • Import: Random batch mode (2-7 members)\n   • fimport: Import only friends of current bot\n   • Random delays (20-70 seconds between batches)\n   • Auto-skip existing members\n   • Resume after bot restart\n\n` +
            `👑 Bot Admins only`,
            threadID, messageID
        );
    }
};