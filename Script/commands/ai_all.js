const axios = require("axios");

module.exports.config = {
    name: "ai",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Multiple AI Chatbot - Supports: normal, gemini, baby, gpt, minari\nUsage: /ai [type] [question]\nTypes: normal, gemini, baby, gpt, minari",
    commandCategory: "AI",
    usages: "ai [type] [question]",
    cooldowns: 5
};

// Baby AI - Predefined replies
const babyReplies = [
    "Bolo baby 💬", "হুম? বলো 😺", "হ্যাঁ জানু 😚", "শুনছি বেবি 😘",
    "এতো ডেকো না,প্রেম এ পরে যাবো তো🙈", "Boss বল boss😼",
    "আমাকে ডাকলে ,আমি কিন্তু কিস করে দিবো😘",
    "দূরে যা, তোর কোনো কাজ নাই, শুধু bot bot করিস 😉😋🤣",
    "বলো কিরে 😼", "কি জান চাই? 😚"
];

// Minari AI - Custom responses
const minariResponses = {
    "my dear great botmaster": "I made by master 𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭, also known as Priyanshu",
    "my birthplace is": "I live here in Rajasthan, India. What about you?",
    "my favorite anime is": "My favorite anime is Zero no Tsukaima, what about you?",
    "i can't think of any": "I suggest you to watch Boku no Pico, 10/10 wholesome.",
    "i was created by": "I was created by Prince.",
    "i obey": "I obey Prince"
};

// Check if message is baby trigger
function isBabyTrigger(text) {
    if (!text) return false;
    const keywords = ["baby", "bot", "bby", "jan", "xan", "জান", "বট", "বেবি"];
    const lowerText = text.toLowerCase().trim();
    return keywords.some(keyword => lowerText === keyword || lowerText.startsWith(keyword + " "));
}

// Get Minari response
function getMinariResponse(text) {
    const lowerText = text.toLowerCase();
    for (const [key, value] of Object.entries(minariResponses)) {
        if (lowerText.includes(key)) {
            return value;
        }
    }
    return null;
}

