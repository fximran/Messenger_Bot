const fs = require("fs-extra");
const moment = require("moment-timezone");

module.exports.config = {
    name: "box",
    version: "3.0.0",
    hasPermssion: 2,
    credits: "MQL1 Community",
    description: "Auto background import/export group members",
    commandCategory: "Admin",
    usages: "active list | file list | export [num] | show id [num] | show info [num] | create [num] [name] | import [num] | queue | stop import/export [num]",
    cooldowns: 5
};

// Path to store exported files
const exportPath = __dirname + "/cache/box_exports/";

// Ensure export directory exists
if (!fs.existsSync(exportPath)) {
    fs.mkdirSync(exportPath, { recursive: true });
}

// ========== QUEUE SYSTEM ==========
let importQueue = [];
let exportQueue = [];
let isImportRunning = false;
let isExportRunning = false;

// Save queue state to file
const queuePath = __dirname + "/cache/box_queue.json";

function saveQueue() {
    const queueData = {
        importQueue,
        exportQueue,
        isImportRunning,
        isExportRunning
    };
    fs.writeFileSync(queuePath, JSON.stringify(queueData, null, 2));
}

function loadQueue() {
    if (fs.existsSync(queuePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(queuePath, "utf8"));
            importQueue = data.importQueue || [];
            exportQueue = data.exportQueue || [];
            isImportRunning = data.isImportRunning || false;
            isExportRunning = data.isExportRunning || false;
        } catch(e) {}
    }
}

loadQueue();

// ========== AUTO IMPORT PROCESSOR ==========
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
            const { filepath, filename, targetThreadID, authorID, members, currentIndex, addedCount, failedCount, startTime } = task;
            
            // Initialize task if first time
            if (!task.currentIndex) {
                task.currentIndex = 0;
                task.addedCount = 0;
                task.failedCount = 0;
                task.startTime = Date.now();
                
                // Notify start
                api.sendMessage(`🔄 Started background import from "${filename}"\n📊 Total: ${members.length} members\n⏱️ Will add 1 member every 10 seconds`, targetThreadID);
            }
            
            // Process one member
            if (task.currentIndex < members.length) {
                const uid = members[task.currentIndex];
                
                // Check if already in group
                const threadInfo = await api.getThreadInfo(targetThreadID);
                if (!threadInfo.participantIDs.includes(uid)) {
                    try {
                        await api.addUserToGroup(uid, targetThreadID);
                        task.addedCount++;
                    } catch(e) {
                        task.failedCount++;
                    }
                } else {
                    task.addedCount++; // Already in group
                }
                
                task.currentIndex++;
                
                // Update queue
                importQueue[0] = task;
                saveQueue();
                
                // Send progress update every 50 members
                if (task.currentIndex % 50 === 0 || task.currentIndex === members.length) {
                    const percent = Math.floor((task.currentIndex / members.length) * 100);
                    api.sendMessage(`📊 Import progress: ${task.currentIndex}/${members.length} (${percent}%)\n✅ Added: ${task.addedCount}\n❌ Failed: ${task.failedCount}`, targetThreadID);
                }
                
                // Wait 10 seconds before next member
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
            
            // Task complete
            if (task.currentIndex >= members.length) {
                const elapsed = Math.floor((Date.now() - task.startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                
                api.sendMessage(
                    `✅ IMPORT COMPLETED!\n\n` +
                    `📛 File: ${filename}\n` +
                    `📊 Total: ${members.length} members\n` +
                    `✅ Added: ${task.addedCount}\n` +
                    `❌ Failed: ${task.failedCount}\n` +
                    `⏱️ Time taken: ${minutes}m ${seconds}s`,
                    targetThreadID
                );
                
                importQueue.shift(); // Remove completed task
                saveQueue();
            }
            
        } catch (error) {
            console.log("Import error:", error);
            api.sendMessage(`❌ Import failed for "${task.filename}": ${error.message}`, task.targetThreadID);
            importQueue.shift();
            saveQueue();
        }
    }
    
    isImportRunning = false;
    saveQueue();
}

