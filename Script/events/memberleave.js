module.exports.config = {
    name: "memberleave",
    eventType: ["log:unsubscribe"],
    version: "2.0.0",
    credits: "CYBER BOT TEAM + Modified by ChatGPT",
    description: "Handle member leave events with anti out support"
};

module.exports.onLoad = function () {
    // Store users restored by anti out so welcome messages can be suppressed
    if (!global.client.antiOutReadded) global.client.antiOutReadded = new Map();

    // Store users kicked by anti join so leave messages can be suppressed
    if (!global.client.antiJoinKicked) global.client.antiJoinKicked = new Map();

    return;
};

module.exports.run = async function ({ api, event, Users, Threads }) {
    try {
        const threadID = event.threadID;
        const leftUserId = event.logMessageData.leftParticipantFbId;

        // Ignore if bot itself left
        if (leftUserId == api.getCurrentUserID()) return;

        const data =
            global.data.threadData.get(parseInt(threadID)) ||
            (await Threads.getData(threadID)).data ||
            {};

        const name =
            global.data.userName.get(leftUserId) ||
            await Users.getNameUser(leftUserId);

        const leftBySelf = event.author == leftUserId;
        const type = leftBySelf ? "left on their own" : "was removed";

        // If user was kicked by anti join, suppress leave message
        if (global.client.antiJoinKicked && global.client.antiJoinKicked.has(`${threadID}_${leftUserId}`)) {
            global.client.antiJoinKicked.delete(`${threadID}_${leftUserId}`);
            return;
        }

        // If anti out is enabled and user left by self, re-add them
        if (data.antiout === true && leftBySelf) {
            try {
                global.client.antiOutReadded.set(`${threadID}_${leftUserId}`, true);

                setTimeout(() => {
                    global.client.antiOutReadded.delete(`${threadID}_${leftUserId}`);
                }, 30000);

                await api.addUserToGroup(leftUserId, threadID);

                return api.sendMessage(
                    `»» NOTICE ««\n${name} tried to leave the group, but Anti-Out is active.\nThe member has been added back successfully.`,
                    threadID
                );
            } catch (e) {
                return api.sendMessage(
                    `⚠️ ${name} tried to leave, but I could not add them back.\nPlease make sure I have admin permission.`,
                    threadID
                );
            }
        }

        // Normal goodbye message when anti out is off
        let msg;

        if (typeof data.customLeave === "undefined") {
            msg =
                `👋 Goodbye ${name}!\n\n` +
                `They ${type}.\n` +
                `The chat is now slightly less chaotic.\n\n` +
                `😅 We will pretend not to miss them.\n` +
                `📦 One less legend in the group.`;
        } else {
            msg = data.customLeave
                .replace(/\{name}/g, name)
                .replace(/\{type}/g, type)
                .replace(/\{session}/g, "")
                .replace(/\{time}/g, "");
        }

        return api.sendMessage(msg, threadID);
    } catch (e) {
        return console.log(e);
    }
};