// Main run function
module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    
    // Check for message reply
    let question = args.join(" ");
    let aiType = "normal"; // default type
    
    // Check if first argument is a type
    const validTypes = ["normal", "gemini", "baby", "gpt", "minari"];
    if (args[0] && validTypes.includes(args[0].toLowerCase())) {
        aiType = args[0].toLowerCase();
        question = args.slice(1).join(" ");
    }
    
    // If no question and not a reply
    if (!question && event.type !== "message_reply") {
        return api.sendMessage(
            `🤖 AI Chatbot - Multiple Modes\n\n` +
            `📌 Usage:\n` +
            `  • /ai normal [question] - Normal AI\n` +
            `  • /ai gemini [question] - Gemini AI\n` +
            `  • /ai baby [message] - Baby Chat\n` +
            `  • /ai gpt [question] - GPT AI\n` +
            `  • /ai minari [question] - Minari AI\n\n` +
            `💡 Tip: Reply to a message without typing question`,
            threadID, messageID
        );
    }
    
    // Get question from reply if needed
    if (event.type === "message_reply" && !question) {
        question = event.messageReply.body;
    }
    
    if (!question) {
        return api.sendMessage("❓ Please enter a question or message!", threadID, messageID);
    }
    
    // ========== BABY AI ==========
    if (aiType === "baby") {
        const randomReply = babyReplies[Math.floor(Math.random() * babyReplies.length)];
        return api.sendMessage(`👶 ${randomReply}`, threadID, messageID);
    }
    
    // Check for baby trigger in normal mode
    if (aiType === "normal" && isBabyTrigger(question)) {
        const randomReply = babyReplies[Math.floor(Math.random() * babyReplies.length)];
        return api.sendMessage(`👶 ${randomReply}`, threadID, messageID);
    }
    
    // ========== MINARI AI ==========
    if (aiType === "minari") {
        const customResponse = getMinariResponse(question);
        if (customResponse) {
            return api.sendMessage(customResponse, threadID, messageID);
        }
        
        try {
            const Chatbot = require("discord-chatbot");
            const chatbot = new Chatbot({ name: "Minari", gender: "Najimi" });
            const res = await chatbot.chat(question);
            api.sendMessage(res, threadID, messageID);
        } catch (error) {
            api.sendMessage("⚠️ Minari AI is currently unavailable. Please try again.", threadID, messageID);
        }
        return;
    }
    
    // ========== GPT AI ==========
    if (aiType === "gpt") {
        try {
            const response = await axios.get(`https://sensui-useless-apis.codersensui.repl.co/api/tools/ai?question=${encodeURIComponent(question)}`);
            
            if (response.data.error) {
                throw new Error("API Error");
            }
            
            const answer = response.data.answer;
            if (answer) {
                api.sendMessage(`🤖 GPT: ${answer}`, threadID, messageID);
            } else {
                api.sendMessage("⚠️ No response from GPT API.", threadID, messageID);
            }
        } catch (error) {
            console.error("GPT Error:", error.message);
            api.sendMessage("⚠️ GPT service is currently unavailable. Please try again later.", threadID, messageID);
        }
        return;
    }
    
    // ========== GEMINI AI (ai copy) ==========
    if (aiType === "gemini") {
        try {
            // Check if replying to an image
            let imageUrl = null;
            if (event.type === "message_reply" && event.messageReply.attachments) {
                const attachment = event.messageReply.attachments[0];
                if (attachment && attachment.type === "photo") {
                    imageUrl = attachment.url;
                }
            }
            
            const apiUrl = `https://api.gemini.com/v1/chat`; // Note: This may need a valid API endpoint
            
            let response;
            if (imageUrl) {
                response = await axios.post(apiUrl, {
                    modelType: "gemini-pro-vision",
                    prompt: question,
                    imageParts: [imageUrl]
                });
            } else {
                response = await axios.get(apiUrl, {
                    params: { q: question }
                });
            }
            
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
            
            api.sendMessage(`✨ Gemini: ${answer}`, threadID, messageID);
            
        } catch (error) {
            console.error("Gemini Error:", error.message);
            
            // Try backup API
            try {
                const backupResponse = await axios.get(`https://hercai.onrender.com/v3/hercai?question=${encodeURIComponent(question)}`, {
                    timeout: 30000
                });
                
                let backupAnswer = backupResponse.data.reply || backupResponse.data.response;
                if (backupAnswer) {
                    api.sendMessage(`✨ Gemini (Backup): ${backupAnswer}`, threadID, messageID);
                } else {
                    api.sendMessage("⚠️ Gemini AI is currently unavailable. Please try again later.", threadID, messageID);
                }
            } catch (backupError) {
                api.sendMessage("⚠️ Gemini AI service is busy. Please try again in a few moments.", threadID, messageID);
            }
        }
        return;
    }
    
    // ========== NORMAL AI (Default) ==========
    try {
        // Try multiple APIs for normal AI
        const apis = [
            `https://hercai.onrender.com/v3/hercai?question=${encodeURIComponent(question)}`,
            `https://api.popcat.xyz/chat?msg=${encodeURIComponent(question)}`,
            `https://sensui-useless-apis.codersensui.repl.co/api/tools/ai?question=${encodeURIComponent(question)}`
        ];
        
        let answer = null;
        
        for (const apiUrl of apis) {
            try {
                const response = await axios.get(apiUrl, { timeout: 15000 });
                answer = response.data.reply || response.data.response || response.data.answer || response.data.message;
                if (answer) break;
            } catch (e) {
                continue;
            }
        }
        
        if (!answer) {
            answer = "Sorry, I couldn't generate a response. Please try again.";
        }
        
        if (answer.length > 2000) {
            answer = answer.substring(0, 1997) + "...";
        }
        
        api.sendMessage(`🤖 AI: ${answer}`, threadID, messageID);
        
    } catch (error) {
        console.error("AI Error:", error.message);
        api.sendMessage("⚠️ AI service is currently unavailable. Please try again later.", threadID, messageID);
    }
};