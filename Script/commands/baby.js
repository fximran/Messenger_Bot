const axios = require("axios");

module.exports.config = {
 name: "baby",
 version: "1.0.3",
 hasPermssion: 0,
 credits: "MQL1 Community",
 description: "Cute AI Baby Chatbot",
 commandCategory: "simsim",
 usages: "[message/query]",
 cooldowns: 0
};

// প্রি-ডিফাইন্ড রিপ্লাই লিস্ট
const greetings = [
 "Bolo baby 💬", "হুম? বলো 😺", "হ্যাঁ জানু 😚", "শুনছি বেবি 😘", 
 "এতো ডেকো না,প্রেম এ পরে যাবো তো🙈", "Boss বল boss😼", 
 "আমাকে ডাকলে ,আমি কিন্তু কিস করে দিবো😘", 
 "দূরে যা, তোর কোনো কাজ নাই, শুধু bot bot করিস 😉😋🤣",
 "জান কি? তুমি আমার বস উল্লাস কে ডিস্টার্ব করো না 😒",
 "বলো কিরে 😼", "কি জান চাই? 😚"
];

module.exports.handleEvent = async function ({ api, event }) {
 const raw = event.body ? event.body.toLowerCase().trim() : "";
 if (!raw) return;

 // শুধু প্রি-ডিফাইন্ড কীওয়ার্ড চেক করা
 const keywords = ["baby", "bot", "bby", "jan", "xan", "জান", "বট", "বেবি"];
 const isMatch = keywords.some(keyword => raw === keyword || raw.startsWith(keyword + " "));
 
 if (isMatch) {
 const randomReply = greetings[Math.floor(Math.random() * greetings.length)];
 return api.sendMessage(randomReply, event.threadID, event.messageID);
 }
};

module.exports.run = async function ({ api, event }) {
 api.sendMessage("বলো বেবি 💬", event.threadID);
};