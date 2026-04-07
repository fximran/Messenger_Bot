module.exports.config = {
    name: "memberjoin",
    eventType: ["log:subscribe"],
    version: "2.0.0",
    credits: "MQL1 Community",
    description: "Send welcome message when someone joins the group"
};

module.exports.run = async function ({ api, event, Threads }) {
    const { threadID } = event;

    try {
        // If bot itself was added
        if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
            const threadData = (await Threads.getData(threadID)).data || {};
            const prefix = threadData.PREFIX || global.config.PREFIX || "/";
            
            api.changeNickname(
                `[ ${prefix} ] • ${!global.config.BOTNAME ? "Bot" : global.config.BOTNAME}`,
                threadID,
                api.getCurrentUserID()
            );

            return api.sendMessage(
                `🤖 Thanks for adding me!\n\nI am now online and ready to work.\nType ${prefix}help to see commands.\n\nLet's make this group great! 😎`,
                threadID
            );
        }

        const threadInfo = await api.getThreadInfo(threadID);
        const threadName = threadInfo.threadName || "this group";
        const participantIDs = threadInfo.participantIDs || [];

        // Collect new members (excluding bot)
        const addedUsers = event.logMessageData.addedParticipants.filter(
            item => item.userFbId != api.getCurrentUserID()
        );

        if (!addedUsers.length) return;

        // Get language for this group
        const threadData = (await Threads.getData(threadID)).data || {};
        const lang = threadData.language || global.config.language || "en";

        // Language specific welcome messages
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