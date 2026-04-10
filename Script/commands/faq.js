const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "faq",
    version: "2.2.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Group-based FAQ system - Add and view questions/answers (supports target group ID)",
    commandCategory: "system",
    usages: "add/list/remove/search/help [groupID]",
    cooldowns: 3
};

// Data storage base path (per group)
const basePath = path.join(__dirname, "cache", "faq");
if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
}

function getDataPath(threadID) {
    return path.join(basePath, `faq_${threadID}.json`);
}

function loadData(threadID) {
    const filePath = getDataPath(threadID);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function saveData(threadID, data) {
    const filePath = getDataPath(threadID);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Helper: parse target thread from arguments
async function parseTargetThread(api, args, currentThreadID) {
    let targetThreadID = currentThreadID;
    let targetThreadName = "this group";
    let remainingArgs = [...args];

    // Check if last argument is a numeric group ID
    const lastArg = args[args.length - 1];
    if (lastArg && /^\d+$/.test(lastArg)) {
        try {
            const info = await api.getThreadInfo(lastArg);
            if (info.isGroup) {
                targetThreadID = lastArg;
                targetThreadName = info.threadName || lastArg;
                remainingArgs = args.slice(0, -1);
                return { targetThreadID, targetThreadName, remainingArgs };
            }
        } catch (e) {}
    }

    // For 'add' command, check if any arg is a group ID (not at the end)
    if (args[0]?.toLowerCase() === 'add') {
        for (let i = 1; i < args.length; i++) {
            if (/^\d+$/.test(args[i])) {
                try {
                    const info = await api.getThreadInfo(args[i]);
                    if (info.isGroup) {
                        targetThreadID = args[i];
                        targetThreadName = info.threadName || args[i];
                        remainingArgs = [...args.slice(0, i), ...args.slice(i + 1)];
                        return { targetThreadID, targetThreadName, remainingArgs };
                    }
                } catch (e) {}
            }
        }
    }

    return { targetThreadID, targetThreadName, remainingArgs };
}

module.exports.run = async function({ api, event, args, Users, Threads }) {
    const { threadID, messageID, senderID } = event;
    
    // Parse target thread and remaining args
    const { targetThreadID, targetThreadName, remainingArgs } = await parseTargetThread(api, args, threadID);
    
    // Get user's permission (bot admin)
    const isAdmin = global.config.ADMINBOT.includes(senderID);
    
    // Get current language for the TARGET group
    const targetThreadData = (await Threads.getData(targetThreadID)).data || {};
    const lang = targetThreadData.language || global.config.language || "en";
    
    // Language messages (Romanized for bn/hi)
    const messages = {
        en: {
            admin_only: "❌ Only bot admins can add or remove FAQs!",
            add_usage: "❌ Correct format:\n/faq add Question | Answer [groupID]\n\nExample:\n/faq add What is the bot name? | My bot is Messenger 123456",
            missing_separator: "❌ Use | (pipe) to separate question and answer!\n\nExample: /faq add Question | Answer",
            missing_both: "❌ Both question and answer must be provided!",
            already_exists: "❌ This question already exists in this group!",
            added: "✅ Question added to {group}!\n\n📝 Question: {q}\n📖 Answer: {a}\n📊 Total questions: {total}",
            remove_usage: "❌ Correct format: /faq remove [number] [groupID]\nCheck /faq list for numbers.",
            removed: "✅ Question removed from {group}!\n\n📝 Question: {q}\n📖 Answer: {a}",
            no_faq: "📋 No questions added yet for {group}!\n\n💡 Admins can add: /faq add Question | Answer [groupID]",
            list_title: "📋 FAQ for {group}\n━━━━━━━━━━━━━━━━━━━━\n\n",
            list_footer: "\n━━━━━━━━━━━━━━━━━━━━\n💡 Reply with a number to see the answer.\n💡 Example: 2 (by replying)",
            search_prompt: "❌ Enter a search term!\nExample: /faq search bot [groupID]",
            no_results: "❌ No questions found related to \"{term}\" in {group}!",
            search_results: "🔍 Results for \"{term}\" in {group}\n━━━━━━━━━━━━━━━━━━━━\n\n",
            search_footer: "\n━━━━━━━━━━━━━━━━━━━━\n💡 Reply with a number to see the answer.",
            help: "📖 FAQ SYSTEM COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n\n" +
                  "👑 Admin Commands:\n" +
                  "   /faq add Question | Answer [groupID] - Add new FAQ\n" +
                  "   /faq remove [number] [groupID] - Remove FAQ\n\n" +
                  "👥 User Commands:\n" +
                  "   /faq list [groupID] - Show all questions\n" +
                  "   /faq search [text] [groupID] - Search questions\n" +
                  "   /faq help - Show this help\n\n" +
                  "💡 Just type /faq to see the list of questions for this group.\n" +
                  "💡 Omit groupID to target current group.",
            invalid_number: "❌ Invalid number! Please reply with a valid number.",
            answer_header: "📋 Question: {q}\n━━━━━━━━━━━━━━━━━━━━\n\n📖 Answer: {a}",
            unknown_cmd: "❌ Unknown command!\n\nUse /faq help to see proper usage.",
            group_not_found: "❌ Bot is not in the specified group or group doesn't exist!"
        },
        bn: {
            admin_only: "❌ Shudhu bot admin ra question add korte ba muchte paren!",
            add_usage: "❌ Shothik format:\n/faq add Proshno | Uttor [groupID]\n\nUdhahoron:\n/faq add Bot er naam ki? | Amar bot Messenger 123456",
            missing_separator: "❌ Proshno o uttor alada korte | (pipe) chinho babohar korun!\n\nUdhahoron: /faq add Proshno | Uttor",
            missing_both: "❌ Proshno ebong uttor ubhoyi dite hobe!",
            already_exists: "❌ Ei proshnoti ei groope age theke ache!",
            added: "✅ {group} te proshno jog kora hoyeche!\n\n📝 Proshno: {q}\n📖 Uttor: {a}\n📊 Mot proshno: {total}",
            remove_usage: "❌ Shothik number din! /faq list [groupID] dekhe number check korun.",
            removed: "✅ {group} theke proshno muche fela hoyeche!\n\n📝 Proshno: {q}\n📖 Uttor: {a}",
            no_faq: "📋 {group} er jonno kono proshno jog kora hoyni!\n\n💡 Admin ra proshno jog korte paren:\n/faq add Proshno | Uttor [groupID]",
            list_title: "📋 {group} er FAQ\n━━━━━━━━━━━━━━━━━━━━\n\n",
            list_footer: "\n━━━━━━━━━━━━━━━━━━━━\n💡 Uttor jante number reply korun.\n💡 Udhahoron: 2 (reply kore)",
            search_prompt: "❌ Search term din!\nUdhahoron: /faq search bot [groupID]",
            no_results: "❌ \"{term}\" somporke {group} e kono proshno pawa jayni!",
            search_results: "🔍 \"{term}\" er jonno folafol {group} e\n━━━━━━━━━━━━━━━━━━━━\n\n",
            search_footer: "\n━━━━━━━━━━━━━━━━━━━━\n💡 Uttor jante number reply korun.",
            help: "📖 FAQ SYSTEM COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n\n" +
                  "👑 Admin Commands:\n" +
                  "   /faq add Proshno | Uttor [groupID] - Notun FAQ jog korun\n" +
                  "   /faq remove [number] [groupID] - FAQ muchun\n\n" +
                  "👥 User Commands:\n" +
                  "   /faq list [groupID] - Sob proshno dekhun\n" +
                  "   /faq search [text] [groupID] - Proshno khujun\n" +
                  "   /faq help - Ei help dekhun\n\n" +
                  "💡 Shudhu /faq likhleo ei grooper proshnottor dekha jabe.\n" +
                  "💡 GroupID na dile current group e kaj korbe.",
            invalid_number: "❌ Vul number! Shothik number din.",
            answer_header: "📋 Proshno: {q}\n━━━━━━━━━━━━━━━━━━━━\n\n📖 Uttor: {a}",
            unknown_cmd: "❌ Vul command!\n\nShothik beboharer jonno /faq help dekhun.",
            group_not_found: "❌ Bot oi groope nei ba groop ti nei!"
        },
        hi: {
            admin_only: "❌ Sirf bot admin hi prashn jod ya hata sakte hain!",
            add_usage: "❌ Sahi format:\n/faq add Prashn | Uttar [groupID]\n\nUdaharan:\n/faq add Bot ka naam kya hai? | Mera bot Messenger 123456",
            missing_separator: "❌ Prashn aur uttar alag karne ke liye | (pipe) chinh ka prayog karein!\n\nUdaharan: /faq add Prashn | Uttar",
            missing_both: "❌ Prashn aur uttar dono dena anivarya hai!",
            already_exists: "❌ Yah prashn is group mein pahle se maujood hai!",
            added: "✅ {group} mein prashn joda gaya!\n\n📝 Prashn: {q}\n📖 Uttar: {a}\n📊 Kul prashn: {total}",
            remove_usage: "❌ Sahi number dein! /faq list [groupID] dekhkar number check karein.",
            removed: "✅ {group} se prashn hata diya gaya!\n\n📝 Prashn: {q}\n📖 Uttar: {a}",
            no_faq: "📋 {group} ke liye koi prashn nahi joda gaya!\n\n💡 Admin jod sakte hain:\n/faq add Prashn | Uttar [groupID]",
            list_title: "📋 {group} ke FAQ\n━━━━━━━━━━━━━━━━━━━━\n\n",
            list_footer: "\n━━━━━━━━━━━━━━━━━━━━\n💡 Uttar janne number reply karein.\n💡 Udaharan: 2 (reply karke)",
            search_prompt: "❌ Search term dein!\nUdaharan: /faq search bot [groupID]",
            no_results: "❌ \"{term}\" se sambandhit koi prashn {group} mein nahi mila!",
            search_results: "🔍 \"{term}\" ke liye parinam {group} mein\n━━━━━━━━━━━━━━━━━━━━\n\n",
            search_footer: "\n━━━━━━━━━━━━━━━━━━━━\n💡 Uttar janne number reply karein.",
            help: "📖 FAQ SYSTEM COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n\n" +
                  "👑 Admin Commands:\n" +
                  "   /faq add Prashn | Uttar [groupID] - Naya FAQ jodein\n" +
                  "   /faq remove [number] [groupID] - FAQ hataein\n\n" +
                  "👥 User Commands:\n" +
                  "   /faq list [groupID] - Sabhi prashn dekhein\n" +
                  "   /faq search [text] [groupID] - Prashn khojein\n" +
                  "   /faq help - Yah sahayata dekhein\n\n" +
                  "💡 Sirf /faq likhne par is group ke prashnottar dikhenge.\n" +
                  "💡 GroupID na dene par current group mein kaam karega.",
            invalid_number: "❌ Galat number! Sahi number dein.",
            answer_header: "📋 Prashn: {q}\n━━━━━━━━━━━━━━━━━━━━\n\n📖 Uttar: {a}",
            unknown_cmd: "❌ Galat command!\n\nSahi upyog ke liye /faq help dekhein.",
            group_not_found: "❌ Bot us group mein nahi hai ya group maujood nahi hai!"
        }
    };
    
    const msg = messages[lang] || messages.en;
    
    const cmd = remainingArgs[0]?.toLowerCase();
    
    // Helper to replace placeholders
    function format(str, replacements) {
        let result = str;
        for (const [key, value] of Object.entries(replacements)) {
            result = result.replace(new RegExp(`{${key}}`, 'g'), value);
        }
        return result;
    }
    
    // ========== ADD QUESTION (Admin only) ==========
    if (cmd === "add") {
        if (!isAdmin) {
            return api.sendMessage(msg.admin_only, threadID, messageID);
        }
        
        const question = remainingArgs.slice(1).join(" ");
        if (!question) {
            return api.sendMessage(msg.add_usage, threadID, messageID);
        }
        
        if (!question.includes("|")) {
            return api.sendMessage(msg.missing_separator, threadID, messageID);
        }
        
        const separatorIndex = question.indexOf("|");
        const questionText = question.substring(0, separatorIndex).trim();
        const answerText = question.substring(separatorIndex + 1).trim();
        
        if (!questionText || !answerText) {
            return api.sendMessage(msg.missing_both, threadID, messageID);
        }
        
        const data = loadData(targetThreadID);
        
        const exists = data.some(item => item.question.toLowerCase() === questionText.toLowerCase());
        if (exists) {
            return api.sendMessage(msg.already_exists, threadID, messageID);
        }
        
        data.push({
            id: Date.now(),
            question: questionText,
            answer: answerText,
            addedBy: senderID,
            addedAt: new Date().toISOString()
        });
        
        saveData(targetThreadID, data);
        
        const displayGroup = targetThreadID === threadID ? "this group" : targetThreadName;
        return api.sendMessage(
            format(msg.added, { group: displayGroup, q: questionText, a: answerText, total: data.length }),
            threadID, messageID
        );
    }
    
    // ========== REMOVE QUESTION (Admin only) ==========
    if (cmd === "remove" || cmd === "rm") {
        if (!isAdmin) {
            return api.sendMessage(msg.admin_only, threadID, messageID);
        }
        
        const num = parseInt(remainingArgs[1]);
        const data = loadData(targetThreadID);
        
        if (isNaN(num) || num < 1 || num > data.length) {
            return api.sendMessage(msg.remove_usage, threadID, messageID);
        }
        
        const removed = data.splice(num - 1, 1);
        saveData(targetThreadID, data);
        
        const displayGroup = targetThreadID === threadID ? "this group" : targetThreadName;
        return api.sendMessage(
            format(msg.removed, { group: displayGroup, q: removed[0].question, a: removed[0].answer }),
            threadID, messageID
        );
    }
    
    // ========== LIST ALL QUESTIONS (default for /faq) ==========
    if (cmd === "list" || cmd === "all" || !cmd) {
        const data = loadData(targetThreadID);
        const displayGroup = targetThreadID === threadID ? "this group" : targetThreadName;
        
        if (data.length === 0) {
            return api.sendMessage(format(msg.no_faq, { group: displayGroup }), threadID, messageID);
        }
        
        let listMsg = format(msg.list_title, { group: displayGroup });
        for (let i = 0; i < data.length; i++) {
            listMsg += `${i+1}. ${data[i].question}\n`;
        }
        listMsg += msg.list_footer;
        
        api.sendMessage(listMsg, threadID, (error, info) => {
            if (!error) {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    type: "showAnswer",
                    lang: lang,
                    targetThreadID: targetThreadID
                });
            }
        }, messageID);
        
        return;
    }
    
    // ========== SEARCH QUESTION ==========
    if (cmd === "search") {
        const searchTerm = remainingArgs.slice(1).join(" ").toLowerCase();
        if (!searchTerm) {
            return api.sendMessage(msg.search_prompt, threadID, messageID);
        }
        
        const data = loadData(targetThreadID);
        const results = data.filter(item => 
            item.question.toLowerCase().includes(searchTerm) || 
            item.answer.toLowerCase().includes(searchTerm)
        );
        
        const displayGroup = targetThreadID === threadID ? "this group" : targetThreadName;
        
        if (results.length === 0) {
            return api.sendMessage(format(msg.no_results, { term: searchTerm, group: displayGroup }), threadID, messageID);
        }
        
        let resultMsg = format(msg.search_results, { term: searchTerm, group: displayGroup });
        for (let i = 0; i < results.length; i++) {
            resultMsg += `${i+1}. ${results[i].question}\n`;
        }
        resultMsg += msg.search_footer;
        
        api.sendMessage(resultMsg, threadID, (error, info) => {
            if (!error) {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    type: "showAnswer",
                    searchResults: results,
                    lang: lang,
                    targetThreadID: targetThreadID
                });
            }
        }, messageID);
        
        return;
    }
    
    // ========== HELP ==========
    if (cmd === "help") {
        return api.sendMessage(msg.help, threadID, messageID);
    }
    
    return api.sendMessage(msg.unknown_cmd, threadID, messageID);
};

