const BRAND = require("./branding");

function injectBranding(text, extra = []) {
  if (typeof text !== "string") return text;

  const defaults = {
    "{botName}": BRAND.botName,
    "{ownerName}": BRAND.ownerName,
    "{loaderName}": BRAND.loaderName,
    "{stateName}": BRAND.stateName,
    "{teamName}": BRAND.teamName,
    "{supportContact}": BRAND.supportContact,
    "{subjectName}": BRAND.subjectName,
    "{mqttTitle}": BRAND.mqttTitle,
    "{consoleTag}": BRAND.consoleTag
  };

  let out = text;

  for (const [key, value] of Object.entries(defaults)) {
    out = out.split(key).join(String(value));
  }

  extra.forEach((value, index) => {
    out = out.split(`%${index + 1}`).join(String(value));
  });

  return out;
}

module.exports = injectBranding;