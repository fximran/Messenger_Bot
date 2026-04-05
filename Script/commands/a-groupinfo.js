module.exports.config = {
    name: "groupinfo",
    version: "2.1.0",
    hasPermssion: 0,
    credits: "MQL1 Community + Modified by ChatGPT",
    description: "View group information, admin list, and user information",
    commandCategory: "Group",
    usages: "info / admins / me / [uid]",
    cooldowns: 4,
    dependencies: {
        "request": "",
        "fs": ""
    }
};

module.exports.run = async function ({ api, event, args, Threads, Users }) {
    const fs = global.nodemodule["fs-extra"];
    const request = global.nodemodule["request"];

    if (args.length == 0) {
        return api.sendMessage(
            `📌 Group Info Commands:\n\n` +
            `🔹 /groupinfo info - View current group information\n` +
            `🔹 /groupinfo admins - View admin list with profile links\n` +
            `🔹 /groupinfo me - View your own information\n` +
            `🔹 /groupinfo [uid] - View user information by UID`,
            event.threadID,
            event.messageID
        );
    }

    // GROUP INFORMATION
    if (args[0] == "info") {
        try {
            const threadInfo = await api.getThreadInfo(event.threadID);
            const threadMem = threadInfo.participantIDs.length;

            let male = 0;
            let female = 0;
            let unknown = 0;

            for (let user of threadInfo.userInfo) {
                if (user.gender == "MALE") male++;
                else if (user.gender == "FEMALE") female++;
                else unknown++;
            }

            const adminCount = threadInfo.adminIDs.length;
            const messageCount = threadInfo.messageCount || 0;
            const emoji = threadInfo.emoji || "None";
            const groupName = threadInfo.threadName || "Unknown";
            const groupID = threadInfo.threadID;
            const approvalMode = threadInfo.approvalMode ? "✅ On" : "❎ Off";

            let adminList = "";
            for (let i = 0; i < threadInfo.adminIDs.length; i++) {
                const adminId = threadInfo.adminIDs[i].id;
                try {
                    const userInfo = await api.getUserInfo(adminId);
                    const adminName = userInfo[adminId].name || "Unknown";
                    adminList += `• ${adminName}\n`;
                } catch (e) {
                    adminList += `• Unknown (${adminId})\n`;
                }
            }

            const message =
`╔══════════════════════════╗
        📊 𝐆𝐑𝐎𝐔𝐏 𝐈𝐍𝐅𝐎
╚══════════════════════════╝

📛 𝐍𝐚𝐦𝐞: ${groupName}
🆔 𝐈𝐃: ${groupID}
😀 𝐄𝐦𝐨𝐣𝐢: ${emoji}
🔒 𝐀𝐩𝐩𝐫𝐨𝐯𝐚𝐥: ${approvalMode}

━━━━━━━━━━━━━━━━━━━━

👥 𝐌𝐞𝐦𝐛𝐞𝐫𝐬:
   • 𝐓𝐨𝐭𝐚𝐥: ${threadMem}
   • 👨 𝐌𝐚𝐥𝐞: ${male}
   • 👩 𝐅𝐞𝐦𝐚𝐥𝐞: ${female}
   • ❓ 𝐔𝐧𝐤𝐧𝐨𝐰𝐧: ${unknown}

━━━━━━━━━━━━━━━━━━━━

👑 𝐀𝐝𝐦𝐢𝐧𝐬 (${adminCount}):
${adminList || "   No admin found"}

━━━━━━━━━━━━━━━━━━━━

💬 𝐌𝐞𝐬𝐬𝐚𝐠𝐞𝐬: ${messageCount}

━━━━━━━━━━━━━━━━━━━━`;

            if (threadInfo.imageSrc) {
                const imgPath = __dirname + "/cache/group_info_img.png";
                request(encodeURI(threadInfo.imageSrc))
                    .pipe(fs.createWriteStream(imgPath))
                    .on("close", () => {
                        api.sendMessage(
                            {
                                body: message,
                                attachment: fs.createReadStream(imgPath)
                            },
                            event.threadID,
                            () => {
                                fs.unlinkSync(imgPath);
                            },
                            event.messageID
                        );
                    });
            } else {
                api.sendMessage(message, event.threadID, event.messageID);
            }
        } catch (error) {
            console.error("Group info error:", error);
            api.sendMessage("❌ Failed to get group information.", event.threadID, event.messageID);
        }
        return;
    }

    // ADMIN LIST WITH PROFILE LINK
    else if (args[0] == "admins" || args[0] == "admin") {
        try {
            let threadInfo = await api.getThreadInfo(event.threadID);
            let adminIDs = threadInfo.adminIDs || [];

            if (adminIDs.length === 0) {
                return api.sendMessage("❌ No admin found in this group.", event.threadID, event.messageID);
            }

            let msg = "╭──────────────────╮\n";
            msg += "│  👑 ADMIN LIST   │\n";
            msg += "╰──────────────────╯\n\n";

            let count = 1;

            for (let admin of adminIDs) {
                let adminId = admin.id;

                try {
                    let userInfo = await api.getUserInfo(adminId);
                    let name = userInfo[adminId].name || "Unknown";
                    let profileUrl = userInfo[adminId].profileUrl || "No profile link";

                    msg += `${count}. 👤 Name: ${name}\n`;
                    msg += `   🆔 ID: ${adminId}\n`;
                    msg += `   🔗 Profile: ${profileUrl}\n`;
                    if (adminId == event.senderID) msg += `   ⭐ YOU\n`;
                    msg += `   ─────────────\n`;

                    count++;
                } catch (e) {
                    msg += `${count}. 👤 Name: Unknown User\n`;
                    msg += `   🆔 ID: ${adminId}\n`;
                    msg += `   🔗 Profile: No profile link\n`;
                    msg += `   ─────────────\n`;

                    count++;
                }
            }

            msg += `\n📊 Total: ${adminIDs.length} Admin(s)`;
            return api.sendMessage(msg, event.threadID, event.messageID);
        } catch (e) {
            return api.sendMessage("❌ Could not get admin list!", event.threadID, event.messageID);
        }
    }

    // SHOW MY INFO
    else if (args[0] == "me") {
        let targetId = event.senderID;

        try {
            let data = await api.getUserInfo(targetId);
            let user = data[targetId];

            if (!user) {
                return api.sendMessage("❌ User not found!", event.threadID, event.messageID);
            }

            let profileUrl = user.profileUrl || "No profile URL";
            let isFriend = user.isFriend ? "Yes" : "No";
            let username = user.vanity || "No username";
            let name = user.name || "Unknown";
            let gender = user.gender == 2 ? "Male" : user.gender == 1 ? "Female" : "Not specified";

            let callback = () => api.sendMessage(
                {
                    body:
                        `👤 USER INFORMATION 👤\n\n` +
                        `📛 Name: ${name}\n` +
                        `🔗 Profile: ${profileUrl}\n` +
                        `💦 Username: ${username}\n` +
                        `🆔 UID: ${targetId}\n` +
                        `⚧ Gender: ${gender}\n` +
                        `🤝 Friend with bot: ${isFriend}`,
                    attachment: fs.createReadStream(__dirname + "/cache/user_info.png")
                },
                event.threadID,
                () => fs.unlinkSync(__dirname + "/cache/user_info.png"),
                event.messageID
            );

            return request(
                encodeURI(
                    `https://graph.facebook.com/${targetId}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`
                )
            )
                .pipe(fs.createWriteStream(__dirname + "/cache/user_info.png"))
                .on("close", () => callback());
        } catch (e) {
            return api.sendMessage("❌ Error fetching your information. Please try again.", event.threadID, event.messageID);
        }
    }

    // SHOW USER INFO BY UID
    else if (!isNaN(args[0])) {
        let targetId = args[0];

        try {
            let data = await api.getUserInfo(targetId);
            let user = data[targetId];

            if (!user) {
                return api.sendMessage("❌ User not found!", event.threadID, event.messageID);
            }

            let profileUrl = user.profileUrl || "No profile URL";
            let isFriend = user.isFriend ? "Yes" : "No";
            let username = user.vanity || "No username";
            let name = user.name || "Unknown";
            let gender = user.gender == 2 ? "Male" : user.gender == 1 ? "Female" : "Not specified";

            let callback = () => api.sendMessage(
                {
                    body:
                        `👤 USER INFORMATION 👤\n\n` +
                        `📛 Name: ${name}\n` +
                        `🔗 Profile: ${profileUrl}\n` +
                        `💦 Username: ${username}\n` +
                        `🆔 UID: ${targetId}\n` +
                        `⚧ Gender: ${gender}\n` +
                        `🤝 Friend with bot: ${isFriend}`,
                    attachment: fs.createReadStream(__dirname + "/cache/user_info.png")
                },
                event.threadID,
                () => fs.unlinkSync(__dirname + "/cache/user_info.png"),
                event.messageID
            );

            return request(
                encodeURI(
                    `https://graph.facebook.com/${targetId}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`
                )
            )
                .pipe(fs.createWriteStream(__dirname + "/cache/user_info.png"))
                .on("close", () => callback());
        } catch (e) {
            return api.sendMessage("❌ Error fetching user information. Please try again.", event.threadID, event.messageID);
        }
    }

    // INVALID COMMAND
    else {
        return api.sendMessage(
            `❌ Invalid command!\n\n` +
            `📌 Use:\n` +
            `• /groupinfo info - Group information\n` +
            `• /groupinfo admins - Admin list with profile links\n` +
            `• /groupinfo me - Your information\n` +
            `• /groupinfo [uid] - User information by UID`,
            event.threadID,
            event.messageID
        );
    }
};