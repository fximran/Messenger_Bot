const fs = require("fs-extra");
const request = require("request");
const axios = require("axios");

module.exports.config = {
    name: "alert",
    version: "1.0.2",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Create an emergency alert style image from text (supports Bangla)",
    commandCategory: "image",
    usages: "[text]",
    cooldowns: 0,
    dependencies: {
        "fs-extra": "",
        "request": ""
    }
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    
    if (args.length === 0) {
        return api.sendMessage("Please add text to create alert image.\nExample: /alert Hello World", threadID, messageID);
    }
    
    let text = args.join(" ");
    
    // Special handling for Bangla/Unicode text
    // Using encodeURIComponent for proper encoding
    const encodedText = encodeURIComponent(text);
    
    const imagePath = __dirname + "/cache/alert.png";
    
    // Try multiple APIs for better Bangla support
    const apis = [
        `https://api.popcat.xyz/alert?text=${encodedText}`,
        `https://some-api.com/alert?text=${encodedText}` // Backup if needed
    ];
    
    const sendImage = () => {
        if (fs.existsSync(imagePath)) {
            api.sendMessage({
                body: `⚠️ ALERT: ${text}`,
                attachment: fs.createReadStream(imagePath)
            }, threadID, () => {
                fs.unlinkSync(imagePath);
            }, messageID);
        } else {
            api.sendMessage("Failed to generate alert image. Please try again.", threadID, messageID);
        }
    };
    
    try {
        // Use axios for better handling
        const response = await axios({
            method: 'get',
            url: apis[0],
            responseType: 'stream'
        });
        
        const writer = fs.createWriteStream(imagePath);
        response.data.pipe(writer);
        
        writer.on('finish', sendImage);
        writer.on('error', (err) => {
            console.error("Write error:", err);
            api.sendMessage("Error generating image. Please try again.", threadID, messageID);
        });
        
    } catch (error) {
        console.error("API Error:", error);
        api.sendMessage("API is currently busy. Please try again later.", threadID, messageID);
    }
};