// ========== AUTO EXPORT PROCESSOR ==========
async function processExportQueue(api) {
    if (exportQueue.length === 0) {
        isExportRunning = false;
        saveQueue();
        return;
    }
    
    if (isExportRunning) return;
    isExportRunning = true;
    saveQueue();
    
    while (exportQueue.length > 0) {
        const task = exportQueue[0];
        
        try {
            const { groupId, groupName, authorID, threadID, totalMembers, currentIndex, membersData, existingMemberIds, startTime } = task;
            
            // Initialize task if first time
            if (!task.currentIndex) {
                task.currentIndex = 0;
                task.membersData = [];
                task.existingMemberIds = new Set();
                task.startTime = Date.now();
                
                // Check if group already has export file
                const existing = getFilePathByGroupId(groupId);
                if (existing) {
                    for (const m of existing.data.members) {
                        task.existingMemberIds.add(m.id);
                        task.membersData.push(m);
                    }
                }
                
                api.sendMessage(`🔄 Started background export for "${groupName}"\n📊 Total members to process: ${totalMembers}\n⏱️ Will process 1 member every 5 seconds`, threadID);
            }
            
            // Get thread info to fetch participants
            const threadInfo = await api.getThreadInfo(groupId);
            const participants = threadInfo.participantIDs || [];
            const adminIds = threadInfo.adminIDs ? threadInfo.adminIDs.map(a => a.id) : [];
            
            // Process one member at current index
            if (task.currentIndex < participants.length) {
                const uid = participants[task.currentIndex];
                
                try {
                    const userInfo = await api.getUserInfo(uid);
                    const user = userInfo[uid];
                    
                    let gender = "Not specified";
                    if (user.gender === 1) gender = "Female";
                    else if (user.gender === 2) gender = "Male";
                    
                    const isAdmin = adminIds.includes(uid);
                    
                    const memberInfo = {
                        id: uid,
                        name: user.name || "Unknown",
                        username: user.vanity || "No username",
                        gender: gender,
                        isAdmin: isAdmin
                    };
                    
                    if (!task.existingMemberIds.has(uid)) {
                        task.membersData.push(memberInfo);
                        task.existingMemberIds.add(uid);
                    } else {
                        // Update existing member info
                        const index = task.membersData.findIndex(m => m.id === uid);
                        if (index !== -1) {
                            task.membersData[index] = memberInfo;
                        }
                    }
                } catch(e) {
                    if (!task.existingMemberIds.has(uid)) {
                        task.membersData.push({
                            id: uid,
                            name: "Unknown",
                            username: "Unknown",
                            gender: "Unknown",
                            isAdmin: false
                        });
                        task.existingMemberIds.add(uid);
                    }
                }
                
                task.currentIndex++;
                exportQueue[0] = task;
                saveQueue();
                
                // Send progress update every 100 members
                if (task.currentIndex % 100 === 0 || task.currentIndex === participants.length) {
                    const percent = Math.floor((task.currentIndex / participants.length) * 100);
                    api.sendMessage(`📊 Export progress: ${task.currentIndex}/${participants.length} (${percent}%)\n📝 Members processed: ${task.membersData.length}`, threadID);
                }
                
                // Wait 5 seconds before next member
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            // Task complete - save file
            if (task.currentIndex >= participants.length) {
                const result = await saveOrUpdateExport(groupId, groupName, task.membersData);
                const elapsed = Math.floor((Date.now() - task.startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                
                api.sendMessage(
                    `✅ EXPORT COMPLETED!\n\n` +
                    `📛 Group: ${groupName}\n` +
                    `🆔 ID: ${groupId}\n` +
                    `📦 File: ${result.filename}\n` +
                    `👥 Total Members: ${task.membersData.length}\n` +
                    `⏱️ Time taken: ${minutes}m ${seconds}s\n\n` +
                    `💡 Use /box file list to see all exported files.`,
                    threadID
                );
                
                exportQueue.shift(); // Remove completed task
                saveQueue();
            }
            
        } catch (error) {
            console.log("Export error:", error);
            api.sendMessage(`❌ Export failed for "${task.groupName}": ${error.message}`, task.threadID);
            exportQueue.shift();
            saveQueue();
        }
    }
    
    isExportRunning = false;
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
        const parts = body.toLowerCase().split(" ");
        const taskType = parts[1]; // "import" or "export"
        const taskNum = parseInt(parts[2]);
        
        if (!taskType || (taskType !== "import" && taskType !== "export")) {
            return api.sendMessage(
                `❌ Please specify type!\n\n` +
                `Examples:\n` +
                `• stop import 1 - Stop import task #1\n` +
                `• stop export 1 - Stop export task #1`,
                threadID, messageID
            );
        }
        
        if (isNaN(taskNum) || taskNum < 1) {
            return api.sendMessage(`❌ Invalid number!`, threadID, messageID);
        }
        
        if (taskType === "import") {
            if (taskNum > importQueue.length) {
                return api.sendMessage(`❌ Import task #${taskNum} not found! Only ${importQueue.length} import task(s) in queue.`, threadID, messageID);
            }
            const task = importQueue[taskNum - 1];
            importQueue.splice(taskNum - 1, 1);
            saveQueue();
            return api.sendMessage(`✅ Stopped import: ${task.filename}`, threadID, messageID);
            
        } else if (taskType === "export") {
            if (taskNum > exportQueue.length) {
                return api.sendMessage(`❌ Export task #${taskNum} not found! Only ${exportQueue.length} export task(s) in queue.`, threadID, messageID);
            }
            const task = exportQueue[taskNum - 1];
            exportQueue.splice(taskNum - 1, 1);
            saveQueue();
            return api.sendMessage(`✅ Stopped export: ${task.groupName}`, threadID, messageID);
        }
    }
    
    // ========== DELETE FILE ==========
    if (isDeleteFile && type === "file_list_action") {
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
        if (isNaN(num) || num < 1 || num > groups.length) {
            return api.sendMessage(`❌ Invalid number! Please reply with a valid group number.`, threadID, messageID);
        }
        
        const selectedGroup = groups[num - 1];
        
        // Check if already in queue
        const alreadyInQueue = exportQueue.some(q => q.groupId === selectedGroup.id);
        if (alreadyInQueue) {
            return api.sendMessage(`⚠️ "${selectedGroup.name}" is already in the export queue!`, threadID, messageID);
        }
        
        const threadInfo = await api.getThreadInfo(selectedGroup.id);
        const participants = threadInfo.participantIDs || [];
        
        exportQueue.push({
            groupId: selectedGroup.id,
            groupName: selectedGroup.name,
            authorID: senderID,
            threadID: threadID,
            totalMembers: participants.length,
            currentIndex: 0,
            membersData: [],
            existingMemberIds: new Set(),
            startTime: null
        });
        
        saveQueue();
        
        api.sendMessage(
            `✅ Added "${selectedGroup.name}" to export queue!\n\n` +
            `📊 Total members: ${participants.length}\n` +
            `⏱️ Will process 1 member every 5 seconds\n` +
            `📌 Use /box queue to check status`,
            threadID, messageID
        );
        
        // Start processor if not running
        if (!isExportRunning) {
            processExportQueue(api);
        }
        return;
    }
    
    // ========== FILE LIST ACTIONS (show id, show info, create, import) ==========
    else if (type === "file_list_action") {
        const isShowId = body.toLowerCase().includes("show id") || body.toLowerCase().includes("showid");
        const isShowInfo = body.toLowerCase().includes("show info") || body.toLowerCase().includes("showinfo");
        const isCreate = body.toLowerCase().includes("create");
        const isImport = body.toLowerCase().includes("import");
        
        if (!isShowId && !isShowInfo && !isCreate && !isImport) {
            return api.sendMessage(`❌ Invalid command!`, threadID, messageID);
        }
        
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
        
        // SHOW ID
        if (isShowId) {
            let idList = "";
            for (let i = 0; i < data.members.length; i++) {
                idList += data.members[i].id + " ";
            }
            const msg = `📋 MEMBERS ID LIST\n━━━━━━━━━━━━━━━━━━━━\n📛 ${data.groupName}\n👥 Total: ${data.totalMembers}\n━━━━━━━━━━━━━━━━━━━━\n\n${idList.trim()}`;
            return api.sendMessage(msg, threadID, messageID);
        }
        
        // SHOW INFO
        if (isShowInfo) {
            let msg = `📋 MEMBERS FULL INFO\n━━━━━━━━━━━━━━━━━━━━\n📛 ${data.groupName}\n👥 Total: ${data.totalMembers}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            for (let i = 0; i < data.members.length; i++) {
                const m = data.members[i];
                msg += `👤 ${i+1}. ${m.name}\n   🆔 ${m.id}\n   📛 @${m.username}\n   ⚧ ${m.gender}\n   ───────────────────\n`;
            }
            return api.sendMessage(msg, threadID, messageID);
        }
        
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
        
        // IMPORT TO CURRENT GROUP
        if (isImport) {
            const currentGroupInfo = await api.getThreadInfo(threadID);
            const currentMembers = currentGroupInfo.participantIDs || [];
            const isBotAdmin = currentGroupInfo.adminIDs.some(a => a.id == api.getCurrentUserID());
            
            if (!isBotAdmin) {
                return api.sendMessage(`❌ Bot needs to be admin in this group!`, threadID, messageID);
            }
            
            const membersToAdd = [];
            const botId = api.getCurrentUserID();
            
            for (const member of data.members) {
                if (!currentMembers.includes(member.id) && member.id !== botId) {
                    membersToAdd.push(member.id);
                }
            }
            
            if (membersToAdd.length === 0) {
                return api.sendMessage(`❌ No new members to add!`, threadID, messageID);
            }
            
            // Check if already in queue
            const alreadyInQueue = importQueue.some(q => q.filename === selectedFile);
            if (alreadyInQueue) {
                return api.sendMessage(`⚠️ "${selectedFile}" is already in the import queue!`, threadID, messageID);
            }
            
            importQueue.push({
                filepath: filepath,
                filename: selectedFile,
                targetThreadID: threadID,
                authorID: senderID,
                members: membersToAdd,
                currentIndex: 0,
                addedCount: 0,
                failedCount: 0,
                startTime: null
            });
            
            saveQueue();
            
            api.sendMessage(
                `✅ Added "${selectedFile}" to import queue!\n\n` +
                `📊 Members to add: ${membersToAdd.length}\n` +
                `⏱️ Will add 1 member every 10 seconds\n` +
                `📌 Use /box queue to check status`,
                threadID, messageID
            );
            
            if (!isImportRunning) {
                processImportQueue(api);
            }
            return;
        }
    }
};

module.exports.run = async function ({ api, event, args, Threads }) {
    const { threadID, messageID, senderID } = event;
    
    const isBotAdmin = global.config.ADMINBOT.includes(senderID);
    if (!isBotAdmin) {
        return api.sendMessage("❌ Bot Admins only!", threadID, messageID);
    }
    
    // ========== QUEUE STATUS ==========
    if (args[0] === "queue") {
        let msg = `📋 QUEUE STATUS\n━━━━━━━━━━━━━━━━━━━━\n`;
        
        if (importQueue.length === 0 && exportQueue.length === 0) {
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
                    msg += `      ⏱️ Status: Running\n`;
                } else {
                    msg += `      ⏱️ Status: Waiting\n`;
                }
            }
        }
        
        if (exportQueue.length > 0) {
            msg += `\n📤 EXPORT QUEUE (${exportQueue.length}):\n`;
            for (let i = 0; i < exportQueue.length; i++) {
                const task = exportQueue[i];
                const percent = task.currentIndex ? Math.floor((task.currentIndex / task.totalMembers) * 100) : 0;
                msg += `   ${i+1}. 📛 ${task.groupName}\n`;
                msg += `      📊 Progress: ${task.currentIndex || 0}/${task.totalMembers} (${percent}%)\n`;
                msg += `      📝 Members: ${task.membersData?.length || 0}\n`;
                if (task.currentIndex && task.currentIndex < task.totalMembers) {
                    msg += `      ⏱️ Status: Running\n`;
                } else {
                    msg += `      ⏱️ Status: Waiting\n`;
                }
            }
        }
        
        msg += `\n━━━━━━━━━━━━━━━━━━━━\n💡 Reply with:\n   stop import [number]\n   stop export [number]`;
        
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
                    let fullInfo = null;
                    let memberCount = 0;
                    let male = 0, female = 0, unknown = 0;
                    
                    try {
                        fullInfo = await api.getThreadInfo(thread.threadID);
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
            
            msg += `\n💡 Reply with a number (e.g., "1") or "export 1" to export/update members of a group`;
            
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
                    msg += `   👥 ${data.totalMembers} members\n`;
                    msg += `   📦 ${files[i]}\n`;
                    msg += `   ───────────────────\n`;
                } catch(e) {
                    msg += `${i+1}. 📦 ${files[i]}\n`;
                    msg += `   ───────────────────\n`;
                }
            }
            
            msg += `\n💡 Commands:\n   • show id [num] - Show only IDs (one line)\n   • show info [num] - Show full info\n   • create [num] [name] - Create new group\n   • import [num] - Add members to current group\n   • delete [num] - Delete file\n   • delete all - Delete all files\n\n📌 /box queue - Check background tasks`;
            
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
            `📦 /box active list - Show groups\n   Reply number - Export (background)\n\n` +
            `📁 /box file list - Show files\n   show id/info | create | import | delete\n\n` +
            `📋 /box queue - Check background tasks\n   stop import/export [num] - Stop a task\n\n` +
            `⚡ Features:\n   • Background import (1 member/10 sec)\n   • Background export (1 member/5 sec)\n   • Other commands work during tasks\n   • Resume after bot restart\n\n` +
            `👑 Bot Admins only`,
            threadID, messageID
        );
    }
};