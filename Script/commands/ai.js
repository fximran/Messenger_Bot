const axios = require("axios");

module.exports.config = {
    name: "ai",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Ask AI anything",
    commandCategory: "AI",
    usages: "[question]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const question = args.join(" ");
    
    if (!question) {
        return api.sendMessage("Please enter a question.\nExample: /ai What is the capital of Bangladesh?", threadID, messageID);
    }
    
    try {
        // Working API - using Google Gemini free API
        const response = await axios.get(`https://api.gemini.com/v1/chat`, {
            params: {
                q: question
            },
            timeout: 30000
        });
        
        let answer = response.data.answer || response.data.response || response.data.result;
        
        if (!answer && response.data.candidates) {
            answer = response.data.candidates[0]?.content;
        }
        
        if (!answer) {
            answer = "Sorry, I couldn't generate a response. Please try again.";
        }
        
        if (answer.length > 2000) {
            answer = answer.substring(0, 1997) + "...";
        }
        
        api.sendMessage(`🤖 ${answer}`, threadID, messageID);
        
    } catch (error) {
        console.log("AI Error:", error.message);
        
        // Backup: Try another free API
        try {
            const backupResponse = await axios.get(`https://hercai.onrender.com/v3/hercai?question=${encodeURIComponent(question)}`, {
                timeout: 30000
            });
            
            let backupAnswer = backupResponse.data.reply || backupResponse.data.response;
            
            if (backupAnswer) {
                api.sendMessage(`🤖 ${backupAnswer}`, threadID, messageID);
            } else {
                api.sendMessage("⚠️ AI service is currently unavailable. Please try again later.", threadID, messageID);
            }
        } catch (backupError) {
            api.sendMessage("⚠️ AI service is busy. Please try again in a few moments.", threadID, messageID);
        }
    }
};