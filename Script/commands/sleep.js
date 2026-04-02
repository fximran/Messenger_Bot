module.exports.config = {
	name: "sleep",
	version: "1.0.1",
	hasPermssion: 0,
	credits: "𝗜𝘀𝗹𝗮𝗺𝗶𝗰𝗸 𝗖𝗵𝗮𝘁 𝗕𝗼𝘁",
	description: "Calculate the perfect bedtime for you",
	commandCategory: "health",
	usages: "[Time]",
	cooldowns: 5,
	dependencies: {
		"moment-timezone": ""
	}
};

module.exports.languages = {
	"vi": {
		"returnTimeNow": "╭•┄┅════❁🌺❁════┅┄•╮\n\nআপনি যদি এখন ঘুমাতে যান, ঘুম থেকে ওঠার সবচেয়ে উপযুক্ত সময়\n%1 \n\n╰•┄┅════❁🌺❁════┅┄•╯",
		"returnTimeSet": "╭•┄┅════❁🌺❁════┅┄•╮\n\n আপনি যদি %1 এ ঘুমাতে যান, তাহলে ঘুম থেকে ওঠার উপযুক্ত সময় হল:\n%2 \n\n╰•┄┅════❁🌺❁════┅┄•╯"	
	},
	"en": {
		"returnTimeNow": "╭•┄┅════❁🌺❁════┅┄•╮\n\n আপনি যদি এখন ঘুমাতে যান, ঘুম থেকে ওঠার উপযুক্ত সময় হল:\n%1 \n\n╰•┄┅════❁🌺❁════┅┄•╯",
		"returnTimeSet": "╭•┄┅════❁🌺❁════┅┄•╮\n\nআপনি যদি %1 এ ঘুমাতে যান, তাহলে ঘুম থেকে ওঠার উপযুক্ত সময় হল:\n%2\n\n╰•┄┅════❁🌺❁════┅┄•╯"	
	}
}

module.exports.run = function({ api, event, args, getText }) {
	const { threadID, messageID } = event;
	const { throwError } = global.utils;
	const moment = global.nodemodule["moment-timezone"];

	var wakeTime = [];
	let content = args.join(" ")
	if (!content) {
		for (var i = 1; i < 7; i++) wakeTime.push(moment().tz("Dhaka/Bangladesh").add(90 * i + 15, 'm').format("HH:mm"));
		return api.sendMessage(getText("returnTimeNow", wakeTime.join(', ')), threadID, messageID);
	}
	else {
		if (content.indexOf(":") == -1) return throwError(this.config.name, threadID, messageID);
		var contentHour = content.split(":")[0];
		var contentMinute = content.split(":")[1];
		if (isNaN(contentHour) || isNaN(contentMinute) || contentHour > 23 || contentMinute > 59 || contentHour < 0 || contentMinute < 0 || contentHour.length != 2 || contentMinute.length != 2) return global.utils.throwError(this.config.name, threadID, messageID);
		var getTime = moment().tz("Dhaka/Bangladesh").format();
		var time = getTime.slice(getTime.indexOf("T") + 1, getTime.indexOf("+"));
		var hour = time.split(":")[0];
		var minute = time.split(":")[1];
		var sleepTime = getTime.replace(hour + ":", contentHour + ":").replace(minute + ":", contentMinute + ":");
		for (var i = 1; i < 7; i++) wakeTime.push(moment(sleepTime).tz("Dhaka/Bangladesh").add(90 * i + 15, 'm').format("HH:mm"));
		return api.sendMessage(getText("returnTimeSet", content, wakeTime.join(', ')), threadID, messageID);
	}
}   