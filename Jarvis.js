const { spawn } = require("child_process");
const axios = require("axios");
const logger = require("./utils/log");
const express = require("express");
const path = require("path");
const fs = require("fs-extra");

// ==================== Load package.json ====================
let pkg = {};
try {
    pkg = require(path.join(__dirname, "package.json"));
} catch (err) {
    logger(`Failed to load package.json: ${err.message}`, "[ Error ]");
}
const BOT_NAME = pkg.name || "Islamick Bot";
const BOT_VERSION = pkg.version || "5.0.0";
const BOT_DESC = pkg.description || "Islamick Chat Bot";

// ==================== Express Server ====================
const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ==================== Bot Process Management ====================
global.countRestart = global.countRestart || 0;
let botProcess = null;
let botStartTime = null;

function startBot(message) {
    if (message) logger(message, "[ Starting ]");

    if (botProcess) {
        logger("Bot is already running.", "[ Info ]");
        return;
    }

    botProcess = spawn("node", ["--trace-warnings", "--async-stack-traces", "Cyber.js"], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    });

    botStartTime = Date.now();

    botProcess.on("close", (codeExit) => {
        botProcess = null;
        botStartTime = null;
        if (codeExit !== 0 && global.countRestart < 5) {
            global.countRestart += 1;
            logger(`Bot exited with code ${codeExit}. Restarting... (${global.countRestart}/5)`, "[ Restarting ]");
            startBot();
        } else {
            logger(`Bot stopped after ${global.countRestart} restarts.`, "[ Stopped ]");
        }
    });

    botProcess.on("error", (error) => {
        logger(`An error occurred: ${JSON.stringify(error)}`, "[ Error ]");
    });
}

function stopBot() {
    return new Promise((resolve) => {
        if (!botProcess) {
            resolve(false);
            return;
        }
        botProcess.once("close", () => {
            botProcess = null;
            botStartTime = null;
            resolve(true);
        });
        botProcess.kill("SIGINT");
    });
}

// ==================== Home Route ====================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==================== Admin Panel Route ====================
app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// ==================== API Routes ====================

// GET /api/status - বটের বর্তমান অবস্থা
app.get("/api/status", (req, res) => {
    const uptimeSeconds = botStartTime ? Math.floor((Date.now() - botStartTime) / 1000) : 0;
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    let uptimeString = "";
    if (days > 0) uptimeString += `${days}d `;
    if (hours > 0) uptimeString += `${hours}h `;
    if (minutes > 0) uptimeString += `${minutes}m `;
    uptimeString += `${seconds}s`;

    res.json({
        online: botProcess !== null,
        uptime: uptimeString,
        uptimeSeconds: uptimeSeconds,
        restartCount: global.countRestart || 0,
        botName: BOT_NAME,
        version: BOT_VERSION
    });
});

// POST /api/start - বট চালু করা
app.post("/api/start", (req, res) => {
    if (botProcess) {
        return res.status(400).json({ error: "Bot is already running." });
    }
    global.countRestart = 0;
    startBot("Bot started from admin panel.");
    res.json({ success: true, message: "Bot started." });
});

// POST /api/stop - বট বন্ধ করা
app.post("/api/stop", async (req, res) => {
    if (!botProcess) {
        return res.status(400).json({ error: "Bot is not running." });
    }
    const stopped = await stopBot();
    if (stopped) {
        res.json({ success: true, message: "Bot stopped." });
    } else {
        res.status(500).json({ error: "Failed to stop bot." });
    }
});

// POST /api/restart - বট রিস্টার্ট করা
app.post("/api/restart", async (req, res) => {
    const wasRunning = botProcess !== null;
    if (wasRunning) {
        await stopBot();
    }
    global.countRestart = 0;
    startBot("Bot restarted from admin panel.");
    res.json({ success: true, message: "Bot restarted." });
});

// GET /api/config - config.json পড়া
app.get("/api/config", (req, res) => {
    const configPath = path.join(__dirname, "config.json");
    try {
        if (!fs.existsSync(configPath)) {
            return res.status(404).json({ error: "config.json not found." });
        }
        const data = fs.readFileSync(configPath, "utf8");
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/config - config.json আপডেট করা
app.post("/api/config", (req, res) => {
    const configPath = path.join(__dirname, "config.json");
    try {
        const newConfig = req.body;
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf8");
        res.json({ success: true, message: "Config saved. Restart bot to apply changes." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/appstate - appstate.json পড়া
app.get("/api/appstate", (req, res) => {
    const appstatePath = path.join(__dirname, "appstate.json");
    try {
        if (!fs.existsSync(appstatePath)) {
            return res.json([]);
        }
        const data = fs.readFileSync(appstatePath, "utf8");
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/appstate - appstate.json আপডেট করা
app.post("/api/appstate", (req, res) => {
    const appstatePath = path.join(__dirname, "appstate.json");
    try {
        const newState = req.body;
        fs.writeFileSync(appstatePath, JSON.stringify(newState, null, 2), "utf8");
        res.json({ success: true, message: "AppState saved. Restart bot to apply changes." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== Start Server & Bot ====================
app.listen(port, () => {
    logger(`Server is running on port ${port}...`, "[ Starting ]");
    logger(`Admin panel: http://localhost:${port}/admin`, "[ Info ]");
}).on("error", (err) => {
    if (err.code === "EACCES") {
        logger(`Permission denied. Cannot bind to port ${port}.`, "[ Error ]");
    } else {
        logger(`Server error: ${err.message}`, "[ Error ]");
    }
});

// ==================== Log Meta Info ====================
logger(BOT_NAME, "[ NAME ]");
logger(`Version: ${BOT_VERSION}`, "[ VERSION ]");
logger(BOT_DESC, "[ DESCRIPTION ]");

// ==================== GitHub Update Check (Optional) ====================
axios.get("https://raw.githubusercontent.com/cyber-ullash/cyber-bot/main/data.json")
    .then((res) => {
        logger(res.data.name || BOT_NAME, "[ UPDATE NAME ]");
        logger(`Version: ${res.data.version || BOT_VERSION}`, "[ UPDATE VERSION ]");
        logger(res.data.description || BOT_DESC, "[ UPDATE DESCRIPTION ]");
    })
    .catch((err) => {
        logger(`Failed to fetch update info: ${err.message}`, "[ Update Error ]");
    });

// ==================== Start Bot ====================
startBot();