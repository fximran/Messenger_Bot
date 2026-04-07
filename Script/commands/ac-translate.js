const request = global.nodemodule["request"];

module.exports.config = {
    name: "translate",
    version: "3.0.0",
    hasPermssion: 0,
    credits: "MQL1 Community",
    description: "Reply to a message with /bn /en /hi etc to translate",
    commandCategory: "media",
    usages: "reply to message with: /bn /en /hi /ar etc",
    cooldowns: 5
};

// All supported language codes
const langCodes = {
    "bn": "bn", "en": "en", "ar": "ar", "hi": "hi",
    "ur": "ur", "es": "es", "fr": "fr", "de": "de",
    "it": "it", "pt": "pt", "ru": "ru", "ja": "ja",
    "ko": "ko", "zh": "zh", "tr": "tr", "th": "th",
    "vi": "vi", "ms": "ms"
};

// Language names for display
const langNames = {
    "bn": "বাংলা", "en": "English", "ar": "العربية", "hi": "हिन्दी",
    "ur": "اردو", "es": "Español", "fr": "Français", "de": "Deutsch",
    "it": "Italiano", "pt": "Português", "ru": "Русский", "ja": "日本語",
    "ko": "한국어", "zh": "中文", "tr": "Türkçe", "th": "ไทย",
    "vi": "Tiếng Việt", "ms": "Bahasa Melayu"
};

// Handle shortcut commands with slash (like /bn, /en, /hi)
module.exports.handleEvent = async function({ api, event }) {
    const { threadID, messageID, body, type, messageReply } = event;
    
    if (!body) return;
    
    // Check if message starts with / (slash)
    if (!body.startsWith('/')) return;
    
    // Remove the slash and get language code
    const lowerBody = body.slice(1).toLowerCase();
    
    // Check if it's a valid language code
    if (!langCodes[lowerBody]) return;
    
    const targetLang = lowerBody;
    
    // Check if replying to a message
    if (type !== "message_reply") {
        return api.sendMessage(
            `❌ Please reply to a message to translate!\n\nExample: Reply to any message and type: /${targetLang}`,
            threadID, messageID
        );
    }
    
    // Get the text from replied message
    let translateThis = messageReply.body;
    
    if (!translateThis || translateThis.trim().length === 0) {
        return api.sendMessage("❌ No text found in the replied message!", threadID, messageID);
    }
    
    // Encode the text
    const encodedText = encodeURIComponent(translateThis);
    
    // Google Translate API
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodedText}`;
    
    request(url, (err, response, body) => {
        if (err) {
            console.error("Translation error:", err);
            return api.sendMessage("❌ Translation failed. Please try again.", threadID, messageID);
        }
        
        try {
            const retrieve = JSON.parse(body);
            let text = '';
            retrieve[0].forEach(item => {
                if (item[0]) text += item[0];
            });
            
            // Detect source language
            const detectedLang = retrieve[2] || "auto";
            const fromLangName = langNames[detectedLang] || detectedLang;
            const toLangName = langNames[targetLang] || targetLang;
            
            // Format result
            let result = `📝 ${fromLangName} → ${toLangName}\n\n`;
            result += `「 ${text} 」`;
            
            // Trim if too long
            if (result.length > 2000) {
                result = result.substring(0, 1997) + "...";
            }
            
            api.sendMessage(result, threadID, messageID);
            
        } catch (error) {
            console.error("Parse error:", error);
            api.sendMessage("❌ Translation failed. Please try again.", threadID, messageID);
        }
    });
};

module.exports.run = async ({ api, event, args }) => {
    const { threadID, messageID, type, messageReply } = event;
    
    // Get current language for help message
    const threadData = global.data.threadData.get(parseInt(threadID)) || {};
    const lang = threadData.language || global.config.language || "en";
    
    const helpMessages = {
        en: `📖 Translation Guide\n━━━━━━━━━━━━━━━━━━━━\n\n📌 How to use:\n• Reply to any message and type: /bn\n• Example: reply to a message and type: /bn\n\n🌐 Available languages:\n━━━━━━━━━━━━━━━━━━━━\n🇧🇩 bn - বাংলা        🇬🇧 en - English\n🇸🇦 ar - العربية      🇮🇳 hi - हिन्दी\n🇵🇰 ur - اردو         🇪🇸 es - Español\n🇫🇷 fr - Français     🇩🇪 de - Deutsch\n🇮🇹 it - Italiano     🇵🇹 pt - Português\n🇷🇺 ru - Русский      🇯🇵 ja - 日本語\n🇰🇷 ko - 한국어       🇨🇳 zh - 中文\n🇹🇷 tr - Türkçe       🇹🇭 th - ไทย\n🇻🇳 vi - Tiếng Việt   🇲🇾 ms - Bahasa Melayu\n\n💡 Only messages starting with / will be treated as commands.`,
        bn: `📖 Translation Guide\n━━━━━━━━━━━━━━━━━━━━\n\n📌 How to use:\n• Kono message reply kore likhun: /bn\n• Example: kono message reply kore /bn likhun\n\n🌐 Available languages:\n━━━━━━━━━━━━━━━━━━━━\n🇧🇩 bn - বাংলা        🇬🇧 en - English\n🇸🇦 ar - العربية      🇮🇳 hi - हिन्दी\n🇵🇰 ur - اردو         🇪🇸 es - Español\n🇫🇷 fr - Français     🇩🇪 de - Deutsch\n🇮🇹 it - Italiano     🇵🇹 pt - Português\n🇷🇺 ru - Русский      🇯🇵 ja - 日本語\n🇰🇷 ko - 한국어       🇨🇳 zh - 中文\n🇹🇷 tr - Türkçe       🇹🇭 th - ไทย\n🇻🇳 vi - Tiếng Việt   🇲🇾 ms - Bahasa Melayu\n\n💡 Shudhu / diye start kora message command hishebe count korbe.`,
        hi: `📖 Translation Guide\n━━━━━━━━━━━━━━━━━━━━\n\n📌 How to use:\n• Kisi message reply kare likhein: /bn\n• Example: kisi message reply kare /bn likhein\n\n🌐 Available languages:\n━━━━━━━━━━━━━━━━━━━━\n🇧🇩 bn - বাংলা        🇬🇧 en - English\n🇸🇦 ar - العربية      🇮🇳 hi - हिन्दी\n🇵🇰 ur - اردو         🇪🇸 es - Español\n🇫🇷 fr - Français     🇩🇪 de - Deutsch\n🇮🇹 it - Italiano     🇵🇹 pt - Português\n🇷🇺 ru - Русский      🇯🇵 ja - 日本語\n🇰🇷 ko - 한국어       🇨🇳 zh - 中文\n🇹🇷 tr - Türkçe       🇹🇭 th - ไทย\n🇻🇳 vi - Tiếng Việt   🇲🇾 ms - Bahasa Melayu\n\n💡 Sirf / se shuru hone wala message command mana jayega.`
    };
    
    const msg = helpMessages[lang] || helpMessages.en;
    
    return api.sendMessage(msg, threadID, messageID);
};