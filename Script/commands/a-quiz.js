const axios = require("axios");

module.exports.config = {
    name: "quiz",
    version: "2.0.0",
    credits: "MQL1 Community",
    hasPermssion: 0,
    description: "Answer questions (Supports English, Bengali & Hindi based on bot language)",
    commandCategory: "game",
    cooldowns: 5,
    dependencies: {
        "axios": ""
    }
};

// বাংলা প্রশ্নের ব্যাংক
const bengaliQuestions = [
    { question: "সূর্য পূর্ব দিকে উদিত হয়", answer: "True" },
    { question: "চাঁদ একটি গ্রহ", answer: "False" },
    { question: "ঢাকা বাংলাদেশের রাজধানী", answer: "True" },
    { question: "পৃথিবী সূর্যের চারদিকে ঘোরে", answer: "True" },
    { question: "মানুষের ৩২টি দাঁত থাকে", answer: "True" }
];

// হিন্দি প্রশ্নের ব্যাংক
const hindiQuestions = [
    { question: "सूर्य पूर्व दिशा में उगता है", answer: "True" },
    { question: "चंद्रमा एक ग्रह है", answer: "False" },
    { question: "दिल्ली भारत की राजधानी है", answer: "True" },
    { question: "पृथ्वी सूर्य के चारों ओर घूमती है", answer: "True" },
    { question: "मनुष्य के 32 दांत होते हैं", answer: "True" },
    { question: "हीरा सबसे कठोर पदार्थ है", answer: "True" },
    { question: "पानी बर्फ से हल्का होता है", answer: "False" },
    { question: "अमेरिका एशिया महाद्वीप में स्थित है", answer: "False" }
];

// বাংলা রিপ্লাই
const bengaliReplies = {
    correct: "✅ সঠিক উত্তর! অভিনন্দন! 🎉",
    wrong: "❌ ভুল উত্তর! সঠিক উত্তর ছিল: ",
    timeout: "⏰ সময় শেষ! সঠিক উত্তর ছিল: ",
    start: "এখানে আপনার জন্য প্রশ্ন:\n\n",
    trueEmoji: "👍: সত্য",
    falseEmoji: "😢: মিথ্যা",
    error: "❌ প্রশ্ন আনতে সমস্যা হয়েছে, আবার চেষ্টা করুন!"
};

// হিন্দি রিপ্লাই
const hindiReplies = {
    correct: "✅ सही उत्तर! बधाई हो! 🎉",
    wrong: "❌ गलत उत्तर! सही उत्तर था: ",
    timeout: "⏰ समय समाप्त! सही उत्तर था: ",
    start: "आपके लिए प्रश्न:\n\n",
    trueEmoji: "👍: सत्य",
    falseEmoji: "😢: असत्य",
    error: "❌ प्रश्न लाने में समस्या हुई, कृपया पुनः प्रयास करें!"
};

// ইংরেজি রিপ্লাই
const englishReplies = {
    correct: "✅ Correct! Congratulations! 🎉",
    wrong: "❌ Wrong answer! The correct answer was: ",
    timeout: "⏰ Time out! The correct answer was: ",
    start: "Here is the question for you:\n\n",
    trueEmoji: "👍: True",
    falseEmoji: "😢: False",
    error: "❌ Failed to fetch question, please try again!"
};

module.exports.handleReaction = async ({ api, event, handleReaction }) => {
    const { language } = global.config;
    
    let replies;
    if (language === "bn") replies = bengaliReplies;
    else if (language === "hi") replies = hindiReplies;
    else replies = englishReplies;
    
    if (event.userID != handleReaction.author) return;
    
    let response = "";
    if (event.reaction == "👍") response = "True";
    else if (event.reaction == "😢") response = "False";
    else return;
    
    if (response == handleReaction.answer) {
        api.sendMessage(replies.correct, event.threadID);
    } else {
        api.sendMessage(`${replies.wrong} ${handleReaction.answer === "True" ? (language === "bn" ? "সত্য" : language === "hi" ? "सत्य" : "True") : (language === "bn" ? "মিথ্যা" : language === "hi" ? "असत्य" : "False")}`, event.threadID);
    }
    
    const indexOfHandle = global.client.handleReaction.findIndex(e => e.messageID == handleReaction.messageID);
    if (indexOfHandle !== -1) {
        global.client.handleReaction.splice(indexOfHandle, 1);
    }
};

