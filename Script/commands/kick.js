module.exports.config = {
	name: "kick",
	version: "2.0.5",
	hasPermssion: 1,
	credits: "ChatGPT",
	description: "Remove a mentioned, replied, or named user from the group",
	commandCategory: "group",
	usages: "[mention/reply/id]",
	cooldowns: 3,
};

module.exports.run = async function({ api, args, Users, event, Threads, utils, client }) {
	let { messageID, threadID, senderID } = event;
	
	var info = await api.getThreadInfo(threadID);
	
	if (!info.adminIDs.some(item => item.id == api.getCurrentUserID())) {
		return api.sendMessage('Bot needs group admin permission to use this command', threadID, messageID);
	}
	
	if (!info.adminIDs.some(item => item.id == senderID) && !(global.config.ADMINBOT || []).includes(senderID)) {
		return api.sendMessage('Only group admins can use this command', threadID, messageID);
	}
	
	if (event.type == "message_reply") {
		let targetId = event.messageReply.senderID;
		
		if (targetId == senderID) {
			return api.sendMessage('You cannot kick yourself', threadID, messageID);
		}
		
		if (targetId == api.getCurrentUserID()) {
			return api.sendMessage('You cannot kick the bot', threadID, messageID);
		}
		
		if (info.adminIDs.some(item => item.id == targetId)) {
			return api.sendMessage('Cannot kick a group admin', threadID, messageID);
		}
		
		let userInfo = await api.getUserInfo(targetId);
		let name = userInfo[targetId].name;
		
		api.removeUserFromGroup(targetId, threadID, (err) => {
			if (err) {
				return api.sendMessage(`Failed to kick ${name}`, threadID, messageID);
			}
			return api.sendMessage(`*security guard voice* GET OUT! 🗣️ ${name} has been removed from the group. Bye Bye!`, threadID, messageID);
		});
		return;
	}
	
	let body = event.body || "";
	let commandParts = body.trim().split(/\s+/);
	
	if (commandParts[1] && (commandParts[1] == "id" || !isNaN(commandParts[1]))) {
		let targetId = null;
		
		if (commandParts[1] == "id" && commandParts[2]) {
			targetId = commandParts[2];
		} else if (!isNaN(commandParts[1])) {
			targetId = commandParts[1];
		}
		
		if (targetId) {
			if (targetId == senderID) {
				return api.sendMessage('You cannot kick yourself', threadID, messageID);
			}
			
			if (targetId == api.getCurrentUserID()) {
				return api.sendMessage('You cannot kick the bot', threadID, messageID);
			}
			
			if (info.adminIDs.some(item => item.id == targetId)) {
				return api.sendMessage('Cannot kick a group admin', threadID, messageID);
			}
			
			let userInfo = await api.getUserInfo(targetId);
			let name = userInfo[targetId].name;
			
			api.removeUserFromGroup(targetId, threadID, (err) => {
				if (err) {
					return api.sendMessage(`Failed to kick ${name}`, threadID, messageID);
				}
				return api.sendMessage(`*security guard voice* GET OUT! 🗣️ ${name} has been removed from the group. Bye Bye!`, threadID, messageID);
			});
			return;
		}
	}
	
	let searchName = body.replace(/^\/?kick\s+/i, "").replace(/^@+/, "").trim();
	
	if (!searchName) {
		return api.sendMessage('Please use: /kick @username OR /kick id USER_ID OR reply to a message', threadID, messageID);
	}
	
	let allMatches = [];
	
	for (let participant of info.participantIDs) {
		try {
			let userInfo = await api.getUserInfo(participant);
			let name = userInfo[participant].name;
			let nickname = userInfo[participant].vanity || "";
			let firstName = userInfo[participant].firstName || "";
			
			if (name) {
				let nameLower = name.toLowerCase();
				let searchLower = searchName.toLowerCase();
				
				if (nameLower === searchLower || nameLower.includes(searchLower) || firstName.toLowerCase().includes(searchLower)) {
					allMatches.push({ 
						id: participant, 
						name: name,
						nickname: nickname,
						firstName: firstName
					});
				}
			}
		} catch(e) {}
	}
	
	let validMatches = [];
	for (let match of allMatches) {
		if (match.id != senderID && !info.adminIDs.some(item => item.id == match.id)) {
			validMatches.push(match);
		}
	}
	
	if (validMatches.length === 0) {
		return api.sendMessage(`No user found with name "${searchName}". Try using ID: /kick id USER_ID`, threadID, messageID);
	}
	
	if (validMatches.length === 1) {
		let target = validMatches[0];
		api.removeUserFromGroup(target.id, threadID, (err) => {
			if (err) {
				return api.sendMessage(`Failed to kick ${target.name}`, threadID, messageID);
			}
			return api.sendMessage(`*security guard voice* GET OUT! 🗣️ ${target.name} has been removed from the group. Bye Bye!`, threadID, messageID);
		});
		return;
	}
	
	let msg = `Multiple users found with "${searchName}". Please use ID to kick:\n\n`;
	for (let i = 0; i < validMatches.length; i++) {
		let match = validMatches[i];
		let displayName = match.name;
		
		if (match.nickname && match.nickname.length > 0) {
			displayName = `${match.name} (@${match.nickname})`;
		}
		
		msg += `${i+1}. /kick id ${match.id} (${displayName})\n`;
	}
	msg += `\nTip: Use /kick id USER_ID to kick directly`;
	
	return api.sendMessage(msg, threadID, messageID);
};