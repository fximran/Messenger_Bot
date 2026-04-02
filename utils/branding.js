const pkg = require("../package.json");

const branding = pkg.branding || {};

module.exports = {
  packageName: pkg.name || "jarvis-bot",
  version: pkg.version || "1.0.0",
  description: pkg.description || "Made by SANS FERRARO",
  author: pkg.author || "SANS FERRARO",

  botName: branding.botName || pkg.name || "Jarvis Bot",
  ownerName: branding.ownerName || pkg.author || "SANS FERRARO",
  loaderName: branding.loaderName || "JARVIS LOADED",
  stateName: branding.stateName || "JarvisState",
  teamName: branding.teamName || "MQL1 BOT TEAM",
  supportContact: branding.supportContact || "facebook.com/mdimranhossain.mdih123",
  subjectName: branding.subjectName || "user",
  mqttTitle: branding.mqttTitle || "JARVIS-FCA MQTT CONNECTED",
  consoleTag: branding.consoleTag || "jarvis"
};