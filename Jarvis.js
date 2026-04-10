const { spawn, exec } = require("child_process");
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

// ==================== PM2 Process Name ====================
const PM2_PROCESS_NAME = "messenger-bot";

// ==================== Helper: Get PM2 Bot Status ====================
function getPM2Status(callback) {
    exec(`pm2 jlist`, (error, stdout, stderr) => {
        if (error) {
            callback({ online: false, error: error.message });
            return;
        }
        try {
            const list = JSON.parse(stdout);
            const bot = list.find(p => p.name === PM2_PROCESS_NAME);
            if (!bot) {
                callback({ online: false, status: 'stopped' });
                return;
            }
            const uptime = bot.pm2_env?.pm_uptime ? Date.now() - bot.pm2_env.pm_uptime : 0;
            const uptimeSeconds = Math.floor(uptime / 1000);
            const days = Math.floor(uptimeSeconds / 86400);
            const hours = Math.floor((uptimeSeconds % 86400) / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            const seconds = uptimeSeconds % 60;

            let uptimeString = "";
            if (days > 0) uptimeString += `${days}d `;
            if (hours > 0) uptimeString += `${hours}h `;
            if (minutes > 0) uptimeString += `${minutes}m `;
            uptimeString += `${seconds}s`;

            callback({
                online: bot.pm2_env?.status === 'online',
                status: bot.pm2_env?.status,
                uptime: uptimeString,
                uptimeSeconds: uptimeSeconds,
                restartCount: bot.pm2_env?.restart_time || 0,
                cpu: bot.monit?.cpu || 0,
                memory: bot.monit?.memory || 0
            });
        } catch (e) {
            callback({ online: false, error: e.message });
        }
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

// GET /api/status - বটের বর্তমান অবস্থা (PM2 থেকে)
app.get("/api/status", (req, res) => {
    getPM2Status((status) => {
        res.json({
            ...status,
            botName: BOT_NAME,
            version: BOT_VERSION
        });
    });
});

// POST /api/start - PM2 দিয়ে বট চালু করা
app.post("/api/start", (req, res) => {
    exec(`pm2 start ${PM2_PROCESS_NAME}`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json({ success: true, message: "Bot started.", output: stdout });
    });
});

// POST /api/stop - PM2 দিয়ে বট বন্ধ করা
app.post("/api/stop", (req, res) => {
    exec(`pm2 stop ${PM2_PROCESS_NAME}`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json({ success: true, message: "Bot stopped.", output: stdout });
    });
});

// POST /api/restart - PM2 দিয়ে বট রিস্টার্ট করা
app.post("/api/restart", (req, res) => {
    exec(`pm2 restart ${PM2_PROCESS_NAME}`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json({ success: true, message: "Bot restarted.", output: stdout });
    });
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

// ==================== Start Server ====================
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

// বট অটো স্টার্ট হবে না; PM2 দিয়েই ম্যানেজ হবে।
logger("Panel ready. Use PM2 to manage the bot process.", "[ Info ]");