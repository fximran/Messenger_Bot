const fs = require("fs");

module.exports.config = {
    name: "adminUpdate",
    eventType: [
        "log:thread-admins",
        "log:thread-name",
        "log:user-nickname",
        "log:thread-icon",
        "log:thread-call",
        "log:thread-color"
    ],
    version: "2.0.0",
    credits: "ChatGPT + Edited for your bot",
    description: "Protect and update group information with admin-only restore logic",
    envConfig: {
        sendNoti: true
    }
};

module.exports.run = async function ({ event, api, Threads, Users }) {
    const iconPath = __dirname + "/emoji.json";
    if (!fs.existsSync(iconPath)) fs.writeFileSync(iconPath, JSON.stringify({}));

    const { threadID, logMessageType, logMessageData } = event;
    const { setData, getData } = Threads;

    const thread = global.data.threadData.get(threadID) || {};
    if (typeof thread["adminUpdate"] !== "undefined" && thread["adminUpdate"] === false) return;

    try {
        let dataThread = (await getData(threadID)).threadInfo;

        if (!dataThread.adminIDs) dataThread.adminIDs = [];
        if (!dataThread.nicknames) dataThread.nicknames = {};

        const botID = String(api.getCurrentUserID());
        const authorID = String(event.author || "");
        const adminIDs = (dataThread.adminIDs || []).map(item => String(item.id));
        const isBotAdmin = adminIDs.includes(botID);
        const isAuthorAdmin = adminIDs.includes(authorID);
        const isAuthorBotAdmin = (global.config.ADMINBOT || []).map(String).includes(authorID);

        let authorName = authorID || "Unknown User";
        try {
            if (authorID) authorName = await Users.getNameUser(authorID);
        } catch (e) {}

        const sendMentionNotice = async (body, mentionID = null, mentionName = null) => {
            const form = { body };
            if (mentionID && mentionName) {
                form.mentions = [{
                    tag: `@${mentionName}`,
                    id: String(mentionID)
                }];
            }
            return api.sendMessage(form, threadID);
        };

        switch (logMessageType) {
            case "log:thread-admins": {
                const targetID = String(logMessageData.TARGET_ID || "");
                let targetName = targetID || "Unknown User";

                try {
                    if (targetID) targetName = await Users.getNameUser(targetID);
                } catch (e) {}

                const isAdd = logMessageData.ADMIN_EVENT === "add_admin";
                const isRemove = logMessageData.ADMIN_EVENT === "remove_admin";

                // Bot changed it নিজে করলে data শুধু update
                if (authorID === botID) {
                    if (isAdd && !dataThread.adminIDs.some(item => String(item.id) === targetID)) {
                        dataThread.adminIDs.push({ id: targetID });
                    }
                    if (isRemove) {
                        dataThread.adminIDs = dataThread.adminIDs.filter(item => String(item.id) !== targetID);
                    }
                    break;
                }

                // non-admin tries to add/remove admin
                if (!isAuthorAdmin && !isAuthorBotAdmin) {
                    if (!isBotAdmin) {
                        return sendMentionNotice(
`»» NOTICE ««
@${authorName}, you are not an admin, so you cannot change admin roles.

👤 User: ${targetName}
🔁 Attempted action: ${isAdd ? "Add admin" : "Remove admin"}
❌ I could not restore the previous state because I am not a group admin.`,
                            authorID,
                            authorName
                        );
                    }

                    if (isAdd) {
                        return api.changeAdminStatus(threadID, targetID, false, async (err) => {
                            if (err) {
                                return sendMentionNotice(
`»» NOTICE ««
@${authorName}, you are not an admin, so you cannot change admin roles.

👤 User: ${targetName}
🔁 Attempted action: Add admin
❌ Failed to restore the previous admin state: ${err.message || err}`,
                                    authorID,
                                    authorName
                                );
                            }

                            dataThread.adminIDs = dataThread.adminIDs.filter(item => String(item.id) !== targetID);
                            await setData(threadID, { threadInfo: dataThread });

                            return sendMentionNotice(
`»» NOTICE ««
@${authorName}, you are not an admin, so you cannot add admins.

👤 User: ${targetName}
🔁 Attempted action: Add admin
↩️ The previous admin state has been restored.`,
                                authorID,
                                authorName
                            );
                        });
                    }

                    if (isRemove) {
                        return api.changeAdminStatus(threadID, targetID, true, async (err) => {
                            if (err) {
                                return sendMentionNotice(
`»» NOTICE ««
@${authorName}, you are not an admin, so you cannot change admin roles.

👤 User: ${targetName}
🔁 Attempted action: Remove admin
❌ Failed to restore the previous admin state: ${err.message || err}`,
                                    authorID,
                                    authorName
                                );
                            }

                            if (!dataThread.adminIDs.some(item => String(item.id) === targetID)) {
                                dataThread.adminIDs.push({ id: targetID });
                            }
                            await setData(threadID, { threadInfo: dataThread });

                            return sendMentionNotice(
`»» NOTICE ««
@${authorName}, you are not an admin, so you cannot remove admins.

👤 User: ${targetName}
🔁 Attempted action: Remove admin
↩️ The previous admin state has been restored.`,
                                authorID,
                                authorName
                            );
                        });
                    }
                }

                // admin changed it
                if (isAdd && !dataThread.adminIDs.some(item => String(item.id) === targetID)) {
                    dataThread.adminIDs.push({ id: targetID });
                }

                if (isRemove) {
                    dataThread.adminIDs = dataThread.adminIDs.filter(item => String(item.id) !== targetID);
                }

                if (global.configModule[this.config.name].sendNoti) {
                    await sendMentionNotice(
`»» NOTICE ««
👤 User: ${targetName}
🔁 Action: ${isAdd ? "Added as admin" : "Removed from admin"}
✅ Changed by: ${authorName}`,
                        authorID,
                        authorName
                    );
                }
                break;
            }

            case "log:user-nickname": {
                const targetID = String(logMessageData.participant_id);
                let targetName = targetID;

                try {
                    targetName = await Users.getNameUser(targetID);
                } catch (e) {}

                const oldNickname =
                    typeof dataThread.nicknames[targetID] !== "undefined" &&
                    dataThread.nicknames[targetID] !== null &&
                    dataThread.nicknames[targetID] !== ""
                        ? dataThread.nicknames[targetID]
                        : "";

                const newNickname =
                    typeof logMessageData.nickname !== "undefined" &&
                    logMessageData.nickname !== null
                        ? logMessageData.nickname
                        : "";

                if (authorID === botID) {
                    dataThread.nicknames[targetID] = newNickname;
                    break;
                }

                if (!isAuthorAdmin && !isAuthorBotAdmin) {
                    if (!isBotAdmin) {
                        return sendMentionNotice(
`»» NOTICE ««
@${authorName}, you are not an admin, so you cannot change nicknames.

👤 User: ${targetName}
📝 Previous nickname: ${oldNickname || "original name"}
🆕 Attempted nickname: ${newNickname || "original name"}
❌ I could not restore the previous nickname because I am not a group admin.`,
                            authorID,
                            authorName
                        );
                    }

                    return api.changeNickname(oldNickname, threadID, targetID, async (err) => {
                        if (err) {
                            return sendMentionNotice(
`»» NOTICE ««
@${authorName}, you are not an admin, so you cannot change nicknames.

👤 User: ${targetName}
📝 Previous nickname: ${oldNickname || "original name"}
🆕 Attempted nickname: ${newNickname || "original name"}
❌ Failed to restore the previous nickname: ${err.message || err}`,
                                authorID,
                                authorName
                            );
                        }

                        dataThread.nicknames[targetID] = oldNickname;
                        await setData(threadID, { threadInfo: dataThread });

                        return sendMentionNotice(
`»» NOTICE ««
@${authorName}, you are not an admin, so you cannot change nicknames.

👤 User: ${targetName}
📝 Previous nickname: ${oldNickname || "original name"}
🆕 Attempted nickname: ${newNickname || "original name"}
↩️ The previous nickname has been restored.`,
                            authorID,
                            authorName
                        );
                    });
                }

                dataThread.nicknames[targetID] = newNickname;

                if (global.configModule[this.config.name].sendNoti) {
                    await sendMentionNotice(
`»» NOTICE ««
👤 User: ${targetName}
📝 Previous nickname: ${oldNickname || "original name"}
🆕 New nickname: ${newNickname || "original name"}
✅ Changed by: ${authorName}`,
                        authorID,
                        authorName
                    );
                }
                break;
            }

            case "log:thread-name": {
                const oldThreadName =
                    typeof dataThread.threadName !== "undefined" &&
                    dataThread.threadName !== null &&
                    dataThread.threadName !== ""
                        ? dataThread.threadName
                        : "No name";

                const newThreadName =
                    typeof logMessageData.name !== "undefined" &&
                    logMessageData.name !== null &&
                    logMessageData.name !== ""
                        ? logMessageData.name
                        : "No name";

                if (authorID === botID) {
                    dataThread.threadName = newThreadName;
                    break;
                }

                if (!isAuthorAdmin && !isAuthorBotAdmin) {
                    if (!isBotAdmin) {
                        return sendMentionNotice(
`»» NOTICE ««
@${authorName}, you are not an admin, so you cannot change the group name.

📝 Previous group name: ${oldThreadName}
🆕 Attempted group name: ${newThreadName}
❌ I could not restore the previous group name because I am not a group admin.`,
                            authorID,
                            authorName
                        );
                    }

                    return api.setTitle(oldThreadName === "No name" ? "" : oldThreadName, threadID, async (err) => {
                        if (err) {
                            return sendMentionNotice(
`»» NOTICE ««
@${authorName}, you are not an admin, so you cannot change the group name.

📝 Previous group name: ${oldThreadName}
🆕 Attempted group name: ${newThreadName}
❌ Failed to restore the previous group name: ${err.message || err}`,
                                authorID,
                                authorName
                            );
                        }

                        dataThread.threadName = oldThreadName;
                        await setData(threadID, { threadInfo: dataThread });

                        return sendMentionNotice(
`»» NOTICE ««
@${authorName}, you are not an admin, so you cannot change the group name.

📝 Previous group name: ${oldThreadName}
🆕 Attempted group name: ${newThreadName}
↩️ The previous group name has been restored.`,
                            authorID,
                            authorName
                        );
                    });
                }

                dataThread.threadName = newThreadName;

                if (global.configModule[this.config.name].sendNoti) {
                    await sendMentionNotice(
`»» NOTICE ««
📝 Previous group name: ${oldThreadName}
🆕 New group name: ${newThreadName}
✅ Changed by: ${authorName}`,
                        authorID,
                        authorName
                    );
                }
                break;
            }
case "log:thread-icon": {
    if (!global.configModule[this.config.name].sendNoti) break;

    let oldIcon = dataThread.threadIcon || "👍";
    let newIcon = event.logMessageData.thread_icon || "👍";

    dataThread.threadIcon = newIcon;

    api.sendMessage({
        body: `»» NOTICE ««\n@${authorName} changed the group emoji.\n📝 Previous emoji: ${oldIcon}\n🆕 New emoji: ${newIcon}`,
        mentions: [{
            tag: `@${authorName}`,
            id: authorID
        }]
    }, threadID);
    break;
}
case "log:thread-color": {
    if (!global.configModule[this.config.name].sendNoti) break;

    api.sendMessage({
        body: `»» NOTICE ««\n@${authorName} changed the group theme/color.`,
        mentions: [{
            tag: `@${authorName}`,
            id: authorID
        }]
    }, threadID);
    break;
}
            case "log:thread-call": {
                // Call events cannot realistically be restored, so notice only
                if (!global.configModule[this.config.name].sendNoti) break;

                if (logMessageData.event === "group_call_started") {
                    const callerName = await Users.getNameUser(logMessageData.caller_id);
                    await api.sendMessage(
                        `[ GROUP UPDATE ]\n❯ ${callerName} started a ${logMessageData.video ? "video " : ""}call.`,
                        threadID
                    );
                } else if (logMessageData.event === "group_call_ended") {
                    const callDuration = logMessageData.call_duration;
                    const hours = Math.floor(callDuration / 3600);
                    const minutes = Math.floor((callDuration - (hours * 3600)) / 60);
                    const seconds = callDuration - (hours * 3600) - (minutes * 60);
                    const timeFormat = `${hours}:${minutes}:${seconds}`;

                    await api.sendMessage(
                        `[ GROUP UPDATE ]\n❯ ${logMessageData.video ? "Video " : ""}call has ended.\n❯ Call duration: ${timeFormat}`,
                        threadID
                    );
                } else if (logMessageData.joining_user) {
                    const joinName = await Users.getNameUser(logMessageData.joining_user);
                    await api.sendMessage(
                        `[ GROUP UPDATE ]\n❯ ${joinName} joined the ${logMessageData.group_call_type == "1" ? "video " : ""}call.`,
                        threadID
                    );
                }
                break;
            }
        }

        await setData(threadID, { threadInfo: dataThread });
    } catch (e) {
        console.log(e);
    }
};