// ========== HANDLE REPLY FOR ANSWER ==========
module.exports.handleReply = async function({ event, api, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    const { author, type, searchResults, lang, targetThreadID } = handleReply;
    
    if (senderID != author) return;
    
    const replyMessages = {
        en: {
            invalid_number: "❌ Invalid number! Please reply with a valid number.",
            answer_header: "📋 Question: {q}\n━━━━━━━━━━━━━━━━━━━━\n\n📖 Answer: {a}"
        },
        bn: {
            invalid_number: "❌ Vul number! Shothik number din.",
            answer_header: "📋 Proshno: {q}\n━━━━━━━━━━━━━━━━━━━━\n\n📖 Uttor: {a}"
        },
        hi: {
            invalid_number: "❌ Galat number! Sahi number dein.",
            answer_header: "📋 Prashn: {q}\n━━━━━━━━━━━━━━━━━━━━\n\n📖 Uttar: {a}"
        }
    };
    const rMsg = replyMessages[lang] || replyMessages.en;
    
    const num = parseInt(body);
    if (isNaN(num)) return;
    
    let data;
    if (searchResults) {
        data = searchResults;
    } else {
        const filePath = path.join(__dirname, "cache", "faq", `faq_${targetThreadID}.json`);
        if (!fs.existsSync(filePath)) data = [];
        else data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
    
    if (num < 1 || num > data.length) {
        return api.sendMessage(rMsg.invalid_number, threadID, messageID);
    }
    
    const item = data[num - 1];
    const answerMsg = rMsg.answer_header.replace("{q}", item.question).replace("{a}", item.answer);
    
    api.sendMessage(answerMsg, threadID, messageID);
};