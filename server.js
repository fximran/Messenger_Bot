const express = require("express");
const fs = require("fs-extra");
const { spawn, exec } = require("child_process");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

let botProcess = null;
let botStatus = "stopped";

// ==================== CHECK IF BOT IS RUNNING ====================
function checkBotStatus() {
    try {
        // Check if Jarvis.js process is running
        const { execSync } = require("child_process");
        const output = execSync('tasklist | findstr "node.exe"').toString();
        // This is simplified - you may need better detection
        botStatus = "running"; // Placeholder
    } catch(e) {
        botStatus = "stopped";
    }
    return botStatus;
}

// ==================== API ENDPOINTS ====================

// Get bot status
app.get("/api/status", (req, res) => {
    try {
        const config = require("./config.json");
        const appstateExists = fs.existsSync("./appstate.json");
        const uptime = process.uptime();
        
        // Check if bot process is running
        let isBotRunning = false;
        try {
            const { execSync } = require("child_process");
            const output = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV').toString();
            // This is simplified - you may need better detection
            isBotRunning = output.includes("node.exe");
        } catch(e) {}
        
        res.json({
            success: true,
            botName: config.BOTNAME || "Bot",
            prefix: config.PREFIX || "/",
            language: config.language || "en",
            appstateExists: appstateExists,
            uptime: uptime,
            adminCount: config.ADMINBOT ? config.ADMINBOT.length : 0,
            botRunning: isBotRunning
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Start bot
app.post("/api/bot/start", (req, res) => {
    if (botProcess && !botProcess.killed) {
        return res.json({ success: false, message: "Bot is already running!" });
    }
    
    botProcess = spawn("node", ["Jarvis.js"], {
        cwd: __dirname,
        stdio: "pipe",
        shell: true
    });
    
    botProcess.stdout.on("data", (data) => {
        console.log(`[BOT] ${data}`);
    });
    
    botProcess.stderr.on("data", (data) => {
        console.log(`[BOT ERROR] ${data}`);
    });
    
    botProcess.on("close", (code) => {
        console.log(`Bot exited with code ${code}`);
        botProcess = null;
    });
    
    res.json({ success: true, message: "Bot starting..." });
});

// Stop bot
app.post("/api/bot/stop", (req, res) => {
    if (botProcess) {
        botProcess.kill();
        botProcess = null;
        res.json({ success: true, message: "Bot stopped!" });
    } else {
        res.json({ success: false, message: "Bot is not running!" });
    }
});

// Restart bot
app.post("/api/bot/restart", async (req, res) => {
    if (botProcess) {
        botProcess.kill();
        botProcess = null;
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    botProcess = spawn("node", ["Jarvis.js"], {
        cwd: __dirname,
        stdio: "pipe",
        shell: true
    });
    
    res.json({ success: true, message: "Bot restarting..." });
});

// Get config
app.get("/api/config", (req, res) => {
    try {
        const config = require("./config.json");
        res.json({ success: true, config: config });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Update config
app.post("/api/config", (req, res) => {
    try {
        const newConfig = req.body;
        fs.writeFileSync("./config.json", JSON.stringify(newConfig, null, 4));
        res.json({ success: true, message: "Config updated! Restart bot to apply changes." });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get appstate
app.get("/api/appstate", (req, res) => {
    try {
        if (fs.existsSync("./appstate.json")) {
            const appstate = require("./appstate.json");
            res.json({ success: true, appstate: appstate });
        } else {
            res.json({ success: false, error: "appstate.json not found!" });
        }
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Update appstate
app.post("/api/appstate", (req, res) => {
    try {
        const newAppstate = req.body;
        fs.writeFileSync("./appstate.json", JSON.stringify(newAppstate, null, 2));
        res.json({ success: true, message: "Appstate updated! Restart bot to apply changes." });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get logs
app.get("/api/logs", (req, res) => {
    try {
        // You'll need to implement log capture
        res.json({ success: true, logs: "Bot logs will appear here..." });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🔧 Web Panel running at http://localhost:${PORT}`);
});