module.exports.config = {
 name: "antiout",
 eventType: ["log:unsubscribe"],
 version: "2.0.0",
 credits: "ChatGPT",
 description: "Re-add users unless removed by an admin"
};

module.exports.run = async ({ event, api, Threads, Users }) => {
 try {
  let data = (await Threads.getData(event.threadID)).data || {};
  let threadInfo = (await Threads.getData(event.threadID)).threadInfo || {};

  // Keep old antiout toggle style
  if (data.antiout == false) return;

  const leftID = String(event.logMessageData.leftParticipantFbId);
  const authorID = String(event.author || "");
  const botID = String(api.getCurrentUserID());

  // If bot itself left/removed, do nothing
  if (leftID === botID) return;

  const adminIDs = (threadInfo.adminIDs || []).map(item => String(item.id));
  const isAuthorAdmin = adminIDs.includes(authorID);
  const isAuthorBotAdmin = (global.config.ADMINBOT || []).map(String).includes(authorID);

  const leftName =
   global.data.userName.get(leftID) || await Users.getNameUser(leftID);

  let authorName = "Unknown User";
  try {
   if (authorID) {
    authorName = global.data.userName.get(authorID) || await Users.getNameUser(authorID);
   }
  } catch (e) {}

  // self leave
  const isSelfLeave = !authorID || authorID === leftID;

  // If removed by admin, allow it
  if (!isSelfLeave && (isAuthorAdmin || isAuthorBotAdmin)) {
   return api.sendMessage(
    `»» NOTICE ««\n${leftName} was removed by admin ${authorName}. No action was taken.`,
    event.threadID
   );
  }

  // Otherwise re-add
  return api.addUserToGroup(leftID, event.threadID, function (error) {
   if (error) {
    return api.sendMessage(
     `»» NOTICE ««\nI could not add ${leftName} back to the group.\nReason: The user may have blocked the bot or disabled group adds.`,
     event.threadID
    );
   }

   if (isSelfLeave) {
    return api.sendMessage(
     `»» NOTICE ««\n${leftName} tried to leave the group, but Anti-Out is active.\nThe member has been added back successfully.`,
     event.threadID
    );
   }

   return api.sendMessage(
    `»» NOTICE ««\n${leftName} was removed by a non-admin user (${authorName}).\nThe member has been added back successfully.`,
    event.threadID
   );
  });
 } catch (e) {
  console.log(e);
 }
};