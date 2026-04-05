module.exports.config = {
    name: "translate",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Translate text to any language\n\nSupport: বাংলা, English, العربية, हिन्दी, Urdu, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Turkish, Thai, Vietnamese, Malay",
    commandCategory: "media",
    usages: "translate [text] -> [lang] OR translate reply -> [lang] OR bn [text] OR reply with bn",
    cooldowns: 5,
    dependencies: {
        "request": ""
    }
};

module.exports.run = async ({ api, event, args }) => {
    const request = global.nodemodule["request"];
    let content = args.join(" ");
    let translateThis = "";
    let targetLang = "bn"; // ডিফল্ট বাংলা
    
    // ভাষা কোড লিস্ট
    const langCodes = {
        "bn": "bn",      // বাংলা
        "en": "en",      // ইংরেজি
        "ar": "ar",      // আরবি
        "hi": "hi",      // হিন্দি
        "ur": "ur",      // উর্দু
        "es": "es",      // স্প্যানিশ
        "fr": "fr",      // ফ্রেঞ্চ
        "de": "de",      // জার্মান
        "it": "it",      // ইতালিয়ান
        "pt": "pt",      // পর্তুগিজ
        "ru": "ru",      // রুশ
        "ja": "ja",      // জাপানি
        "ko": "ko",      // কোরিয়ান
        "zh": "zh",      // চাইনিজ
        "tr": "tr",      // তুর্কি
        "fa": "fa",      // ফার্সি
        "th": "th",      // থাই
        "vi": "vi",      // ভিয়েতনামি
        "ms": "ms"       // মালয়
    };
    
    // ভাষার নাম দেখানোর জন্য
    const langNames = {
        "bn": "বাংলা", "en": "English", "ar": "العربية", "hi": "हिन्दी",
        "ur": "اردو", "es": "Español", "fr": "Français", "de": "Deutsch",
        "it": "Italiano", "pt": "Português", "ru": "Русский", "ja": "日本語",
        "ko": "한국어", "zh": "中文", "tr": "Türkçe", "th": "ไทย",
        "vi": "Tiếng Việt", "ms": "Bahasa Melayu"
    };
    
    // ========== শর্টকাট bn কমান্ড হ্যান্ডলিং ==========
    // যদি কমান্ডের নাম bn বা অনুবাদ শর্টকাট হয়
    const isShortcut = (args[0] && (args[0].toLowerCase() === "bn" || 
                                     args[0].toLowerCase() === "অনুবাদ" || 
                                     args[0].toLowerCase() === "tr"));
    
    if (isShortcut) {
        // bn কমান্ডের জন্য প্রথম আর্গুমেন্ট সরিয়ে নেওয়া
        const newArgs = args.slice(1);
        content = newArgs.join(" ");
        targetLang = "bn"; // ডিফল্ট বাংলা
    }
    
    // ========== হেল্প মেসেজ ==========
    if (args.length === 0 && event.type !== "message_reply") {
        return api.sendMessage(
            `📖 Translation Guide\n\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬\n` +
            `📌 How to use:\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
            `1️⃣ বাংলায় অনুবাদ:\n` +
            `   /translate Hello World\n` +
            `   বা /bn Hello World\n\n` +
            `2️⃣ ইংরেজিতে অনুবাদ:\n` +
            `   /translate হ্যালো -> en\n\n` +
            `3️⃣ আরবিতে অনুবাদ:\n` +
            `   /translate Hello -> ar\n\n` +
            `4️⃣ রিপ্লাই করে অনুবাদ (বাংলা):\n` +
            `   কোনো মেসেজ রিপ্লাই করে /bn\n\n` +
            `5️⃣ রিপ্লাই করে অন্য ভাষায়:\n` +
            `   কোনো মেসেজ রিপ্লাই করে /translate -> en\n\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬\n` +
            `🔤 ভাষা কোড:\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬\n` +
            `🇧🇩 bn - বাংলা     🇬🇧 en - ইংরেজি\n` +
            `🇸🇦 ar - আরবি      🇮🇳 hi - হিন্দি\n` +
            `🇵🇰 ur - উর্দু     🇪🇸 es - স্প্যানিশ\n` +
            `🇫🇷 fr - ফ্রেঞ্চ   🇩🇪 de - জার্মান\n` +
            `🇮🇹 it - ইতালিয়ান  🇵🇹 pt - পর্তুগিজ\n` +
            `🇷🇺 ru - রুশ       🇯🇵 ja - জাপানি\n` +
            `🇰🇷 ko - কোরিয়ান   🇨🇳 zh - চাইনিজ\n` +
            `🇹🇷 tr - তুর্কি    🇹🇭 th - থাই\n` +
            `🇻🇳 vi - ভিয়েতনামি 🇲🇾 ms - মালয়`,
            event.threadID,
            event.messageID
        );
    }
    
    // ========== পার্সিং লজিক ==========
    
    // ** বিশেষ: শুধু /bn রিপ্লাই করলে (কোনো টেক্সট ছাড়া) **
    if (isShortcut && event.type == "message_reply" && content.trim().length === 0) {
        translateThis = event.messageReply.body;
        targetLang = "bn";
    }
    // ** বিশেষ: /bn hello (সরাসরি টেক্সট) **
    else if (isShortcut && content.trim().length > 0 && !content.includes("->")) {
        translateThis = content;
        targetLang = "bn";
    }
    // রিপ্লাই দিয়ে কমান্ড দিলে (সাধারণ translate কমান্ড)
    else if (event.type == "message_reply") {
        translateThis = event.messageReply.body;
        
        // রিপ্লাই + ভাষা নির্ধারণ (যেমন: -> en)
        if (content.includes("->")) {
            let langPart = content.substring(content.indexOf("->") + 2).trim();
            targetLang = langCodes[langPart.toLowerCase()] || langPart || "bn";
        } else if (content.length > 0 && !isShortcut) {
            // রিপ্লাই + শুধু ভাষা কোড
            targetLang = langCodes[content.toLowerCase()] || content || "bn";
        }
        // রিপ্লাই শুধু (কোনো ভাষা না দিলে) -> ডিফল্ট বাংলা
    }
    // সরাসরি টেক্সট দিয়ে "->" ব্যবহার করলে
    else if (content.includes("->")) {
        translateThis = content.substring(0, content.indexOf("->")).trim();
        let langPart = content.substring(content.indexOf("->") + 2).trim();
        targetLang = langCodes[langPart.toLowerCase()] || langPart || "bn";
    }
    // শুধু টেক্সট দিলে (ডিফল্ট বাংলা)
    else if (content.length > 0) {
        translateThis = content;
        targetLang = "bn";
    }
    else {
        return api.sendMessage("❌ ভুল কমান্ড! /translate হেল্প দেখুন", event.threadID, event.messageID);
    }
    
    // টেক্সট খালি হলে
    if (!translateThis || translateThis.trim().length === 0) {
        return api.sendMessage("❌ অনুবাদের জন্য কোনো টেক্সট পাওয়া যায়নি!", event.threadID, event.messageID);
    }
    
    // এনকোড করা
    const encodedText = encodeURIComponent(translateThis);
    
    // গুগল ট্রান্সলেট API কল
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodedText}`;
    
    request(url, (err, response, body) => {
        if (err) {
            console.error("Translation error:", err);
            return api.sendMessage("❌ অনুবাদ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।", event.threadID, event.messageID);
        }
        
        try {
            const retrieve = JSON.parse(body);
            let text = '';
            retrieve[0].forEach(item => {
                if (item[0]) text += item[0];
            });
            
            // ভাষা ডিটেক্ট করা
            const detectedLang = retrieve[2] || "auto";
            const fromLangName = langNames[detectedLang] || detectedLang;
            const toLangName = langNames[targetLang] || targetLang;
            
            // ফলাফল ফরম্যাট করা
            let result = `📝 ${fromLangName} → ${toLangName}\n\n`;
            result += `「 ${text} 」`;
            
            // লম্বা টেক্সট হলে
            if (result.length > 2000) {
                result = result.substring(0, 1997) + "...";
            }
            
            api.sendMessage(result, event.threadID, event.messageID);
            
        } catch (error) {
            console.error("Parse error:", error);
            api.sendMessage("❌ অনুবাদ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।", event.threadID, event.messageID);
        }
    });
};