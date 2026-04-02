const axios = require("axios");
const fs = require("fs");
const { createCanvas } = require("canvas");
 
const colorMap = {
  black: "#000000",
  white: "#FFFFFF",
  red: "#FF0000",
  green: "#00FF00",
  blue: "#0000FF",
  yellow: "#FFFF00",
  purple: "#800080",
  pink: "#FFC0CB",
  orange: "#FFA500",
  aqua: "#00FFFF",
  azure: "#F0FFFF",
  beige: "#F5F5DC",
  brown: "#A52A2A",
  chartreuse: "#7FFF00",
  coral: "#FF7F50",
  cyan: "#00FFFF",
  gold: "#FFD700",
  gray: "#808080",
  indigo: "#4B0082",
  lavender: "#E6E6FA",
  lime: "#00FF00",
  magenta: "#FF00FF",
  maroon: "#800000",
  navy: "#000080",
  olive: "#808000",
  peach: "#FFDAB9",
  peru: "#CD853F",
  plum: "#DDA0DD",
  salmon: "#FA8072",
  sienna: "#A0522D",
  silver: "#C0C0C0",
  tan: "#D2B48C",
  teal: "#008080",
  thistle: "#D8BFD8",
  turquoise: "#40E0D0",
  violet: "#EE82EE",
  wheat: "#F5DEB3",
  aquamarine: "#7FFFD4",
  bisque: "#FFE4C4",
  cadetblue: "#5F9EA0",
  chocolate: "#D2691E",
  cornflowerblue: "#6495ED",
  darkgoldenrod: "#B8860B",
  darkolivegreen: "#556B2F",
  darkorange: "#FF8C00",
  darkorchid: "#9932CC",
  darksalmon: "#E9967A",
  darkseagreen: "#8FBC8F",
  darkslategray: "#2F4F4F",
  darkturquoise: "#00CED1",
  darkviolet: "#9400D3",
  deeppink: "#FF1493",
  dodgerblue: "#1E90FF",
  firebrick: "#B22222",
  forestgreen: "#228B22",
  gainsboro: "#DCDCDC",
  ghostwhite: "#F8F8FF",
  goldenrod: "#DAA520",
  honeydew: "#F0FFF0",
  hotpink: "#FF69B4",
  indianred: "#CD5C5C",
  ivory: "#FFFFF0",
  khaki: "#F0E68C",
  lawngreen: "#7CFC00",
  lemonchiffon: "#FFFACD",
  lightblue: "#ADD8E6",
  lightcoral: "#F08080",
  lightgreen: "#90EE90",
  lightpink: "#FFB6C1",
  lightsalmon: "#FFA07A",
  lightseagreen: "#20B2AA",
  lightskyblue: "#87CEFA",
  lightslategray: "#778899",
  lightsteelblue: "#B0C4DE",
  lightyellow: "#FFFFE0",
  limegreen: "#32CD32",
  mediumaquamarine: "#66CDAA",
  mediumblue: "#0000CD",
  mediumorchid: "#BA55D3",
  mediumpurple: "#9370DB",
  mediumseagreen: "#3CB371",
  mediumslateblue: "#7B68EE",
  mediumspringgreen: "#00FA9A",
  mediumturquoise: "#48D1CC",
  mediumvioletred: "#C71585",
  midnightblue: "#191970",
  mistyrose: "#FFE4E1",
  moccasin: "#FFE4B5",
  navajowhite: "#FFDEAD",
  oldlace: "#FDF5E6",
  olivedrab: "#6B8E23",
  orangered: "#FF4500",
  orchid: "#DA70D6",
  palegoldenrod: "#EEE8AA",
  palegreen: "#98FB98",
  paleturquoise: "#AFEEEE",
  palevioletred: "#DB7093",
  papayawhip: "#FFEFD5",
  peachpuff: "#FFDAB9",
  powderblue: "#B0E0E6",
  rosybrown: "#BC8F8F",
  royalblue: "#4169E1",
  saddlebrown: "#8B4513",
  sandybrown: "#F4A460",
  seagreen: "#2E8B57",
  seashell: "#FFF5EE",
  slateblue: "#6A5ACD",
  slategray: "#708090",
  snow: "#FFFAFA",
  springgreen: "#00FF7F",
  steelblue: "#4682B4",
  tomato: "#FF6347",
  violetred: "#D02090", yellowgreen: "#9ACD32", lavenderblush: "#FFF0F5", mediumseashell: "#F5DEB3", navyslategrey: "#2F4F4F", palegolden: "#EEE8AA", paleslategray: "#778899", 
richblue: "#0C0C5E", 
richpurple: "#720B98", 
silk: "#B7B3FF", 
softpink: "#F6A6FF", 
tealblue: "#367588", 
whiteblue: "#DEF3F6", 
seashellpeach: "#FFF5EE", 
silverblue: "#5D89BA", 
sunflower: "#E4D422", 
tangerine: "#F28500", 
ultramarine: "#120A8F", 
vanilla: "#F3E5AB", 
watermelon: "#FC6C85", 
xanadu: "#738678", 
yellowrose: "#FFF000", 
zinnia: "#DC9B9B",
};
 
module.exports.config = {
  name: "color",
  version: "2.0.0",
  hasPermission: 0,
  credits: "Islamick Chat",
  description: "Convert color name to hexadecimal color code and provide color previews.",
  commandCategory: "Utility",
  usages: "/Hexcolor [color]",
  cooldowns: 5,
  usePrefix: true,
  dependencies: '',
};
 
module.exports.run = async function ({ api, event, args }) {
  if (args.length < 1) {
    return api.sendMessage("Kindly furnish a designated color denomination or its corresponding hexadecimal code. This command is employed as follows: /Hexcolor [color].", event.threadID, event.messageID);
  }
 
  const colorInput = args[0].toLowerCase();
 
  if (colorMap[colorInput]) {
    const hexCode = colorMap[colorInput];
 
    const canvas = createCanvas(50, 20);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = hexCode;
    ctx.fillRect(0, 0, 50, 20);
 
    const colorPreviewPath = `${__dirname}/cache/color_preview.png`;
    const outputStream = fs.createWriteStream(colorPreviewPath);
    canvas.createPNGStream().pipe(outputStream);
 
    outputStream.on("finish", () => {
      const response = `⌲ 𝗥𝗘𝗦𝗨𝗟𝗧\n\nHexadecimal code for ${colorInput} is ${hexCode}`;
      api.sendMessage(
        { body: response, attachment: fs.createReadStream(colorPreviewPath) },
        event.threadID,
        event.messageID
      );
    });
  } else if (colorInput.match(/^#[0-9A-Fa-f]{6}$/)) {
    const hexCode = colorInput;
 
    const canvas = createCanvas(50, 20);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = hexCode;
    ctx.fillRect(0, 0, 50, 20);
 
    const colorPreviewPath = `${__dirname}/cache/color_preview.png`;
    const outputStream = fs.createWriteStream(colorPreviewPath);
    canvas.createPNGStream().pipe(outputStream);
 
    outputStream.on("finish", () => {
      const response = `Color preview for ${hexCode}`;
      api.sendMessage(
        { body: response, attachment: fs.createReadStream(colorPreviewPath) },
        event.threadID,
        event.messageID
      );
    });
  } else {
    return api.sendMessage("Invalid color name or code.", event.threadID, event.messageID);
  }
};