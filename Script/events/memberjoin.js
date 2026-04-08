module.exports.config = {
    name: "memberjoin",
    eventType: ["log:subscribe"],
    version: "3.0.0",
    credits: "MQL1 Community",
    description: "Silent mode - Only works when bot is admin"
};

module.exports.run = async function ({ api, event, Threads }) {
    const { threadID } = event;

    try {
        // চেক করা বট গ্রুপে অ্যাডমিন কিনা
        const threadInfo = await api.getThreadInfo(threadID);
        const isBotAdmin = threadInfo.adminIDs.some(admin => admin.id == api.getCurrentUserID());

        // বট অ্যাডমিন না হলে কিছুই করবে না (সাইলেন্ট মোড)
        if (!isBotAdmin) return;

        // ========== বট নিজে জয়েন করলে ==========
        if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
            const threadData = (await Threads.getData(threadID)).data || {};
            const prefix = threadData.PREFIX || global.config.PREFIX || "/";

            return api.sendMessage(
                `🤖 Thanks for adding me as admin!\n\nI am now online and ready to work.\nType ${prefix}help to see commands.\n\nLet's make this group great! 😎`,
                threadID
            );
        }

        // ========== অন্য সদস্য জয়েন করলে ==========
        const threadName = threadInfo.threadName || "this group";
        const participantIDs = threadInfo.participantIDs || [];

        // বট বাদে নতুন সদস্যরা
        const addedUsers = event.logMessageData.addedParticipants.filter(
            item => item.userFbId != api.getCurrentUserID()
        );

        if (!addedUsers.length) return;

        // গ্রুপের ভাষা সেটিংস
        const threadData = (await Threads.getData(threadID)).data || {};
        const lang = threadData.language || global.config.language || "en";

        const messages = {
            en: {
                welcome: "🎉 Welcome {names}!\n\nYou just joined {threadName}.\nYou are member no. {memberNumbers}.\n\n😄 Have fun and enjoy!\n📌 Please read the group rules."
            },
            bn: {
                welcome: "🎉 Shagotom {names}!\n\nApni {threadName} group e join korechen.\nApnar member number: {memberNumbers}.\n\n😄 Mazza korun!\n📌 Group rules follow korun."
            },
            hi: {
                welcome: "🎉 Swagat hai {names}!\n\nAap {threadName} group mein shamil hue.\nAap member number {memberNumbers} hain.\n\n😄 Maza karein!\n📌 Kripya group rules follow karein."
            }
        };

        const msg = messages[lang] || messages.en;

        const names = addedUsers.map(user => user.fullName).join(", ");
        const memberNumbers = addedUsers
            .map((_, index) => participantIDs.length - index)
            .sort((a, b) => a - b)
            .join(", ");

        const welcomeMsg = msg.welcome
            .replace("{names}", names)
            .replace("{threadName}", threadName)
            .replace("{memberNumbers}", memberNumbers);

        return api.sendMessage(welcomeMsg, threadID);
        
    } catch (e) {
        return console.log(e);
    }
};