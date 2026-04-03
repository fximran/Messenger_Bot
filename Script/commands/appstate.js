const fs = require("fs-extra");

module.exports.config = {
    name: "appstate",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "MQL1 Community",
    description: "Refresh appstate.json file",
    commandCategory: "Admin",
    usages: "appstate",
    cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
    const { threadID, messageID } = event;
    
    try {
        let appstate = api.getAppState();
        const data = JSON.stringify(appstate, null, 2);
        
        fs.writeFile(`${__dirname}/../../appstate.json`, data, 'utf8', (err) => {
            if (err) {
                console.error("Appstate write error:", err);
                return api.sendMessage(`❌ Error writing appstate: ${err.message}`, threadID, messageID);
            } else {
                return api.sendMessage(`✅ Appstate refreshed successfully!`, threadID, messageID);
            }
        });
        
    } catch (error) {
        console.error("Appstate error:", error);
        return api.sendMessage(`❌ Failed to refresh appstate: ${error.message}`, threadID, messageID);
    }
};