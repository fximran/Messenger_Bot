const fs = require("fs-extra");
const moment = require("moment-timezone");

module.exports.config = {
    name: "fbbox",
    version: "1.1.0",
    hasPermssion: 2,
    credits: "MQL1 Community",
    description: "Export or add user IDs to box_exports files",
    commandCategory: "Admin",
    usages: "export <GroupName> <IDs> | add <FileNumber> <IDs>",
    cooldowns: 5
};

// Same export path as box.js
const exportPath = __dirname + "/cache/box_exports/";
if (!fs.existsSync(exportPath)) {
    fs.mkdirSync(exportPath, { recursive: true });
}

// Helper: Extract IDs from various formats (space, comma, newline)
function extractIds(input) {
    const cleaned = input.replace(/[^\d\s,]/g, ' ');
    const parts = cleaned.split(/[\s,]+/).filter(p => p.length >= 10 && /^\d+$/.test(p));
    const uniqueIds = [...new Set(parts)];
    return uniqueIds;
}

// Get sorted list of JSON files
function getSortedFiles() {
    const files = fs.readdirSync(exportPath).filter(f => f.endsWith(".json"));
    files.sort(); // alphabetical sort (same as default readdir in box.js)
    return files;
}

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID, body } = event;
    
    // Permission check
    if (!global.config.ADMINBOT.includes(senderID)) {
        return api.sendMessage("❌ Only bot admins can use this command!", threadID, messageID);
    }

    const cmd = args[0]?.toLowerCase();
    
    // ========== HELP / INVALID ==========
    if (!cmd || (cmd !== "export" && cmd !== "add")) {
        return api.sendMessage(
            `📖 FBBOX COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📌 /fbbox export <GroupName> <ID1 ID2...>\n` +
            `   Save IDs to a new file.\n\n` +
            `📌 /fbbox add <FileNumber> <ID1 ID2...>\n` +
            `   Append IDs to an existing file.\n` +
            `   Use /box file list to see file numbers.\n\n` +
            `💡 IDs can be space/comma/newline separated.`,
            threadID, messageID
        );
    }

    // ========== EXPORT (CREATE NEW FILE) ==========
    if (cmd === "export") {
        const fullCommand = body.trim();
        const exportIndex = fullCommand.toLowerCase().indexOf("export ");
        if (exportIndex === -1) {
            return api.sendMessage("❌ Invalid format!", threadID, messageID);
        }
        
        const afterExport = fullCommand.substring(exportIndex + 7).trim();
        const firstSpaceIndex = afterExport.indexOf(' ');
        if (firstSpaceIndex === -1) {
            return api.sendMessage("❌ Please provide both group name and IDs!", threadID, messageID);
        }
        
        const groupName = afterExport.substring(0, firstSpaceIndex).trim();
        const idsPart = afterExport.substring(firstSpaceIndex + 1).trim();
        
        if (!groupName) {
            return api.sendMessage("❌ Please provide a group name!", threadID, messageID);
        }
        
        if (!idsPart) {
            return api.sendMessage("❌ Please provide at least one ID!", threadID, messageID);
        }
        
        const ids = extractIds(idsPart);
        if (ids.length === 0) {
            return api.sendMessage("❌ No valid Facebook IDs found! IDs should be 10+ digits.", threadID, messageID);
        }
        
        const membersData = ids.map(id => ({ id }));
        const dummyGroupId = "ext_" + Date.now();
        const safeName = groupName.replace(/[\\/:*?"<>|]/g, "_");
        const filename = `${dummyGroupId}_${safeName}.json`;
        const filepath = exportPath + filename;
        
        const exportData = {
            exportedAt: moment().tz("Asia/Dhaka").format("DD/MM/YYYY hh:mm:ss A"),
            groupId: dummyGroupId,
            groupName: groupName,
            totalMembers: membersData.length,
            members: membersData
        };
        
        try {
            fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
            
            const msg = `✅ IDs EXPORTED SUCCESSFULLY!\n━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📛 Group Name: ${groupName}\n` +
                `📦 File: ${filename}\n` +
                `👥 Total IDs: ${membersData.length}\n` +
                `📂 Location: cache/box_exports/\n\n` +
                `💡 Use /box file list to view and import.`;
            
            api.sendMessage(msg, threadID, messageID);
        } catch (e) {
            api.sendMessage(`❌ Failed to save file: ${e.message}`, threadID, messageID);
        }
        return;
    }

    // ========== ADD TO EXISTING FILE ==========
    if (cmd === "add") {
        const files = getSortedFiles();
        if (files.length === 0) {
            return api.sendMessage("❌ No exported files found! Use /fbbox export first.", threadID, messageID);
        }

        // Parse arguments: first arg after "add" is file number, rest is IDs
        if (args.length < 3) {
            return api.sendMessage(
                `❌ Usage: /fbbox add <FileNumber> <ID1 ID2...>\n\n` +
                `Example: /fbbox add 1 61554901547340 100008446090941`,
                threadID, messageID
            );
        }

        const fileNum = parseInt(args[1]);
        if (isNaN(fileNum) || fileNum < 1 || fileNum > files.length) {
            return api.sendMessage(
                `❌ Invalid file number! Valid numbers: 1 - ${files.length}\n` +
                `Use /box file list to see numbers.`,
                threadID, messageID
            );
        }

        // Extract IDs from remaining arguments (join all args after number)
        const idsPart = args.slice(2).join(" ");
        const newIds = extractIds(idsPart);
        if (newIds.length === 0) {
            return api.sendMessage("❌ No valid Facebook IDs found to add!", threadID, messageID);
        }

        const selectedFile = files[fileNum - 1];
        const filepath = exportPath + selectedFile;

        try {
            const fileContent = fs.readFileSync(filepath, "utf8");
            const data = JSON.parse(fileContent);

            // Create a Set of existing IDs for quick lookup
            const existingIds = new Set(data.members.map(m => m.id));
            
            // Track how many actually added (unique)
            let addedCount = 0;
            for (const id of newIds) {
                if (!existingIds.has(id)) {
                    data.members.push({ id });
                    existingIds.add(id);
                    addedCount++;
                }
            }

            if (addedCount === 0) {
                return api.sendMessage(`⚠️ All provided IDs already exist in the file!`, threadID, messageID);
            }

            // Update metadata
            data.totalMembers = data.members.length;
            data.exportedAt = moment().tz("Asia/Dhaka").format("DD/MM/YYYY hh:mm:ss A");

            fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

            const msg = `✅ IDs ADDED SUCCESSFULLY!\n━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📛 Group Name: ${data.groupName}\n` +
                `📦 File: ${selectedFile}\n` +
                `🆕 New IDs added: ${addedCount}\n` +
                `👥 Total IDs now: ${data.totalMembers}\n\n` +
                `💡 Use /box file list to view.`;

            api.sendMessage(msg, threadID, messageID);

        } catch (e) {
            api.sendMessage(`❌ Failed to update file: ${e.message}`, threadID, messageID);
        }
        return;
    }
};