   module.exports.config = {
  name: "try",
  version: "1.2.8",
  hasPermssion: 0,
  credits: "Islamick Chat", //Don't chinge The credit
  description: "See information about the 12 zodiac animals",
  commandCategory: "Utilities",
  usages: "animals",
  cooldowns: 5,
  dependencies: {
    "axios": "",
    "fs-extra": "",
    "request": ""
  } 
}

module.exports.onLoad = () => {
  let { mkdirSync, existsSync, createWriteStream } = require("fs-extra");
  let request = require("request");
  let dirMaterial = __dirname + `/noprefix/12congiap/`; 
  if (!existsSync(dirMaterial + "noprefix" + "12congiap")) mkdirSync(dirMaterial, { recursive: true });

  if (!existsSync(dirMaterial + "sửu.jpg")) request("https://i.imgur.com/11RFXQx.jpg").pipe(createWriteStream(dirMaterial + "sửu.jpg"))

  if (!existsSync(dirMaterial + "tý.jpg")) request("https://i.imgur.com/5HxGOz7.jpg").pipe(createWriteStream(dirMaterial + "tý.jpg"))

  if (!existsSync(dirMaterial + "dần.jpg")) request("https://i.imgur.com/gSzX7nL.jpg").pipe(createWriteStream(dirMaterial + "dần.jpg"))

  if (!existsSync(dirMaterial + "mão.jpg")) request("https://i.imgur.com/SVcdKJp.jpg").pipe(createWriteStream(dirMaterial + "mão.jpg"))

  if (!existsSync(dirMaterial + "thìn.jpg")) request("https://i.imgur.com/ANdQTeq.jpg").pipe(createWriteStream(dirMaterial + "thìn.jpg"))

  if (!existsSync(dirMaterial + "tỵ.jpg")) request("https://i.imgur.com/lnxS2Xr.jpg").pipe(createWriteStream(dirMaterial + "tỵ.jpg"))

  if (!existsSync(dirMaterial + "ngọ.jpg")) request("https://i.imgur.com/FnKVUKI.jpg").pipe(createWriteStream(dirMaterial + "ngọ.jpg"))

  if (!existsSync(dirMaterial + "mùi.jpg")) request("https://i.imgur.com/fOSI3wz.jpg").pipe(createWriteStream(dirMaterial + "mùi.jpg"))

  if (!existsSync(dirMaterial + "thân.jpg")) request("https://i.imgur.com/hPTcpV5.jpg").pipe(createWriteStream(dirMaterial + "thân.jpg"))

  if (!existsSync(dirMaterial + "dậu.jpg")) request("https://i.imgur.com/chW3Tc1.jpg").pipe(createWriteStream(dirMaterial + "dậu.jpg"))

  if (!existsSync(dirMaterial + "tuất.jpg")) request("https://i.imgur.com/7i7GU1t.jpg").pipe(createWriteStream(dirMaterial + "tuất.jpg"))

  if (!existsSync(dirMaterial + "hợi.jpg")) request("https://i.imgur.com/hJ5nfUa.jpg").pipe(createWriteStream(dirMaterial + "hợi.jpg"))

}

