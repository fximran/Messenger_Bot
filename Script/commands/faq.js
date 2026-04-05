const fs = require("fs-extra");

module.exports.config = {
    name: "faq",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "FAQ system - Add and view questions/answers about the group",
    commandCategory: "system",
    usages: "add/list/remove/answer",
    cooldowns: 3
};

// Data storage path
const dataPath = __dirname + "/cache/faq.json";

// Load FAQ data
function loadData() {
    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(dataPath, JSON.stringify([], null, 2));
    }
    return JSON.parse(fs.readFileSync(dataPath, "utf-8"));
}

// Save FAQ data
function saveData(data) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

module.exports.run = async function({ api, event, args, Users }) {
    const { threadID, messageID, senderID } = event;
    const isAdmin = global.config.ADMINBOT.includes(senderID);
    const cmd = args[0]?.toLowerCase();
    
    // ========== ADD QUESTION (Admin only) ==========
    if (cmd === "add") {
        if (!isAdmin) {
            return api.sendMessage("❌ শুধু বট অ্যাডমিনরা প্রশ্ন যোগ করতে পারেন!", threadID, messageID);
        }
        
        const question = args.slice(1).join(" ");
        if (!question) {
            return api.sendMessage(
                `❌ সঠিক ফরম্যাট:\n/faq add প্রশ্ন | উত্তর\n\nউদাহরণ:\n/faq add বটের নাম কি? | আমার বটের নাম Messenger Bot`,
                threadID, messageID
            );
        }
        
        // Check if question contains answer separator
        if (!question.includes("|")) {
            return api.sendMessage(`❌ প্রশ্ন এবং উত্তর আলাদা করতে | (পাইপ) চিহ্ন ব্যবহার করুন!\n\nউদাহরণ: /faq add প্রশ্ন | উত্তর`, threadID, messageID);
        }
        
        const separatorIndex = question.indexOf("|");
        const questionText = question.substring(0, separatorIndex).trim();
        const answerText = question.substring(separatorIndex + 1).trim();
        
        if (!questionText || !answerText) {
            return api.sendMessage(`❌ প্রশ্ন এবং উত্তর উভয়ই দিতে হবে!`, threadID, messageID);
        }
        
        const data = loadData();
        
        // Check if question already exists
        const exists = data.some(item => item.question.toLowerCase() === questionText.toLowerCase());
        if (exists) {
            return api.sendMessage(`❌ এই প্রশ্নটি ইতিমধ্যে যোগ করা আছে!`, threadID, messageID);
        }
        
        data.push({
            id: Date.now(),
            question: questionText,
            answer: answerText,
            addedBy: senderID,
            addedAt: new Date().toISOString()
        });
        
        saveData(data);
        
        return api.sendMessage(
            `✅ প্রশ্ন যোগ করা হয়েছে!\n\n📝 প্রশ্ন: ${questionText}\n📖 উত্তর: ${answerText}\n📊 মোট প্রশ্ন: ${data.length}`,
            threadID, messageID
        );
    }
    
    // ========== REMOVE QUESTION (Admin only) ==========
    if (cmd === "remove" || cmd === "rm") {
        if (!isAdmin) {
            return api.sendMessage("❌ শুধু বট অ্যাডমিনরা প্রশ্ন মুছতে পারেন!", threadID, messageID);
        }
        
        const num = parseInt(args[1]);
        const data = loadData();
        
        if (isNaN(num) || num < 1 || num > data.length) {
            return api.sendMessage(`❌ সঠিক নম্বর দিন! /faq list দেখে নম্বর চেক করুন।`, threadID, messageID);
        }
        
        const removed = data.splice(num - 1, 1);
        saveData(data);
        
        return api.sendMessage(
            `✅ প্রশ্ন মুছে ফেলা হয়েছে!\n\n📝 প্রশ্ন: ${removed[0].question}\n📖 উত্তর: ${removed[0].answer}`,
            threadID, messageID
        );
    }
    
    // ========== LIST ALL QUESTIONS ==========
    if (cmd === "list" || cmd === "all") {
        const data = loadData();
        
        if (data.length === 0) {
            return api.sendMessage(
                `📋 কোন প্রশ্ন যোগ করা হয়নি!\n\n💡 এডমিনরা প্রশ্ন যোগ করতে পারেন:\n/faq add প্রশ্ন | উত্তর`,
                threadID, messageID
            );
        }
        
        let msg = `📋 গ্রুপের FAQ (প্রশ্নোত্তর)\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        for (let i = 0; i < data.length; i++) {
            msg += `${i+1}. ${data[i].question}\n`;
        }
        
        msg += `\n━━━━━━━━━━━━━━━━━━━━\n💡 উত্তর জানতে নম্বর রিপ্লাই করুন।\n💡 উদাহরণ: 2 (রিপ্লাই করে)`;
        
        // Send message and setup handleReply
        api.sendMessage(msg, threadID, (error, info) => {
            if (!error) {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    type: "showAnswer"
                });
            }
        }, messageID);
        
        return;
    }
    
    // ========== SEARCH QUESTION ==========
    if (cmd === "search") {
        const searchTerm = args.slice(1).join(" ").toLowerCase();
        if (!searchTerm) {
            return api.sendMessage(`❌ সার্চ টার্ম দিন!\nউদাহরণ: /faq search বট`, threadID, messageID);
        }
        
        const data = loadData();
        const results = data.filter(item => 
            item.question.toLowerCase().includes(searchTerm) || 
            item.answer.toLowerCase().includes(searchTerm)
        );
        
        if (results.length === 0) {
            return api.sendMessage(`❌ "${searchTerm}" সম্পর্কে কোনো প্রশ্ন পাওয়া যায়নি!`, threadID, messageID);
        }
        
        let msg = `🔍 "${searchTerm}" এর জন্য ফলাফল\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        for (let i = 0; i < results.length; i++) {
            msg += `${i+1}. ${results[i].question}\n`;
        }
        msg += `\n━━━━━━━━━━━━━━━━━━━━\n💡 উত্তর জানতে নম্বর রিপ্লাই করুন।`;
        
        api.sendMessage(msg, threadID, (error, info) => {
            if (!error) {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    type: "showAnswer",
                    searchResults: results
                });
            }
        }, messageID);
        
        return;
    }
    
    // ========== HELP ==========
    if (!cmd || cmd === "help") {
        return api.sendMessage(
            `📖 FAQ সিস্টেম কমান্ড\n━━━━━━━━━━━━━━━━━━━━\n\n` +
            `👑 এডমিন কমান্ড:\n` +
            `   /faq add প্রশ্ন | উত্তর - নতুন FAQ যোগ\n` +
            `   /faq remove [নম্বর] - FAQ মুছুন\n\n` +
            `👥 ইউজার কমান্ড:\n` +
            `   /faq list - সব প্রশ্ন দেখুন\n` +
            `   /faq search [টেক্সট] - প্রশ্ন খুঁজুন\n` +
            `   /faq help - এই হেল্প দেখুন\n\n` +
            `💡 উত্তর পেতে: /faq list এর পর নম্বর রিপ্লাই করুন`,
            threadID, messageID
        );
    }
    
    return api.sendMessage(`❌ ভুল কমান্ড!\n\n/faq help দেখুন সঠিক ব্যবহারের জন্য।`, threadID, messageID);
};

// ========== HANDLE REPLY FOR ANSWER ==========
module.exports.handleReply = async function({ event, api, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    const { author, type, searchResults } = handleReply;
    
    if (senderID != author) return;
    
    const num = parseInt(body);
    if (isNaN(num)) return;
    
    let data;
    if (searchResults) {
        data = searchResults;
    } else {
        data = loadData();
    }
    
    if (num < 1 || num > data.length) {
        return api.sendMessage(`❌ ভুল নম্বর! সঠিক নম্বর দিন।`, threadID, messageID);
    }
    
    const item = data[num - 1];
    
    const answerMsg = 
        `📋 প্রশ্ন: ${item.question}\n━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📖 উত্তর: ${item.answer}`;
    
    api.sendMessage(answerMsg, threadID, messageID);
};