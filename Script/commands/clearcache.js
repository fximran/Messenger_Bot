const fs = require("fs-extra");
const { writeFileSync, readdirSync, existsSync, unlinkSync } = fs;

module.exports.config = {
    name: "clearcache",
    version: "1.0.0",
    hasPermssion: 1,
    credits: "MQL1 Community",
    description: "Delete cache files by extension",
    commandCategory: "system",
    usages: "[extension]",
    cooldowns: 2
};

module.exports.run = async function ({ event, api, args }) {
    const { threadID, messageID, senderID } = event;
    const cachePath = __dirname + '/cache';
    
    if (!args[0]) {
        return api.sendMessage(
            "📁 Cache Cleaner\n\n" +
            "Usage: /clearcache [extension]\n\n" +
            "Examples:\n" +
            "• /clearcache png - Delete all .png files\n" +
            "• /clearcache mp4 - Delete all .mp4 files\n" +
            "• /clearcache json - Delete all .json files\n" +
            "• /clearcache jpg - Delete all .jpg files\n\n" +
            "⚠️ Note: Only group admins can use this command.",
            threadID, messageID
        );
    }
    
    const extension = args[0].toLowerCase();
    const listFile = readdirSync(cachePath).filter(item => item.endsWith("." + extension));
    
    if (listFile.length === 0) {
        return api.sendMessage(`❌ No .${extension} files found in cache folder.`, threadID, messageID);
    }
    
    let fileList = "";
    for (let i = 0; i < listFile.length; i++) {
        fileList += `• ${listFile[i]}\n`;
    }
    
    api.sendMessage(
        `📁 Found ${listFile.length} .${extension} file(s):\n\n${fileList}\n\n` +
        `⚠️ Reply with "Y" to delete all these files, or "N" to cancel.`,
        threadID,
        (error, info) => {
            if (error) console.log(error);
            global.client.handleReply.push({
                step: 0,
                name: this.config.name,
                extension: extension,
                fileList: listFile,
                messageID: info.messageID,
                author: senderID
            });
        },
        messageID
    );
};

module.exports.handleReply = async function ({ event, api, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    const { author, extension, fileList } = handleReply;
    
    if (author !== senderID) return;
    
    if (body.toUpperCase() === "Y") {
        const cachePath = __dirname + '/cache';
        let deleted = 0;
        
        for (const file of fileList) {
            try {
                unlinkSync(cachePath + '/' + file);
                deleted++;
            } catch (err) {
                console.log(`Failed to delete ${file}:`, err);
            }
        }
        
        return api.sendMessage(
            `✅ Successfully deleted ${deleted} .${extension} file(s) from cache.`,
            threadID, messageID
        );
    } else {
        return api.sendMessage(`❌ Deletion cancelled. No files were deleted.`, threadID, messageID);
    }
};