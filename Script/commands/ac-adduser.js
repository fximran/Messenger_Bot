const axios = require("axios");

module.exports.config = {
    name: "adduser",
    version: "3.1.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Add user to the group by ID or profile link",
    commandCategory: "group",
    usages: "[id] or [profile link]",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const botID = api.getCurrentUserID();
    
    if (!args[0]) {
        return api.sendMessage("❌ Please enter a user ID or profile link.\n\nExample:\n/adduser 100008446090941\n/adduser https://facebook.com/username", threadID, messageID);
    }
    
    // Get thread info
    const threadInfo = await api.getThreadInfo(threadID);
    const participantIDs = threadInfo.participantIDs.map(e => String(e));
    const adminIDs = threadInfo.adminIDs.map(e => String(e.id));
    const isBotAdmin = adminIDs.includes(String(botID));
    const approvalMode = threadInfo.approvalMode;
    
    if (!isBotAdmin) {
        return api.sendMessage("❌ Bot needs to be group admin to add members!", threadID, messageID);
    }
    
    // Function to extract ID from any Facebook link
    async function getUserIdFromLink(link) {
        try {
            // Clean the link
            let cleanLink = link.trim();
            
            // Case 1: Already a numeric ID
            if (/^\d+$/.test(cleanLink)) {
                return cleanLink;
            }
            
            // Case 2: Extract ID from profile.php?id=123456789
            const idMatch = cleanLink.match(/[?&]id=(\d+)/);
            if (idMatch && idMatch[1]) {
                return idMatch[1];
            }
            
            // Case 3: Extract numeric ID from URL (10+ digits)
            const numericMatch = cleanLink.match(/\b(\d{10,})\b/);
            if (numericMatch && numericMatch[1]) {
                return numericMatch[1];
            }
            
            // Case 4: Extract username from facebook.com/username
            const usernameMatch = cleanLink.match(/(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:mbasic\.)?facebook\.com\/(?:profile\.php\?.*?&)?([^\/?#&]+)/);
            if (usernameMatch && usernameMatch[1]) {
                let username = usernameMatch[1];
                // Skip common non-username strings
                if (username === "profile.php" || username === "photo.php" || username === "videos" || username === "groups") {
                    // Try to find any numeric ID in the link
                    const anyNumeric = cleanLink.match(/\d{10,}/);
                    if (anyNumeric) return anyNumeric[0];
                    return null;
                }
                
                // Try to get ID from username using multiple methods
                try {
                    // Method 1: Graph API
                    const graphResponse = await axios.get(`https://graph.facebook.com/${username}?access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { timeout: 10000 });
                    if (graphResponse.data && graphResponse.data.id) {
                        return graphResponse.data.id;
                    }
                } catch(e) {}
                
                try {
                    // Method 2: Facebook mobile page scrape
                    const mobileResponse = await axios.get(`https://mbasic.facebook.com/${username}`, { 
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36'
                        }
                    });
                    const idMatchFromPage = mobileResponse.data.match(/"userID":"(\d+)"/);
                    if (idMatchFromPage && idMatchFromPage[1]) {
                        return idMatchFromPage[1];
                    }
                } catch(e) {}
            }
            
            // Case 5: Try to find any Facebook ID in the entire string
            const fbIdMatch = cleanLink.match(/[0-9]{15,}/);
            if (fbIdMatch) return fbIdMatch[0];
            
            return null;
        } catch(e) {
            console.log("Extract error:", e);
            return null;
        }
    }
    
    // Get target user ID
    let targetId = args[0];
    
    // Check if input is a link (contains facebook.com or fb.com)
    if (targetId.includes("facebook.com") || targetId.includes("fb.com") || targetId.includes("fb.me")) {
        api.sendMessage("⏳ Extracting user ID from link, please wait...", threadID, messageID);
        
        const extractedId = await getUserIdFromLink(targetId);
        if (extractedId) {
            targetId = extractedId;
        } else {
            return api.sendMessage("❌ Could not extract user ID from the link.\n\nPlease provide a numeric ID instead.\nExample: /adduser 100008446090941", threadID, messageID);
        }
    }
    
    // Validate ID
    if (!/^\d+$/.test(targetId)) {
        return api.sendMessage("❌ Invalid user ID! Please provide a valid numeric ID or profile link.", threadID, messageID);
    }
    
    // Check if user is already in group
    if (participantIDs.includes(targetId)) {
        return api.sendMessage(`⚠️ User is already in the group!`, threadID, messageID);
    }
    
    // Check if trying to add bot itself
    if (targetId === botID) {
        return api.sendMessage(`❌ Bot is already here!`, threadID, messageID);
    }
    
    // Get user name for response
    let userName = "User";
    try {
        const userInfo = await api.getUserInfo(targetId);
        if (userInfo && userInfo[targetId]) {
            userName = userInfo[targetId].name;
        }
    } catch(e) {}
    
    // Add user to group
    try {
        await api.addUserToGroup(targetId, threadID);
        
        if (approvalMode === true && !adminIDs.includes(botID)) {
            return api.sendMessage(`✅ Added ${userName} to approval list!\nThey will join once an admin approves.`, threadID, messageID);
        } else {
            return api.sendMessage(`✅ Added ${userName} to the group!`, threadID, messageID);
        }
    } catch (error) {
        console.log("Adduser error:", error);
        let errorMsg = "❌ Failed to add user to group.";
        
        if (error.message && error.message.includes("limit")) {
            errorMsg = "❌ Group is full! Cannot add more members.";
        } else if (error.message && error.message.includes("privacy")) {
            errorMsg = "❌ Cannot add user due to privacy settings.";
        } else if (error.message && error.message.includes("blocked")) {
            errorMsg = "❌ User has blocked the bot or vice versa.";
        }
        
        return api.sendMessage(errorMsg, threadID, messageID);
    }
};