const moment = require("moment-timezone");
const fs = require("fs-extra");
const { join, resolve } = require("path");
const logger = require("./utils/log");
const login = require("@mynameisden/fca");
const axios = require("axios");

// Global objects
global.client = new Object({
    commands: new Map(),
    events: new Map(),
    cooldowns: new Map(),
    eventRegistered: new Array(),
    handleSchedule: new Array(),
    handleReaction: new Array(),
    handleReply: new Array(),
    mainPath: process.cwd(),
    configPath: new String(),
    getTime: function(type) {
        const time = moment.tz("Asia/Dhaka");
        switch(type) {
            case "seconds": return time.format("ss");
            case "minutes": return time.format("mm");
            case "hours": return time.format("HH");
            case "days": return time.format("DD");
            case "months": return time.format("MM");
            case "fullTime": return time.format("HH:mm:ss");
            case "fullDate": return time.format("DD/MM/YYYY");
            case "fullHour": return time.format("HH:mm:ss DD/MM/YYYY");
            default: return time.format("HH:mm:ss");
        }
    }
});

global.data = new Object({
    threadInfo: new Map(),
    threadData: new Map(),
    userName: new Map(),
    userBanned: new Map(),
    threadBanned: new Map(),
    commandBanned: new Map(),
    threadAllowNSFW: new Array(),
    allUserID: new Array(),
    allCurrenciesID: new Array(),
    allThreadID: new Array()
});

global.config = new Object();
global.lang = new Object();

// Load config
try {
    global.client.configPath = join(global.client.mainPath, "config.json");
    const configValue = require(global.client.configPath);
    for (const key in configValue) {
        global.config[key] = configValue[key];
    }
    logger("Loaded config.json!", "[ CONFIG ]");
} catch(e) {
    logger("Failed to load config.json!", "[ ERROR ]");
    process.exit(1);
}

// Load language
try {
    const langFile = fs.readFileSync(__dirname + "/languages/" + (global.config.language || "en") + ".lang", "utf8");
    const langLines = langFile.split("\n").filter(line => !line.startsWith("#") && line.trim() !== "");
    for (const line of langLines) {
        const [key, value] = line.split("=");
        if (key && value) {
            const [head, ...rest] = key.split(".");
            const actualKey = rest.join(".");
            if (!global.lang[head]) global.lang[head] = {};
            global.lang[head][actualKey] = value.replace(/\\n/g, "\n");
        }
    }
} catch(e) {
    logger("Failed to load language file!", "[ ERROR ]");
}

// Load appstate
let appState;
try {
    const appStatePath = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
    appState = require(appStatePath);
    logger("Loaded appstate.json!", "[ LOGIN ]");
} catch(e) {
    logger("appstate.json not found!", "[ ERROR ]");
    process.exit(1);
}

// Login and start bot
login({ appState: appState }, async (err, api) => {
    if (err) {
        logger("Login failed: " + JSON.stringify(err), "[ ERROR ]");
        return;
    }
    
    logger("Login successful!", "[ LOGIN ]");
    
    // Save updated appstate
    fs.writeFileSync(appStateFile, JSON.stringify(api.getAppState(), null, 2));
    
    global.client.api = api;
    global.config.FCAOption = global.config.FCAOption || {};
    
    // Load all commands
    const commandFiles = fs.readdirSync(__dirname + "/Script/commands").filter(file => file.endsWith(".js"));
    for (const file of commandFiles) {
        try {
            const command = require(__dirname + "/Script/commands/" + file);
            if (command.config && command.run) {
                global.client.commands.set(command.config.name, command);
                logger("Loaded command: " + command.config.name, "[ COMMAND ]");
            }
        } catch(e) {
            logger("Failed to load command: " + file + " - " + e.message, "[ ERROR ]");
        }
    }
    
    // Load all events
    const eventFiles = fs.readdirSync(__dirname + "/Script/events").filter(file => file.endsWith(".js"));
    for (const file of eventFiles) {
        try {
            const event = require(__dirname + "/Script/events/" + file);
            if (event.config && event.run) {
                global.client.events.set(event.config.name, event);
                if (event.config.eventType) {
                    global.client.eventRegistered.push(event.config.name);
                }
                logger("Loaded event: " + event.config.name, "[ EVENT ]");
            }
        } catch(e) {
            logger("Failed to load event: " + file + " - " + e.message, "[ ERROR ]");
        }
    }
    
    logger("Bot started successfully!", "[ READY ]");
    logger("Total commands: " + global.client.commands.size, "[ INFO ]");
    logger("Total events: " + global.client.events.size, "[ INFO ]");
    
    // Start listening to events
    api.listenMqtt(async (err, event) => {
        if (err) return logger("Listen error: " + err, "[ ERROR ]");
        
        // Handle events
        for (const [name, eventHandler] of global.client.events) {
            if (eventHandler.config.eventType && eventHandler.config.eventType.includes(event.logMessageType)) {
                try {
                    eventHandler.run({ api, event, Users: global.data, Threads: global.data });
                } catch(e) {
                    logger("Event error in " + name + ": " + e.message, "[ ERROR ]");
                }
            }
        }
        
        // Handle commands
        if (event.type === "message" && event.body) {
            const prefix = global.config.PREFIX || "/";
            if (event.body.startsWith(prefix)) {
                const args = event.body.slice(prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();
                const command = global.client.commands.get(commandName);
                if (command) {
                    try {
                        command.run({ api, event, args, Users: global.data, Threads: global.data, Currencies: global.data });
                    } catch(e) {
                        logger("Command error in " + commandName + ": " + e.message, "[ ERROR ]");
                    }
                }
            }
        }
    });
});