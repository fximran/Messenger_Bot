module.exports.config = {
    name: "newbox",
    version: "4.2.0",
    hasPermssion: 2,
    credits: "MQL1 Community",
    description: "Create a new chat group with members by ID (Creator always included as admin)",
    commandCategory: "Box Chat",
    usages: '/newbox id [ID1] [ID2] | Group Name"',
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    
    let memberIds = [];
    let groupTitle = "";
    
    // Parse command
    let fullCommand = event.body;
    let pipeIndex = fullCommand.indexOf("|");
    
    if (pipeIndex === -1) {
        return api.sendMessage("❌ Please use | to separate members and group name.\n\nExample: /newbox id 100008446090941 | My Group", threadID, messageID);
    }
    
    // Extract members part and group title
    let membersPart = fullCommand.substring(0, pipeIndex).trim();
    groupTitle = fullCommand.substring(pipeIndex + 1).trim();
    
    if (!groupTitle) {
        return api.sendMessage("❌ Please provide a group name after |", threadID, messageID);
    }
    
    // Remove the command prefix
    const prefix = global.config.PREFIX || "/";
    membersPart = membersPart.replace(prefix + "newbox", "").trim();
    
    // Check for "id" keyword and remove it
    if (membersPart.toLowerCase().startsWith("id")) {
        membersPart = membersPart.substring(2).trim();
    }
    
    // Extract all numeric IDs (10+ digits)
    const idMatches = membersPart.match(/\b\d{10,}\b/g);
    if (idMatches) {
        for (const id of idMatches) {
            if (!memberIds.includes(id)) {
                memberIds.push(id);
            }
        }
    }
    
    // Remove duplicates
    memberIds = [...new Set(memberIds)];
    
    // Check if we have at least one member besides creator
    if (memberIds.length === 0) {
        return api.sendMessage(
            "❌ Please provide at least one user ID!\n\n" +
            "How to use:\n" +
            "• /newbox id 123456789 | Group Name\n" +
            "• /newbox id 123456789 987654321 | Group Name\n" +
            "\n💡 Get user ID using: /uid @username",
            threadID, messageID
        );
    }
    
    // ALWAYS add creator to the group (if not already in list)
    if (!memberIds.includes(senderID)) {
        memberIds.unshift(senderID);
    }
    
    // Create group
    try {
        api.sendMessage(`⏳ Creating group "${groupTitle}"...`, threadID, messageID);
        
        // Create the group
        const newGroup = await api.createNewGroup(memberIds, groupTitle);
        
        // Get the new group thread ID
        let newThreadID = null;
        
        if (newGroup && newGroup.threadID) {
            newThreadID = newGroup.threadID;
        } else if (newGroup && newGroup.id) {
            newThreadID = newGroup.id;
        } else if (typeof newGroup === 'string') {
            const match = newGroup.match(/\d+/);
            if (match) newThreadID = match[0];
        }
        
        if (!newThreadID) {
            return api.sendMessage(
                `✅ Group "${groupTitle}" created successfully!\n\n` +
                `⚠️ Could not get group ID. Please check your groups list.\n` +
                `👥 Total members: ${memberIds.length}`,
                threadID, messageID
            );
        }
        
        // Wait for group to be fully created
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Method 1: Try to promote creator to admin
        let promoted = false;
        
        try {
            await api.changeAdminStatus(newThreadID, senderID, true);
            promoted = true;
        } catch(e) {
            console.log("Promote error (method 1):", e);
        }
        
        // Method 2: If method 1 fails, try to add creator as admin via graph API
        if (!promoted) {
            try {
                // Some API versions use different method
                await api.addAdminToGroup(newThreadID, senderID);
                promoted = true;
            } catch(e) {
                console.log("Promote error (method 2):", e);
            }
        }
        
        // Send confirmation
        if (promoted) {
            // Send a welcome message to the new group
            try {
                await api.sendMessage(
                    `🎉 Welcome to "${groupTitle}"!\n\n` +
                    `👑 This group was created by an admin.\n` +
                    `📌 Type ${prefix}help to see available commands.`,
                    newThreadID
                );
            } catch(e) {}
            
            return api.sendMessage(
                `✅ Successfully created new group "${groupTitle}"!\n\n` +
                `👑 You have been made an admin of the group.\n` +
                `👥 Total members: ${memberIds.length}`,
                threadID, messageID
            );
        } else {
            return api.sendMessage(
                `✅ Group "${groupTitle}" created successfully!\n\n` +
                `⚠️ Could not automatically make you admin. Please check the group and manually promote yourself.\n` +
                `👥 Total members: ${memberIds.length}`,
                threadID, messageID
            );
        }
        
    } catch (error) {
        console.log("Create group error:", error);
        
        let errorMsg = "❌ Failed to create group.\n\n";
        
        if (error.message && error.message.includes("can't add")) {
            errorMsg += "Some users cannot be added. Possible reasons:\n" +
                       "• User has blocked the bot\n" +
                       "• User's privacy settings don't allow adding\n" +
                       "• User is not friends with the bot";
        } else if (error.message && error.message.includes("limit")) {
            errorMsg += "Group limit reached or too many members requested.";
        } else {
            errorMsg += `Error: ${error.message || "Unknown error"}`;
        }
        
        return api.sendMessage(errorMsg, threadID, messageID);
    }
};