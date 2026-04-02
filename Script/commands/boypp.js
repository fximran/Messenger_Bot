module.exports.config = {
  name: "boy pp",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Islamick Chat",
  description: "Random Islamick boy",
  commandCategory: "Random-IMG",
  usages: "boy pp",
  cooldowns: 2,
  dependencies: {
    "request":"",
    "fs-extra":"",
    "axios":""
  }

};

module.exports.run = async({api,event,args,Users,Threads,Currencies}) => {
const axios = global.nodemodule["axios"];
const request = global.nodemodule["request"];
const fs = global.nodemodule["fs-extra"];
    var link = [
"https://i.imgur.com/QhlqGb1.jpg",
"https://i.imgur.com/BQDcmQ7.jpg",
"https://i.imgur.com/A2bkbNb.jpg",
"https://i.imgur.com/ncg20xm.jpg",
"https://i.imgur.com/jVxUXTK.jpg",
"https://i.imgur.com/sJvWPWK.jpg",
"https://i.imgur.com/ReJPvHq.jpg",
"https://i.imgur.com/asKxDK8.jpg",
"https://i.imgur.com/FJNdTMe.jpg",
"https://i.imgur.com/dQg3YHi.jpg",
"https://i.imgur.com/RiNrjIO.jpg",
"https://i.imgur.com/olfWeCl.jpg",
"https://i.imgur.com/2Hx0Bff.jpg",
"https://i.imgur.com/xUVu8UA.jpg",
"https://i.imgur.com/s3t1Aag.jpg",
"https://i.imgur.com/koQjHE8.jpg",
"https://i.imgur.com/7cYzLYP.jpg",
"https://i.imgur.com/VHoGuJS.jpg",
"https://i.imgur.com/D0Yk3cA.jpg",
"https://i.imgur.com/gMoTt6l.jpg",
"https://i.imgur.com/raUIgUZ.jpg",
"https://i.imgur.com/wh5c2F8.jpg",
"https://i.imgur.com/5lQBE5S.jpg",
"https://i.imgur.com/ytlBQar.jpg",
"https://i.imgur.com/IBY0JJ1.jpg",
"https://i.imgur.com/SN9dO2X.jpg",
"https://i.imgur.com/CURZ2xi.jpg",
"https://i.imgur.com/pI2yFKW.jpg",
"https://i.imgur.com/xZTrxXX.jpg",
"https://i.imgur.com/hncJisT.jpg",
"https://i.imgur.com/NdB4Jpv.jpg",
"https://i.imgur.com/TFwWRzh.jpg",
"https://i.imgur.com/qUQACV6.jpg",
"https://i.imgur.com/WFSU1Fg.jpg",
"https://i.imgur.com/0C6OMog.jpg",
"https://i.imgur.com/XRNqQwD.jpg",
"https://i.imgur.com/JMAQfKP.jpg",
"https://i.imgur.com/Dm7H99b.jpg",
"https://i.imgur.com/ljSjY66.jpg",
"https://i.imgur.com/zgGE7XX.jpg",
"https://i.imgur.com/wvIRzqH.jpg",
"https://i.imgur.com/wCqcDtS.jpg",
"https://i.imgur.com/wCqcDtS.jpg",
"https://i.imgur.com/7sefpqA.jpg",
"https://i.imgur.com/gaNJLgU.jpg",
"https://i.imgur.com/K5RfFYF.jpg",
"https://i.imgur.com/BFuXq0I.jpg",
"https://i.imgur.com/K5RfFYF.jpg",
     ];
     var callback = () => api.sendMessage({body:`𝐈𝐒𝐋𝐀𝐌𝐈𝐂𝐊 𝐁𝐎𝐘 𝐅𝐁 𝐏𝐑𝐎𝐅𝐈𝐋𝐄 𝐈𝐌𝐆`,attachment: fs.createReadStream(__dirname + "/cache/1.jpg")}, event.threadID, () => fs.unlinkSync(__dirname + "/cache/1.jpg"));  
      return request(encodeURI(link[Math.floor(Math.random() * link.length)])).pipe(fs.createWriteStream(__dirname+"/cache/1.jpg")).on("close",() => callback());
   };