module.exports.run = async ({ api, event, args }) => {
    const { language } = global.config;
    const { threadID, messageID } = event;
    
    let replies, questionBank;
    
    // Set language-specific replies and question bank
    if (language === "bn") {
        replies = bengaliReplies;
        questionBank = bengaliQuestions;
    } else if (language === "hi") {
        replies = hindiReplies;
        questionBank = hindiQuestions;
    } else {
        replies = englishReplies;
        questionBank = null; // Use API for English
    }
    
    let difficulties = ["easy", "medium", "hard"];
    let difficulty = args[0];
    
    if (difficulties.some(item => difficulty == item)) {
        // valid difficulty
    } else {
        difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    }
    
    // For Bengali or Hindi, use local question bank
    if (language === "bn" || language === "hi") {
        const randomQuestion = questionBank[Math.floor(Math.random() * questionBank.length)];
        
        const msg = `${replies.start}📝 ${randomQuestion.question}\n\n   ${replies.trueEmoji}       ${replies.falseEmoji}`;
        
        return api.sendMessage(msg, threadID, async (err, info) => {
            if (err) return;
            
            global.client.handleReaction.push({
                name: "quiz",
                messageID: info.messageID,
                author: event.senderID,
                answer: randomQuestion.answer,
                answerYet: 0
            });
            
            setTimeout(async () => {
                const indexOfHandle = global.client.handleReaction.findIndex(e => e.messageID == info.messageID);
                if (indexOfHandle !== -1) {
                    const data = global.client.handleReaction[indexOfHandle];
                    if (data && data.answerYet !== 1) {
                        let answerText = data.answer === "True" ? 
                            (language === "bn" ? "সত্য" : language === "hi" ? "सत्य" : "True") : 
                            (language === "bn" ? "মিথ্যা" : language === "hi" ? "असत्य" : "False");
                        api.sendMessage(`${replies.timeout} ${answerText}`, threadID, info.messageID);
                        global.client.handleReaction.splice(indexOfHandle, 1);
                    }
                }
            }, 20 * 1000);
        });
    }
    
    // English language - use OpenTDB API
    else {
        try {
            const fetch = await axios.get(`https://opentdb.com/api.php?amount=1&encode=url3986&type=boolean&difficulty=${difficulty}`);
            
            if (!fetch.data || !fetch.data.results || fetch.data.results.length === 0) {
                throw new Error("No questions found");
            }
            
            const question = decodeURIComponent(fetch.data.results[0].question);
            const correctAnswer = fetch.data.results[0].correct_answer;
            
            const msg = `${replies.start}📝 ${question}\n\n   ${replies.trueEmoji}       ${replies.falseEmoji}`;
            
            return api.sendMessage(msg, threadID, async (err, info) => {
                if (err) return;
                
                global.client.handleReaction.push({
                    name: "quiz",
                    messageID: info.messageID,
                    author: event.senderID,
                    answer: correctAnswer,
                    answerYet: 0
                });
                
                setTimeout(async () => {
                    const indexOfHandle = global.client.handleReaction.findIndex(e => e.messageID == info.messageID);
                    if (indexOfHandle !== -1) {
                        const data = global.client.handleReaction[indexOfHandle];
                        if (data && data.answerYet !== 1) {
                            api.sendMessage(`${replies.timeout} ${correctAnswer}`, threadID, info.messageID);
                            global.client.handleReaction.splice(indexOfHandle, 1);
                        }
                    }
                }, 20 * 1000);
            });
            
        } catch (error) {
            console.error("Quiz error:", error);
            return api.sendMessage(replies.error, threadID, messageID);
        }
    }
};