module.exports.config = {
    name: "memberjoin",
    eventType: ["log:subscribe"],
    version: "2.0.0",
    credits: "CYBER BOT TEAM + Modified by ChatGPT",
    description: "Handle member join events with anti join support"
};

module.exports.onLoad = function () {
    // Store users kicked by anti join so leave messages can be suppressed
    if (!global.client.antiJoinKicked) global.client.antiJoinKicked = new Map();

    // Store users restored by anti out so welcome messages can be suppressed
    if (!global.client.antiOutReadded) global.client.antiOutReadded = new Map();

    return;
};

module.exports.run = async function ({ api, event, Threads }) {
    const { threadID } = event;

    try {
        const threadData =
            global.data.threadData.get(parseInt(threadID)) ||
            (await Threads.getData(threadID)).data ||
            {};

        const antiJoin = threadData.newMember === true;

        // If bot itself was added
        if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
            api.changeNickname(
                `[ ${global.config.PREFIX} ] • ${!global.config.BOTNAME ? "Bot" : global.config.BOTNAME}`,
                threadID,
                api.getCurrentUserID()
            );

            return api.sendMessage(
                `🤖 Thanks for adding me!\n\n` +
                `I am now online, mildly dramatic, and ready to work.\n` +
                `Type ${global.config.PREFIX}help to see commands.\n\n` +
                `Let's make this group slightly more chaotic. 😎`,
                threadID
            );
        }

        const threadInfo = await api.getThreadInfo(threadID);
        const threadName = threadInfo.threadName || "this group";
        const participantIDs = threadInfo.participantIDs || [];

        // Collect real new members, excluding the bot
        const addedUsers = event.logMessageData.addedParticipants.filter(
            item => item.userFbId != api.getCurrentUserID()
        );

        if (!addedUsers.length) return;

        // If anti join is enabled, warn and remove new users
        if (antiJoin) {
            await api.sendMessage(
                "🚫 Joining is currently restricted.\nPlease contact a group admin before adding a new member.",
                threadID
            );

            for (const user of addedUsers) {
                global.client.antiJoinKicked.set(`${threadID}_${user.userFbId}`, true);

                setTimeout(() => {
                    global.client.antiJoinKicked.delete(`${threadID}_${user.userFbId}`);
                }, 30000);

                api.removeUserFromGroup(user.userFbId, threadID);
            }

            return;
        }

        // If user was re-added because of anti out, skip welcome message
        const filteredUsers = addedUsers.filter(user => {
            const key = `${threadID}_${user.userFbId}`;
            if (global.client.antiOutReadded && global.client.antiOutReadded.has(key)) {
                global.client.antiOutReadded.delete(key);
                return false;
            }
            return true;
        });

        if (!filteredUsers.length) return;

        const names = filteredUsers.map(user => user.fullName);
        const memberNumbers = filteredUsers
            .map((_, index) => participantIDs.length - index)
            .sort((a, b) => a - b);

        let msg;

        if (typeof threadData.customJoin === "undefined") {
            msg =
                `🎉 Welcome ${names.join(", ")}!\n\n` +
                `You just joined ${threadName}.\n` +
                `You are member no. ${memberNumbers.join(", ")}.\n\n` +
                `😄 Have fun, chat a lot, and pretend to be productive.\n` +
                `📌 Please do not press random buttons unless you enjoy consequences.`;
        } else {
            msg = threadData.customJoin
                .replace(/\{name}/g, names.join(", "))
                .replace(/\{type}/g, names.length > 1 ? "Friends" : "Friend")
                .replace(/\{soThanhVien}/g, memberNumbers.join(", "))
                .replace(/\{threadName}/g, threadName);
        }

        return api.sendMessage(msg, threadID);
    } catch (e) {
        return console.log(e);
    }
};