const fs = require("fs-extra");
const { join } = require("path");
const login = require("fca-unofficial");
const logger = require("./utils/log");

console.log("🤖 Starting Cyber Bot...");

// Load config
let config = {};
try {
    config = require("./config.json");
    console.log("✅ Config loaded");
} catch(e) {
    console.log("❌ Config not found!");
    process.exit(1);
}

// Load appstate
let appState = null;
try {
    appState = require("./appstate.json");
    console.log("✅ Appstate loaded");
} catch(e) {
    console.log("❌ Appstate not found!");
    process.exit(1);
}

// Login to Facebook
login({ appState: appState }, (err, api) => {
    if (err) {
        console.log("❌ Login failed:", err);
        return;
    }
    
    console.log("✅ Login successful!");
    console.log("🤖 Bot is now running...");
    
    // Save updated appstate
    fs.writeFileSync("./appstate.json", JSON.stringify(api.getAppState(), null, 2));
    
    // Listen to events
    api.listenMqtt((err, event) => {
        if (err) {
            console.log("❌ Listen error:", err);
            return;
        }
        
        // Handle messages
        if (event.type === "message" && event.body) {
            const prefix = config.PREFIX || "/";
            if (event.body.startsWith(prefix)) {
                const args = event.body.slice(prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();
                
                // Load command dynamically
                try {
                    const commandPath = `./Script/commands/${commandName}.js`;
                    if (fs.existsSync(commandPath)) {
                        const command = require(commandPath);
                        if (command.config && command.run) {
                            command.run({ api, event, args });
                            console.log(`📝 Command executed: ${commandName}`);
                        }
                    }
                } catch(e) {
                    console.log(`❌ Command error (${commandName}):`, e.message);
                }
            }
        }
    });
});