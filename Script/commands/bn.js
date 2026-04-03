module.exports.config = {
    name: "bn",
    version: "1.0.2",
    hasPermssion: 0,
    credits: "MQL1 Community",
    usePrefix: false,
    description: "Translate text to any language | বাংলা, ইংরেজি, আরবি, হিন্দি সহ যেকোনো ভাষা",
    commandCategory: "media",
    usages: "bn [টেক্সট] -> [ভাষা কোড] | bn reply -> [ভাষা কোড]",
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
    
    // ভাষা কোড লিস্ট (সহজ ব্যবহারের জন্য)
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
    
    // রিপ্লাই দিয়ে কমান্ড দিলে
    if (event.type == "message_reply" && content.length == 0) {
        translateThis = event.messageReply.body;
        targetLang = "bn"; // ডিফল্ট
    }
    else if (event.type == "message_reply" && content.includes("->")) {
        translateThis = event.messageReply.body;
        let langPart = content.substring(content.indexOf("->") + 2).trim();
        targetLang = langCodes[langPart.toLowerCase()] || langPart || "bn";
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
        return api.sendMessage(
            "📖 Translation Guide:\n\n" +
            "1. বাংলায় অনুবাদ:\n   bn Hello\n\n" +
            "2. ইংরেজিতে অনুবাদ:\n   bn হ্যালো -> en\n\n" +
            "3. আরবিতে অনুবাদ:\n   bn Hello -> ar\n\n" +
            "4. রিপ্লাই করে:\n   কোনো মেসেজ রিপ্লাই করে bn -> en\n\n" +
            "🔤 ভাষা কোড: bn (বাংলা), en (ইংরেজি), ar (আরবি), hi (হিন্দি), ur (উর্দু), es (স্প্যানিশ), fr (ফ্রেঞ্চ), de (জার্মান), it (ইতালিয়ান), pt (পর্তুগিজ), ru (রুশ), ja (জাপানি), ko (কোরিয়ান), zh (চাইনিজ), tr (তুর্কি), th (থাই), vi (ভিয়েতনামি), ms (মালয়)",
            event.threadID,
            event.messageID
        );
    }
    
    // এনকোড করা
    const encodedText = encodeURIComponent(translateThis);
    
    // গুগল ট্রান্সলেট API কল (auto detect to target language)
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
            
            // ভাষার নাম বের করা (অটো ডিটেক্ট)
            const detectedLang = retrieve[2] || "auto";
            
            // ভাষার নাম দেখানোর জন্য
            const langNames = {
                "bn": "বাংলা", "en": "English", "ar": "العربية", "hi": "हिन्दी",
                "ur": "اردو", "es": "Español", "fr": "Français", "de": "Deutsch",
                "it": "Italiano", "pt": "Português", "ru": "Русский", "ja": "日本語",
                "ko": "한국어", "zh": "中文", "tr": "Türkçe", "th": "ไทย",
                "vi": "Tiếng Việt", "ms": "Bahasa Melayu"
            };
            
            const fromLangName = langNames[detectedLang] || detectedLang;
            const toLangName = langNames[targetLang] || targetLang;
            
            const result = `📝 ${fromLangName} → ${toLangName}\n\n${text}`;
            
            api.sendMessage(result, event.threadID, event.messageID);
            
        } catch (error) {
            console.error("Parse error:", error);
            api.sendMessage("❌ অনুবাদ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।", event.threadID, event.messageID);
        }
    });
};