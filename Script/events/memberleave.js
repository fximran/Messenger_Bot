module.exports.config = {
    name: "memberleave",
    eventType: ["log:unsubscribe"],
    version: "3.0.0",
    credits: "MQL1 Community",
    description: "Silent mode - Only works when bot is admin"
};

module.exports.onLoad = function () {
    if (!global.client.antiOutReadded) global.client.antiOutReadded = new Map();
    if (!global.client.antiJoinKicked) global.client.antiJoinKicked = new Map();
    return;
};

module.exports.run = async function ({ api, event, Users, Threads }) {
    try {
        const threadID = event.threadID;
        const leftUserId = event.logMessageData.leftParticipantFbId;

        if (leftUserId == api.getCurrentUserID()) return;

        // চেক করা বট গ্রুপে অ্যাডমিন কিনা
        const threadInfo = await api.getThreadInfo(threadID);
        const isBotAdmin = threadInfo.adminIDs.some(admin => admin.id == api.getCurrentUserID());

        // বট অ্যাডমিন না হলে কিছুই করবে না (সাইলেন্ট মোড)
        if (!isBotAdmin) return;

        const threadData = global.data.threadData.get(parseInt(threadID)) || (await Threads.getData(threadID)).data || {};
        const antiout = threadData.antiout === true;
        const lang = threadData.language || global.config.language || "en";
        
        const name = global.data.userName.get(leftUserId) || await Users.getNameUser(leftUserId);
        const leftBySelf = event.author == leftUserId;
        
        const messages = {
            en: {
                antiout_notice: "»» NOTICE ««\n{name} tried to leave the group, but Anti-Out is active.\nThe member has been added back successfully.",
                antiout_failed: "⚠️ {name} tried to leave, but I could not add them back.\nPlease make sure I have admin permission.",
                goodbye_self: "👋 Goodbye {name}!\n\nThey left on their own.\nThe chat is now slightly less chaotic.\n\n😅 We will pretend not to miss them.\n📦 One less legend in the group.",
                goodbye_kicked: "👋 Goodbye {name}!\n\nThey was removed.\nThe chat is now slightly less chaotic.\n\n😅 We will pretend not to miss them.\n📦 One less legend in the group."
            },
            bn: {
                antiout_notice: "»» NOTICE ««\n{name} group charar cheshta koreche, kintu Anti-Out active ache.\nShodoshyo ke abar add kora hoyeche.",
                antiout_failed: "⚠️ {name} group charar cheshta koreche, kintu ami add korte parini.\nDoya kore nishchit korun bot er admin permission ache.",
                goodbye_self: "👋 Bye {name}!\n\nTara nijeder icchay group charlo.\nGroup ektu somoyer jonno kom chaotic holo.\n\n😅 Amra bhabbo je tader miss kori na.\n📦 Ekti kom legend group e.",
                goodbye_kicked: "👋 Bye {name}!\n\nTake group theke remove kora hoyeche.\nGroup ektu somoyer jonno kom chaotic holo.\n\n😅 Amra bhabbo je tader miss kori na.\n📦 Ekti kom legend group e."
            },
            hi: {
                antiout_notice: "»» NOTICE ««\n{name} ne group chodne ki koshish ki, lekin Anti-Out active hai.\nSadasya ko wapas jod diya gaya hai.",
                antiout_failed: "⚠️ {name} ne group chodne ki koshish ki, lekin main wapas nahi jod saka.\nKripya sunishchit karein ki bot ke paas admin permission hai.",
                goodbye_self: "👋 Alvida {name}!\n\nUnhone khud se group choda.\nGroup thoda kam chaotic ho gaya.\n\n😅 Hum sochte hain ki unhe miss nahi karte.\n📦 Ek kam legend group mein.",
                goodbye_kicked: "👋 Alvida {name}!\n\nUnhe group se hata diya gaya.\nGroup thoda kam chaotic ho gaya.\n\n😅 Hum sochte hain ki unhe miss nahi karte.\n📦 Ek kam legend group mein."
            }
        };
        
        const msg = messages[lang] || messages.en;

        if (global.client.antiJoinKicked && global.client.antiJoinKicked.has(`${threadID}_${leftUserId}`)) {
            global.client.antiJoinKicked.delete(`${threadID}_${leftUserId}`);
            return;
        }

        if (antiout && leftBySelf) {
            try {
                global.client.antiOutReadded.set(`${threadID}_${leftUserId}`, true);
                setTimeout(() => {
                    global.client.antiOutReadded.delete(`${threadID}_${leftUserId}`);
                }, 30000);

                await api.addUserToGroup(leftUserId, threadID);
                return api.sendMessage(msg.antiout_notice.replace("{name}", name), threadID);
            } catch (e) {
                return api.sendMessage(msg.antiout_failed.replace("{name}", name), threadID);
            }
        }

        let goodbyeMsg = leftBySelf ? msg.goodbye_self.replace("{name}", name) : msg.goodbye_kicked.replace("{name}", name);
        return api.sendMessage(goodbyeMsg, threadID);
        
    } catch (e) {
        return console.log(e);
    }
};