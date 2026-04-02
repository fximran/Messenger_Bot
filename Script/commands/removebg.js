module.exports.config = {
 name: 'removebg',
 version: '1.1.1',
 hasPermssion: 0,
 credits: 'Shaon Ahmed',
 description: 'Edit photo',
 usePrefix: true,
 commandCategory: 'Tools',
 usages: 'Reply images or url images',
 cooldowns: 2,
 dependencies: {
 'form-data': '',
 'image-downloader': ''
 }
};

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs-extra');
const path = require('path');
const {image} = require('image-downloader');
module.exports.run = async function({
 api, event, args
}){
 try {
 var shaon = `🖼️=== [ REMOVING BACKGROUND ] ===🖼️`;
 if (event.type !== "message_reply") return api.sendMessage("🖼️ | You must to reply the photo you want to removed bg", event.threadID, event.messageID);
 if (!event.messageReply.attachments || event.messageReply.attachments.length == 0) return api.sendMessage("✅ | Removed Background Has Been Successfully ", event.threadID, event.messageID);
 if (event.messageReply.attachments[0].type != "photo") return api.sendMessage("❌ | This Media is not available", event.threadID, event.messageID);

 const content = (event.type == "message_reply") ? event.messageReply.attachments[0].url : args.join(" ");
 const MtxApi = ["W8ApL7juv8CSLzBXknA3DwxU"]
 const inputPath = path.resolve(__dirname, 'cache', `photo.png`);
 await image({
 url: content, dest: inputPath
 });
 const formData = new FormData();
 formData.append('size', 'auto');
 formData.append('image_file', fs.createReadStream(inputPath), path.basename(inputPath));
 axios({
 method: 'post',
 url: 'https://api.remove.bg/v1.0/removebg',
 data: formData,
 responseType: 'arraybuffer',
 headers: {
 ...formData.getHeaders(),
 'X-Api-Key': MtxApi[Math.floor(Math.random() * MtxApi.length)],
 },
 encoding: null
 })
 .then((response) => {
 if (response.status != 200) return console.error('Error:', response.status, response.statusText);
 fs.writeFileSync(inputPath, response.data);
 return api.sendMessage({body:shaon, attachment: fs.createReadStream(inputPath) }, event.threadID, () => fs.unlinkSync(inputPath));
 })
 .catch((error) => {
 return console.error('❐ ɪsʟᴀᴍɪᴄ ʙᴏᴛ 𝚂𝙴𝚁𝚅𝙴𝚁 𝙱𝚄𝚂𝚈 𝙽𝙾𝚆 🚨:', error);
 });
 } catch (e) {
 console.log(e)
 return api.sendMessage(`❐ ɪsʟᴀᴍɪᴄ ʙᴏᴛ 𝚂𝙴𝚁𝚅𝙴𝚁 𝙱𝚄𝚂𝚈 𝙽𝙾𝚆 🚨`, event.threadID, event.messageID);
 }
 }