module.exports.handleReply = async ({ api, event, handleReply }) => {
  let { createReadStream } = require("fs-extra");
  let { threadID, messageID, senderID, body } = event;
    switch(handleReply.type) {
        case "choosee": {
            switch(body) {

          case "1":
                api.unsendMessage(handleReply.messageID);
      api.sendMessage({
        body: "হে আমাদের পালনকর্তা, আমাদের গুনাহসমূহ মাফ করে দাও, আমাদের থেকে সকল মন্দ দূর করে দাও এবং আমাদের নেক লোকদের সাহচার্য দান কর।", 
        attachment: createReadStream(__dirname + `/noprefix/12congiap/tý.jpg`)
      }, threadID, messageID);
      break;

    case "2":
                api.unsendMessage(handleReply.messageID);
      api.sendMessage({
        body: "ربَّنَا وَلاَ تَحْمِلْ عَلَيْنَا اصْرًا كَمَا حَمَلْتَه عَلَى الَّذِينَ\n\n مِنْ قَبْلِنَا\n\n\nউচ্চারণ : রাব্বানা ওয়ালা, তামিল আ’লাইনা ইস্রান কামা হামালতাহু আলাল্লাযিনা মিন ক্বাবলিনা।\n\nঅর্থ : হে আমাদের রব! আমাদের ওপর সেই ধরনের বোঝা চাপিয়ে দিও না, যেরূপ বোঝা আমাদের পূর্ববর্তী অপরাধী জাতির প্রতি চাপিয়ে দিয়েছিলে ।", 
        attachment: createReadStream(__dirname + `/noprefix/12congiap/sửu.jpg`)
      },threadID, messageID);
      break;

    case "3":
                api.unsendMessage(handleReply.messageID);
      api.sendMessage({
        body: "بِسْمِ اللّهِ اللّهُمَّ جَنِّبْنَا الشَّيْطَانَ وَ جَنِّبِ الشَّيْطَانَ مَا رَزَقْتَنَا উচ্চারণ: 'বিসমিল্লাহি আল্লাহুম্মা জান্নিবনাশ শায়ত্বানা ওয়া জান্নিবিশ শায়ত্বানা মা রাযাক্বতানা।' অর্থ: 'আল্লাহর নামে শুরু করছি, হে আল্লাহ! আমাদেরকে তুমি শয়তান থেকে দূরে রাখ।", 
        attachment: createReadStream(__dirname + `/noprefix/12congiap/dần.jpg`)
      }, threadID, messageID); 
      break;

    case "4":
                api.unsendMessage(handleReply.messageID);
      api.sendMessage({
        body: "الْجَنَّةَ وَالنَّارِ- بِرَحْمَتِكَ يَاعَزِيْزُ يَا غَفَّارُ يَا كَرِيْمُ يَا سَتَّارُ يَا رَحِيْمُ يَاجَبَّارُ يَاخَالِقُ يَابَارُّ - اَللَّهُمَّ اَجِرْنَا مِنَ النَّارِ يَا مُجِيْرُ يَا مُجِيْرُ يَا مُجِيْرُ- بِرَحْمَتِكَ يَا اَرْحَمَ\n\n الرَّحِمِيْنَউচ্চারণ : আল্লাহুম্মা ইন্না-নাসআলুকাল জান্নাতা ওয়া নাউজুবিকা মিনাননার। ইয়া খ-লিক্বল জান্নাতা ওয়ান্নার। বিরাহমাতিকা ইয়া-আজিজু ইয়া-গাফফারু, ইয়া-ক্বারিমু ইয়া-সাত্তারু, ইয়া-রাহিমু ইয়া-জাব্বারু, ইয়া-খলিকু ইয়া-বারর। আল্লাহুম্মা আজিরনা-মিনান্নার। ইয়া-মুজিরু, ইয়া-মুজিরু, ইয়া-মুজিরু। বিরহমাতিকা ইয়া-আরহামার রাহিমিন।", 
        attachment: createReadStream(__dirname + `/noprefix/12congiap/mão.jpg`)
      }, threadID, messageID); 
      break;

    case "5":
                api.unsendMessage(handleReply.messageID);
      api.sendMessage({
        body: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَجْمَعُ عِبَادَكَ أَوْ تَبْعَثُ عِبَادَكَ\n\n উচ্চারণ : ‘আল্লাহুম্মা ক্বিনি আজাবাকা ইয়াওমা তাঝমাউ ইবাদাকা আও তাবআছু ইবাদাকা।’অর্থ : ‘হে আল্লাহ! যেদিন তুমি তোমার বান্দাদের একত্রিত করবে অথবা পুনরায় জীবিত করবে; সেদিন আমাকে তোমার আজাব থেকে হেফাজতে রাখ।’ (তিরমিজি.", 
        attachment: createReadStream(__dirname + `/noprefix/12congiap/thìn.jpg`)
      }, threadID, messageID); 
      break;

    case "6":
                api.unsendMessage(handleReply.messageID);
      api.sendMessage({
        body: "رَبَّنَاۤ اٰمَنَّا فَاغۡفِرۡ لَنَا وَ ارۡحَمۡنَا وَ اَنۡتَ خَیۡرُ الرّٰحِمِیۡنَ\n\n উচ্চারণ- রাব্বানা আমান্না ফাগফিরলানা ওয়ারহামনা ওয়া আংতা খাইরুর রাহিমিন।", 
        attachment: createReadStream(__dirname + `/noprefix/12congiap/tỵ.jpg`)
      }, threadID, messageID); 
      break;

    case "7":
                api.unsendMessage(handleReply.messageID);
      api.sendMessage({
        body: " 7. Horse (Horse 🦓 )\n\n(11-13 o'clock): Horses are highly positive.\n\nPeople born in the year of the Horse often speak gently, comfortably and generously. Therefore, they are easily liked by many people but they rarely listen to advice. People of this age often have a very hot temper. The horse's running speed reminds people of the sun shining on the earth every day. In mythology, the sun is associated with raging horses. This age is often said to be pure, noble and wise. People of this age are often respected because they are intelligent, strong and full of love.", 
        attachment: createReadStream(__dirname + `/noprefix/12congiap/ngọ.jpg`)
      }, threadID, messageID); 
      break;

    case "8":
                api.unsendMessage(handleReply.messageID);
      api.sendMessage({
        body: "8. Mui (Goat 🐐 )\n\n(13-15 hours): When goats eat grass, it does not affect the growth of plants.\n\nPeople born in the year of the Goat are usually very calm but shy, very humble but no stance. They speak very clumsily, so they cannot be good salespeople, but they are very sympathetic to people in need and often help people. They often have an advantage because of their natural kindness and shyness", 
        attachment: createReadStream(__dirname + `/noprefix/12congiap/mùi.jpg`)
      }, threadID, messageID); 
      break;

    case "9":
                api.unsendMessage(handleReply.messageID);
      api.sendMessage({
        body: "9. Monkey (Monkey 🐒 )\n\n(15-17 o'clock): When monkeys like to howl. People born in the year of the Monkey are often talented people with erratic personalities. They are very talented and skillful in money transactions. People of this age are often very cheerful, skillful, curious and creative, but they talk too much so they are easily looked down upon and despised by others. Their shortcomings lie in their erratic and inconsistent temperament", attachment: createReadStream(__dirname + `/noprefix/12congiap/thân.jpg`)
      }, threadID, messageID); 
      break;

    case "10":
                api.unsendMessage(handleReply.messageID);
      api.sendMessage({
        body: "10. Rooster (Chicken 🐓)\n\n(17-19 hours): When the chickens start to roost.\n\nPeople born in the year of the Rooster have many excellent characteristics, such as being honest, bright, and loving to communicate. forward and ambitious. Most of them are born pretty or handsome and like to dress up. In daily life, they rarely rely on others. However, they can quickly become enthusiastic about something, but quickly become impatient. Therefore, they need to have enough faith and patience to be steadfast in one thing.\n\nThe Year of the Rooster symbolizes a period of diligent labor because the rooster must be busy from morning to night. Its creapi.is a sign of extreme intelligence and scholarly wisdom. People born in the year of the Rooster are considered deep thinkers. At the same time, Chicken is considered protection against fire. People born in the year of the Rooster often make a living through small businesses, working diligently like a chicken digging in the ground to find worms", attachment: createReadStream(__dirname + `/noprefix/12congiap/dậu.jpg`)
      }, threadID, messageID); 
            break;

      case "11":
                api.unsendMessage(handleReply.messageID);
      api.sendMessage({
        body: "11. Dog (Dog 🐕 )\n\n(19-21 o'clock): When the dog must be alert to look after the house.\n\nThe Year of the Dog indicates a prosperous future. Around the world, dogs are used to guard homes against intruders. Pairs of fighting dogs are often placed on both sides of the village gate for protection. The Year of the Dog is believed to be a very safe year", 
        attachment: createReadStream(__dirname + `/noprefix/12congiap/tuất.jpg`)
      }, threadID, messageID); 
      break;

      case "12":
                api.unsendMessage(handleReply.messageID);
      api.sandmessage({
        body:"12. Pig ( Pig 🐖 )\n\n(21-23 o'clock): When pigs sleep the deepest.\n\nPig symbolizes wealth because wild boars often make burrows in forests. People born in the year of the Pig are very generous, kind and brave but often very stubborn, hot-tempered but diligent and willing to listen", 
        attachment: createReadStream(__dirname + `/noprefix/12congiap/hợi.jpg`)
      }, threadID, messageID); 
            break;

          default:
        const choose = parseInt(body);
              if (isNaN(body)) return api.sendMessage("•—»✨ একটি নুম্বারে রিপ্লাই দিন", threadID, messageID);
              if (choose > 12 || choose < 1) return api.sendMessage("•—»✨ নির্বাচনের তালিকা নেই", threadID, messageID); 

      }
    }
  }
}

module.exports.run = async ({ api, event, handleReply }) => {
  let fs = require("fs-extra");
  let { threadID, senderID } = event;
  return api.sendMessage({ body: "╭•┄┅════❁🌺❁════┅┄•╮\n\n   কিছু সহজ ও ছোট দোয়া-!!❤️🤲 \n\n╰•┄┅════❁🌺❁════┅┄•╯\n\n｢১｣ ঈমানের সাথে মৃত্যু বরণ করার দোয়া-!!🖤🤲 \n｢২｣ উত্তম জীবনসঙ্গী লাভের দোয়া-!!🖤🤲 \n｢৩｣ সহবাস করার দোয়া-!!🖤🤲\n｢৪｣ তারাবিহর নামাজে দোয়া-!!🖤🤲\n｢৫｣ আল্লাহর গযব থেকে মুক্ত থাকার দোয়া-!!🖤🤲\n｢৬｣ ক্ষমা ও রহমতের দোয়া-!!🖤🤲\n｢৭｣ গুনাহ্ মাফের দোয়া-!!🖤🤲\n｢৮｣ মা-বাবার জন্য দোয়া-!!🖤\n｢৯｣ জ্ঞানবৃদ্ধির দোয়া-!!🖤🤲 \n｢১০｣ সুসন্তান লাভের দোয়া-!!🖤🤲 \n｢১১｣ দ্বীনের পথে অবিচল থাকার দোয়া-!!🖤🤲 \n｢১২｣কবর জিয়ারতের নিয়ম ও দয়া-!!🖤🤲\n\n এখানে কিছু সহজ দোয়া দেওয়া আছে এই বার্তা টি নাম্বার সংযোগ করে রিপ্লাই মেসেজ দিন-!!✨🧡"
            }, threadID, (error, info) => {
        global.client.handleReply.push({
            type: "choosee",
            name: this.config.name,
            author: senderID,
            messageID: info.messageID
        })  
    })
  }