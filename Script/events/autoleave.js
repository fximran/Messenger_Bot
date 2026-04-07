module.exports.config = {
    name: "autoleave",
    eventType: ["log:subscribe"],
    version: "1.0.1",
    credits: "MQL1 Community",
    description: "Auto leave group if another NDH bot already exists"
};

module.exports.run = async function ({ api, event, Threads }) {
    const { threadID } = event;
    
    // Check if bot itself was added to the group
    const botAdded = event.logMessageData.addedParticipants.some(
        item => item.userFbId == api.getCurrentUserID()
    );
    
    if (!botAdded) return;
    
    // Get NDH list from config
    const ndhList = global.config.NDH || [];
    
    // If NDH list is empty, do nothing
    if (ndhList.length === 0) return;
    
    try {
        // Get group info
        const threadInfo = await api.getThreadInfo(threadID);
        const participants = threadInfo.participantIDs || [];
        
        // Check if any NDH member is already in the group (excluding current bot)
        const currentBotId = api.getCurrentUserID();
        let foundOtherBot = false;
        let foundBotName = "";
        
        for (const uid of participants) {
            if (ndhList.includes(uid) && uid !== currentBotId) {
                foundOtherBot = true;
                try {
                    const userInfo = await api.getUserInfo(uid);
                    foundBotName = userInfo[uid].name || "Another bot";
                } catch(e) {
                    foundBotName = "Another bot";
                }
                break;
            }
        }
        
        // If found another NDH bot, leave the group
        if (foundOtherBot) {
            const warningMsg = `⚠️ Leaving group...\n\n` +
                              `Detected another bot (${foundBotName}) already in this group.\n` +
                              `Having multiple bots in one group may cause conflicts.\n\n` +
                              `👋 Goodbye!`;
            
            await api.sendMessage(warningMsg, threadID);
            await api.removeUserFromGroup(currentBotId, threadID);
            
            console.log(`[AutoLeave] Left group ${threadID} - Another NDH bot found: ${foundBotName}`);
        }
        
    } catch (error) {
        console.error("[AutoLeave Error]", error);
    }
};